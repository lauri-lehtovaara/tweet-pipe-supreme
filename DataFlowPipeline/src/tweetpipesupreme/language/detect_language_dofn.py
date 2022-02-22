"""Detect language for Apache Beam pipeline"""

import os
import logging
import json

from typing import Iterator

import apache_beam as beam
from apache_beam.io.filesystem import FileSystem

import fasttext

from tweetpipesupreme.tweet import Tweet
#from tweetpipesupreme.language.models import DummyModel

# Use method_name(self, *, prm1, prm2, ...) to enforce named parameters
# instead of passing a class as parameter
# class DetectLanguageDoFnConfig(TypedDict):
#    model_path: str
#    filesystem: FileSystem
#    #pipeline_options: PipelineOptions


class DetectLanguageDoFn(beam.DoFn): # pylint: disable=abstract-method
    """Detect language apache_beam.DoFn

    Parameters
    ----------
    filesystem: apache_beam.io.filesystem.FileSystem
        File system to use

    model_path: str
        Model's path in the above file system
    """

    filesystem: FileSystem
    model_path: str
    model: fasttext.FastText

    def __init__(self, *, filesystem: FileSystem, model_path: str):
        super().__init__()
        self.filesystem = filesystem
        self.model_path = model_path
        self.model = None


    def setup(self):
        """Setup (only once per worker)"""

        # open model
        logging.debug('<<< DetectLanguageDoFn.setup: opening model... >>>')
        model_file = self.filesystem.open(self.model_path)

        # download to /tmp because fastText.load_model doesn't work
        # with remote resources (GCP bucket)
        logging.debug(
            '<<< DetectLanguageDoFn.setup: downloading model to /tmp... >>>')
        tmp_path = f"/tmp/{self.model_path.split('/')[-1]}"
        with open(tmp_path, "wb") as tmp_file:
            tmp_file.write(model_file.read())

        # load model
        logging.debug('<<< DetectLanguageDoFn.setup: model stored to /tmp >>>')
        self.model = fasttext.load_model(tmp_path)

        # remove temporary file after loading
        os.remove(tmp_path)

        # test model
        logging.debug('<<< DetectLanguageDoFn.setup: model  >>>')
        prediction = self.model.predict('this is a test')

        logging.debug('Test language:   %s', prediction[0][0])
        logging.debug('Test confidence: %.4f', prediction[1][0])


    def teardown(self):
        """Tear down (only once per worker)"""
        pass


    def process(self, element: str, *args, **kwargs) -> Iterator[str]:
        """Process a string containing a Tweet as JSON

        Parameters:
            element (str): A string containing a Tweet as JSON

        Returns:
            str: A string containing a Tweet in JSON where
                 tweet.nlp.language is set to predicted language.
        """

        # parse JSON
        tweet: Tweet = json.loads(element)

        # predict language
        prediction = self.model.predict(tweet['text'])

        # add nlp field
        if not 'nlp' in tweet:
            tweet['nlp'] = {}

        # set tweet.nlp.language
        tweet['nlp']['language'] = prediction[0][0].replace('__label__', '')

        # return tweet as JSON
        yield json.dumps(tweet)

        # Left here until I remember this by heart :)
        # merge dict like JS { ...tweet, ...langDict }
        # tweetWithNlp : Tweet = dict(
        #    tweet,
        #    **nlpDict
        # )
