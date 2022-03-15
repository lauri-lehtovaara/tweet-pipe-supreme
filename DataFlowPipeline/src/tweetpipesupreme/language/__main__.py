"""Runs language detection pipeline component"""

import argparse
import logging
import sys
#import re
import datetime


import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions
from apache_beam.io import ReadFromText
from apache_beam.io.fileio import WriteToFiles
#from apache_beam.io.fileio import MatchFiles, ReachMatcher, ReadableFile
from apache_beam.io import ReadFromPubSub, WriteToPubSub

from apache_beam import ParDo, Map, WindowInto

from apache_beam.window import FixedWindows

from apache_beam.io.gcp.gcsfilesystem import GCSFileSystem


from tweetpipesupreme.language import DetectLanguageDoFn
from tweetpipesupreme.language.models import FastTextLid176Model



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

    # return
    return input_tweets


    
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
    output_tweets = None # pylint: disable=unused-variable
    # storage bucket
    if output_path.startswith('gs://'):
        output_tweets = (
            tweets_with_language
            | 'Write to file' >> WriteToFiles(known_args.output)
        )
    # PubSub
    elif known_args.output.startswith('ps://'):
        output_tweets = (
            tweets_with_language
            | 'String to bytes' >> Map(lambda line: line.encode('utf-8'))
            | 'Write to pubsub' >> WriteToPubSub(topic=known_args.output.replace('ps://',''))
        )
    # invalid sink
    else:
        raise RuntimeError(f"Invalid output {known_args.output}")

    return output_tweets



def LanguageStats(pipeline):
    # set timestamp for windowing from tweets timestamp
    timestamper = lambda tweet: beam.window.TimestampedValue(
        tweet,
        datetime.datetime.strptime(
            tweet['timestamp'],
            "%Y-%m-%dT%H:%M:%S.%f%z"
        )
    )

    # map tweet to language id
    def language_extractor(tweet):
        try:
            return tweet['nlp']['language']
        except KeyError:
            return '??'

    # return (language, window begin, window end, tweet count)
    class LangCountWithIntervalDoFn(beam.DoFn):
        def __init__(self):
            super().__init__()

        def process(self, element: tuple[str,int], *args, **kwargs) -> Iterator[tuple[str,int,int,int]]:
            yield (
                element[0], # language
                window.begin.to_utc_datetime(),
                window.end.to_utc_datetime(),
                element[1] # count
            )
        
    return (
        pipeline
        | 'Assign timestamps' >> Map(timestamper)
        | 'Fixed 60s windows' >> WindowInto(FixedWindows(60))
        | 'Extract language' >> Map(language_extractor)
        | 'Tweets per lang per window' >> beam.combiners.Count.PerElement()
        | 'Add window info' >> DoFn(LangCountWithIntervalDoFn())
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


        

if __name__ == '__main__':
    run()
