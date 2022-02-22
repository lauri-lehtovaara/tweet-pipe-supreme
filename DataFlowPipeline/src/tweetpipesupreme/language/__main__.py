"""Runs language detection pipeline component"""

import argparse
import logging
import sys

import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions
from apache_beam.io import WriteToText
from apache_beam.io import ReadFromText
from apache_beam import ParDo #, Map

from apache_beam.io.gcp.gcsfilesystem import GCSFileSystem

from tweetpipesupreme.language import DetectLanguageDoFn

def run(argv=None):
    """Runs language detection pipeline component"""

    parser = argparse.ArgumentParser()

    parser.add_argument(
        '--input',
        dest='input',
        default=None,
        help='Path to read tweets from (as JSONL)'
    )

    parser.add_argument(
        '--model_path',
        dest='model_path',
        # 'gs://tweet-pipe-supreme/dataflow-test/models/lid.176.ftz',
        default=None,
        help='Path to model'
    )

    parser.add_argument(
        '--output',
        dest='output',
        default=None,
        help='Path to write tweets to (as JSONL)'
    )

    known_args, pipeline_args = parser.parse_known_args(argv)

    pipeline_opts = PipelineOptions(pipeline_args)

    filesystem = GCSFileSystem(pipeline_opts)
    if not filesystem.exists(known_args.model_path):
        logging.error("File %s does not exist", known_args.model_path)
        sys.exit(13)

        detect_language_do_fn = DetectLanguageDoFn(
            filesystem = filesystem,
            model_path = known_args.model_path
        )

        with beam.Pipeline(options=pipeline_opts) as pipeline:
            # pylint: disable=unused-variable
            tweets = (
                pipeline
                | 'Read' >> ReadFromText(known_args.input)
                | 'Predict language' >> ParDo(detect_language_do_fn) # ParDo => Map ?
                | 'Write' >> WriteToText(known_args.output)
            )


if __name__ == '__main__':
    run()
