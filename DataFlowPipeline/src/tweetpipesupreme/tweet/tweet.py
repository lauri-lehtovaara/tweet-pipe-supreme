"""Tweet datatype"""

from typing import TypedDict, List, Optional


class TweetNlpData(TypedDict, total=False):
    """Tweet NLP data

    All attributes are optional

    Attributes
    ----------
    language : str, optional
        ID of the predicted language
    categories : List[str], optional
        List of IDs of predicted categories
    embedding : List[List[float]], optional
        Embedding vector for the tweet
    """
    language:   str
    categories: List[str]
    embedding:  List[float]


class Tweet(TypedDict, total=True):
    """Tweet

    All attributes are optional

    Attributes
    ----------
    id : str
        ID of the tweet
    user : str
        ID of the sender
    text : str
        Tweet's text
    timestamp : str
        ISO timestamp
    nlp : TweetNlpData, optional
        Optional NLP predictions
    """
    # FIXME: implement fromJSON and toJSON with validation
    id:        str
    user:      str
    text:      str
    timestamp: str
    nlp:       Optional[TweetNlpData]
