"""Dummy model that always return English as language"""

class DummyModel: # pylint: disable=too-few-public-methods,no-self-use
    """Dummy model that always return English as language"""
    def __init__(self):
        pass

    def predict(self, element: str, *args, **kwargs): # pylint: disable=unused-argument
        """Process a string containing a Tweet as JSON

        Parameters:
            element (str): A string containing a Tweet as JSON

        Returns:
            str: A string containing a Tweet in JSON where
                 tweet.nlp.language is set to predicted language.
        """
        return [['__label__en'], [1.0]]
