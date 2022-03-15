"""Runs language detection pipeline component"""

import argparse
import logging
import sys
import json
#import re
from datetime import datetime
import time

from typing import Iterator, Tuple

import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions
from apache_beam.io import ReadFromText
from apache_beam.io.fileio import WriteToFiles
#from apache_beam.io.fileio import MatchFiles, ReachMatcher, ReadableFile
from apache_beam.io import ReadFromPubSub, WriteToPubSub

from apache_beam import ParDo, Map, WindowInto

from apache_beam.transforms.window import FixedWindows, TimestampedValue
from apache_beam.transforms.trigger import AfterWatermark, AfterProcessingTime, AccumulationMode, AfterCount
from apache_beam.utils.timestamp import Duration

from apache_beam.transforms.combiners import Count

from apache_beam.io.gcp.gcsfilesystem import GCSFileSystem


from tweetpipesupreme.language import DetectLanguageDoFn
from tweetpipesupreme.language.models import FastTextLid176Model
from tweetpipesupreme.tweet import Tweet



def ReadInputTweets(pipeline, input_path):
    """Read input tweets to pipeline

    Parameters
    ----------
    pipeline: apache_beam.Pipeline
        Pipeline

    input_path: str
        Input path
        If `gs://<path>`, `input` is expected to be _a path to a file_ in a GCP storage bucket.
        If `ps://projects/<project>/subscriptions/<subscription>`, `input` is expected to be a PubSub subscription.`    
    """
    
    # input
    input_tweets = None
    # storage bucket
    if input_path.startswith('gs://'):
        input_tweets = (
            pipeline
            | 'Read lines from file' >> ReadFromText(input_path)
            # Another option would be to read lines from wild card path:
            #| MatchFiles(known_args.input)
            #| ReadMatches()
            #| beam.Map(lambda x: x.read())
        )
        # PubSub
    elif input_path.startswith('ps://'):
        input_tweets = (
            pipeline
            | 'Read from pubsub' >> ReadFromPubSub(subscription=input_path.replace('ps://',''))
            #| 'Read from pubsub' >> ReadFromPubSub(topic=known_args.input.replace('ps://',''))
            | 'Bytes to string' >> Map(lambda line: line.decode('utf-8'))
        )
        # invalid source
    else:
        raise RuntimeError(f"Invalid input {input_path}")


    # Parse JSON, validate (TODO) and return
    return (
        input_tweets
        | 'JSON to Tweet object' >> Map(lambda line: json.loads(line))
    )


    
def WriteOutputTweets(pipeline, output_path):
    """Write output tweets from pipeline

    Parameters
    ----------
    pipeline: apache_beam.Pipeline
        Pipeline

    output_path: str
        Output path
        If `gs://<path>`, `output` is expected to be _a path_ in a GCP storage bucket.
        If `ps://projects/<project>/topics/<topic>`, `output` is expected to be a PubSub topic.`    
    """
    # output
    output_tweets = ( # pylint: disable=unused-variable
        pipeline
        | 'Tweet object to JSON' >> Map(lambda tweet: json.dumps(tweet))
    )
    
    # storage bucket
    if output_path.startswith('gs://'):
        return (
            output_tweets # tweets_with_language
            | 'Write to file' >> WriteToFiles(output_path)
        )
    # PubSub
    elif output_path.startswith('ps://'):
        return (
            output_tweets # tweets_with_language
            | 'String to bytes' >> Map(lambda line: line.encode('utf-8'))
            | 'Write to pubsub' >> WriteToPubSub(topic=output_path.replace('ps://',''))
        )
    # invalid sink
    else:
        raise RuntimeError(f"Invalid output {output_path}")

    return output_tweets



# return (language, window start, window end, tweet count)
class LangCountWithIntervalDoFn(beam.DoFn):
    def __init__(self):
        super().__init__()
        
    def process(self, element: Tuple[str,int], window=beam.DoFn.WindowParam) -> Iterator[Tuple[str,int,int,int]]:
        row = (
            element[0], # language
            window.start.to_utc_datetime().astimezone().isoformat(),
            window.end.to_utc_datetime().astimezone().isoformat(),
            element[1] # count
        )
        logging.debug(row)
        yield row

