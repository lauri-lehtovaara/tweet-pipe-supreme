import argparse
import logging
import sys

import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions
from apache_beam.io import WriteToText
from apache_beam.io import ReadFromText
from apache_beam import ParDo, Map

from apache_beam.io.gcp.gcsfilesystem import GCSFileSystem

from tweetpipesupreme.language import DetectLanguageDoFn


def run(argv=None):  # pylint: disable=missing-docstring
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
      logging.error("File {} does not exist".format(known_args.model_path))
      sys.exit(13)

  detectLanguageDoFn = DetectLanguageDoFn(
      filesystem,
      known_args.model_path
  )
        
  with beam.Pipeline(options=pipeline_opts) as pipeline:
      tweets = (
          pipeline
          | 'Read' >> ReadFromText(known_args.input)
          | 'Predict language' >> ParDo(detectLanguageDoFn)
          | 'Write' >> WriteToText(known_args.output)
      )
  

if __name__ == '__main__':
    run()
