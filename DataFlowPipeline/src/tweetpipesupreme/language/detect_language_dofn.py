import logging
import json

import apache_beam as beam
from apache_beam.io.filesystem import FileSystem
from apache_beam.options.pipeline_options import PipelineOptions

from typing import Iterator, TypedDict

from tweetpipesupreme.tweet import Tweet
from tweetpipesupreme.language.models import DummyModel

import fasttext


class DetectLanguageDoFnConfig(TypedDict):
    model_path: str
    filesystem: FileSystem
    #pipeline_options: PipelineOptions
    

class DetectLanguageDoFn(beam.DoFn):
    #model: DummyModel
    filesystem: FileSystem
    model_path: str
    
    def __init__(self, filesystem: FileSystem, model_path: str):
        self.filesystem = filesystem
        self.model_path = model_path
        pass
        
    def setup(self):
        #filesystem = FileSystem(self.config.pipeline_options)
        model_file = self.filesystem.open(self.model_path)

        logging.info('>>>>>>>>>>>>>>>>>>>> Setup')
        #logging.info('>>> {}'.format(model_file.read()))

        tmp_path = '/tmp/{}'.format(self.model_path.split('/')[-1])
        
        with open(tmp_path,"wb") as tmp_file:
            tmp_file.write(model_file.read())
            
        self.model = fasttext.load_model(tmp_path)
        
        prediction = self.model.predict('this is a test')
        logging.info('Test language:   {}'.format(prediction[0][0]))
        logging.info('Test confidence: {}'.format(prediction[1][0]))
        
        # self.model = DummyModel()
        

    def process(self, tweetStr: str) -> Iterator[str]:
        tweet: Tweet = json.loads(tweetStr)
        
        prediction = self.model.predict(tweet['text'])

        if not 'nlp' in tweet:
            tweet['nlp'] = {}
        
        tweet['nlp']['language'] = prediction[0][0].replace('__label__','')
        
        # merge dict like JS { ...tweet, ...langDict }
        #tweetWithNlp : Tweet = dict(
        #    tweet,
        #    **nlpDict
        #)
        
        yield json.dumps(tweet)