# set timestamp for windowing from tweets timestamp
def timestamper(tweet):
    return TimestampedValue(
        tweet,
        time.mktime(
            datetime.strptime(
                tweet['timestamp'],
                "%Y-%m-%dT%H:%M:%S.%f%z"
            )
            .timetuple()
        )
    )

# map tweet to language id
def language_extractor(tweet):
    try:
        return tweet['nlp']['language']
    except KeyError:
        return '??'

def print_and_return(elem):
    logging.info(elem)
    return elem
    
def LanguageStats(pipeline):
    return (
        pipeline
        | 'Assign timestamps' >> Map(timestamper)
        | 'Fixed 10s windows' >> WindowInto(
            FixedWindows(Duration(seconds=10)),
            # allowed_lateness is not what we want
            # allowed_lateness=Duration(seconds=60)
            trigger=AfterWatermark(
                early=None, # dont fire before watermark
                late=AfterProcessingTime(
                    Duration(seconds=10) # fire every 10secs
                )
            ),
            # accept new data 60s after watermark
            allowed_lateness=Duration(seconds=60),
            # send accumulated result instead of only new data
            accumulation_mode=AccumulationMode.ACCUMULATING
        )
        | 'Extract language' >> Map(language_extractor)
        | 'Print and return' >> Map(print_and_return)
        | 'Tweets per lang per window' >> Count.PerElement()
        | 'Add window info' >> ParDo(LangCountWithIntervalDoFn())
    )



def run(argv=None):
    """Runs language detection pipeline component"""

    # args
    parser = argparse.ArgumentParser()

    # input
    parser.add_argument(
        '--input',
        dest='input',
        default=None,
        help=(
            'Path to read tweets from (as JSONL).\n' +
            'If `gs://<path>`, `input` is expected to be _a path to a file_ in a GCP storage bucket.\n' +
            #'If `ps://projects/<project>/topics/<topic>`, `input` is expected to be a PubSub topic.`'
            'If `ps://projects/<project>/subscriptions/<subscription>`, `input` is expected to be a PubSub subscription.`'
        )
    )

    # output
    parser.add_argument(
        '--output',
        dest='output',
        default=None,
        help=(
            'Path to write tweets to (as JSONL).\n' +
            'If `gs://<path>`, `output` is expected to be _a path_ in a GCP storage bucket.\n' +
            'If `ps://projects/<project>/topics/<topic>`, `output` is expected to be a PubSub topic.`'
        )
    )

    # model_path
    parser.add_argument(
        '--fasttext_lid176_model_path',
        dest='fasttext_lid176_model_path',
        # 'gs://tweet-pipe-supreme/dataflow-test/models/lid.176.ftz',
        default=None,
        help='Path to FastTest LID-176 model'
    )

    # parse args
    known_args, pipeline_args = parser.parse_known_args(argv)

    # pipeline opts
    pipeline_opts = PipelineOptions(pipeline_args)

    # file systems for reading model
    filesystem = GCSFileSystem(pipeline_opts)
    # if does not exists
    if not filesystem.exists(known_args.fasttext_lid176_model_path):
        raise RuntimeError(f"File {known_args.fasttext_lid176_model_path} does not exist")
        

    # language detection model
    model = FastTextLid176Model(
        filesystem = filesystem,
        model_path = known_args.fasttext_lid176_model_path
    )

    # detect language DoFn
    detect_language_do_fn = DetectLanguageDoFn(
        model = model
    )

    # build pipeline
    with beam.Pipeline(options=pipeline_opts) as pipeline:

        # input
        input_tweets = ReadInputTweets(
            pipeline,
            known_args.input
        )

        # language detection
        tweets_with_language = (
            input_tweets
            | 'Predict language' >> ParDo(detect_language_do_fn)
        )

        # output
        output_tweets = WriteOutputTweets(
            tweets_with_language,
            known_args.output
        )

        # stats
        stats = LanguageStats(
            tweets_with_language
        )

        tmp = (stats | 'Print stats' >> Map(print))

        

if __name__ == '__main__':
    #logging.basicConfig(level=logging.DEBUG)
    logging.basicConfig(level=logging.INFO)
    run()
