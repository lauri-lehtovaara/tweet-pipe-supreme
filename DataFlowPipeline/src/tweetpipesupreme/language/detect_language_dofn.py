"""Detect language for Apache Beam pipeline"""

import logging
import json
import re

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
    """Detect language DoFn

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

    def process(self, element: Tweet, *args, **kwargs) -> Iterator[Tweet]:
        """Process Tweet

        Parameters:
            element (Tweet): Tweet

        Returns:
            Tweet: Tweet where tweet.nlp.language is set to predicted language.
        """

        # just rename
        tweet = element
        
        # remove new lines
        text = re.sub(r'[\r\n]',' ', tweet['text'])
        
        # predict language
        lang_id = self.model.predict(text)

        # add nlp field
        if not 'nlp' in tweet:
            tweet['nlp'] = {}

        # set tweet.nlp.language
        tweet['nlp']['language'] = lang_id

        # return tweet
        yield tweet

        # Not used, but left here until I remember this by heart :)
        # merge dict like JS { ...tweet, ...langDict }
        # tweetWithNlp : Tweet = dict(
        #    tweet,
        #    **nlpDict
        # )
