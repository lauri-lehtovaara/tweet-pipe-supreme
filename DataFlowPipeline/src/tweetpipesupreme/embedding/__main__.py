import argparse
import logging
import re

import apache_beam as beam
from apache_beam.io import ReadFromPubSub
from apache_beam.io import WriteToPubSub
from apache_beam.options.pipeline_options import PipelineOptions
from apache_beam.options.pipeline_options import SetupOptions

from typing import Iterator

import fasttext

class SplitToSentencesDoFn(beam.DoFn):
    """Split to sentences"""
    def process(self, element):        
        return element
    

class EmbedDoFn(beam.DoFn):
    def process(self, element):
        return element

    
class DetectLanguageDoFn(beam.DoFn):
    def __init__(self, model_path: str):
        self.model = None
        
    def setup(self):
        # load model to local disk
        self.model = fasttext.load_model("{}".format(self.model_path))

    def process(self, tweet: Tweet) -> Iterator[TweetWithLang]:
        prediction = self.model.predict(tweet.text)

        langDict = {
            "language": {
                "id": prediction[0][0].replace('__label__',''),
                "confidence": prediction[1][0]
            }
        }

        # merge dict like JS { ...tweet, ...langDict }
        tweetWithLang : TweetWithLang = dict(
            tweet,
            **langDict
        )
        
        yield tweetWithLang

    
def run(argv=None, save_main_session=True):
    
