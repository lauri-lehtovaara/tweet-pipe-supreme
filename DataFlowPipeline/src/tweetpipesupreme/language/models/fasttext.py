"""FastText model for language detection"""

import os
import logging
from tempfile import NamedTemporaryFile

import fasttext

from apache_beam.io.filesystem import FileSystem

from .base import BaseModel


class FastTextLid176Model(BaseModel):  # pylint: disable=too-few-public-methods,no-self-use

    """FastText model LID-176 for language detection

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

    def __init__(self, *, filesystem, model_path):
        self.filesystem = filesystem
        self.model_path = model_path
        self.model = None

    def setup(self) -> None:
        """Setup

        This method must be called before the first call to
        ``predict`` and it should be called only once.
        """

        # open model
        logging.debug('<<< FastTextLid176Model.setup: opening model... >>>')
        model_file = self.filesystem.open(self.model_path)

        # download to /tmp because fastText.load_model doesn't work
        # with remote resources (GCP bucket)

        logging.debug(
            '<<< FastTextLid176Model.setup: downloading model from %s to a temp file... >>>',
            self.model_path,
        )

        with NamedTemporaryFile(delete=True) as tmp_file:
            tmp_file.write(model_file.read())

            # load model
            logging.debug(
                '<<< FastTextLid176Model.setup: loading model from a temp file %s >>>', tmp_file.name)

            self.model = fasttext.load_model(tmp_file.name)


            # test model
            text = 'this is a test'
            
            logging.debug('<<< FastTextLid176Model.setup: testing model >>>')
            logging.debug('<<< FastTextLid176Model.setup: text = "%s" >>>', text)
            prediction = self.model.predict(text)

            logging.debug(
                '<<< FastTextLid176ModelTest.setup language:   %s >>>',
                prediction[0][0]
            )
            logging.debug(
                '<<< FastTextLid176ModelTest.setup confidence: %.4f >>>',
                prediction[1][0]
            )

        logging.debug('<<< FastTextLid176Model.setup: success >>>')

    def teardown(self) -> None:
        """Tear down

        This method must be called after the last call to
        ``predict`` and it should be called only once.
        """
        self.model = None
        logging.debug('<<< FastTextLid176Model.teardown: success >>>')

    def predict(self, text) -> str:
        """Predicts language for the given text

        Parameters:
            text (str): Text for prediction

        Returns:
            str: Predicted ID of the language (e.g., en, sv, fi)
        """

        if self.model is None:
            raise RuntimeError(
                "Error in FastTextLid176Model: method ``setup`` " +
                "must be called before calling ``predict``"
            )

        prediction = self.model.predict(text)

        return prediction[0][0].replace('__label__', '')
