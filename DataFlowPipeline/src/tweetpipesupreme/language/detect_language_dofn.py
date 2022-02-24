"""Detect language for Apache Beam pipeline"""

import logging
import json
import re

from typing import Iterator

from typing import Iterator

import apache_beam as beam
from apache_beam.io.filesystem import FileSystem

from tweetpipesupreme.tweet import Tweet
from tweetpipesupreme.language.models import BaseModel


# Use method_name(self, *, prm1, prm2, ...) to enforce named parameters
# instead of passing a class as parameter
# class DetectLanguageDoFnConfig(TypedDict):
#    model_path: str
#    filesystem: FileSystem
#    #pipeline_options: PipelineOptions


class DetectLanguageDoFn(beam.DoFn):  # pylint: disable=abstract-method
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
    model: BaseModel

    def __init__(self, *, model: BaseModel):
        super().__init__()
        self.model = model

    def setup(self):
        """Setup (only once per worker)"""
        self.model.setup()

    def teardown(self):
        """Tear down (only once per worker)"""
        self.model.teardown()

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
        text = re.sub(r'[\r\n]',' ', tweet['text'])

        lang_id = self.model.predict(text)

        # add nlp field
        if not 'nlp' in tweet:
            tweet['nlp'] = {}

        # set tweet.nlp.language
        tweet['nlp']['language'] = lang_id

        # return tweet as JSON
        yield json.dumps(tweet)

        # Left here until I remember this by heart :)
        # merge dict like JS { ...tweet, ...langDict }
        # tweetWithNlp : Tweet = dict(
        #    tweet,
        #    **nlpDict
        # )
