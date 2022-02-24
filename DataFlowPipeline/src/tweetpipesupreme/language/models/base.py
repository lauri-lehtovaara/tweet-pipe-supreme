"""Base model"""

from abc import ABC, abstractmethod


class BaseModel(ABC):
    """Base model"""

    @abstractmethod
    def setup(self) -> None:
        """Setup

        This method must be called before the first call to
        `predict` and it should be called only once.
        """
        pass # pylint: disable=unnecessary-pass

    @abstractmethod
    def teardown(self) -> None:
        """Tear down

        This method must be called after the last call to
        `predict` and it should be called only once.
        """
        pass # pylint: disable=unnecessary-pass

    @abstractmethod
    def predict(self, text: str) -> str: # pylint: disable=unused-argument
        """Predicts language for the given text

        Parameters:
            text (str): Text for prediction

        Returns:
            str: Predicted ID of the language (e.g., en, sv, fi)
        """
        pass # pylint: disable=unused-argument,unnecessary-pass
