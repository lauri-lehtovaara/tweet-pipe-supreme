"""Dummy model that always return English as language"""

from .base import BaseModel


class DummyModel(BaseModel):  # pylint: disable=too-few-public-methods,no-self-use
    """Dummy model that always return English as language"""

    def setup(self) -> None:
        """Setup

        This method must be called before the first call to
        ``predict`` and it should be called only once.
        """
        pass # pylint: disable=unnecessary-pass

    def teardown(self) -> None:
        """Tear down

        This method must be called after the last call to
        ``predict`` and it should be called only once.
        """
        pass # pylint: disable=unnecessary-pass

    def predict(self, text: str) -> str:  # pylint: disable=unused-argument
        """Returns always 'en' as language ID

        Parameters:
            text (str): Text for prediction

        Returns:
            str: Predicted ID of the language (e.g., en, sv, fi)
        """
        return 'en'
