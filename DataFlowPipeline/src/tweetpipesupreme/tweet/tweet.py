"""Tweet datatype"""

from typing import TypedDict, List, Optional


class TweetNlpData(TypedDict, total=False):
    """Tweet NLP data"""
    # FIXME: improve docs
    language:   str
    categories: List[str]
    #sentences: List[str]
    embedding:  List[List[float]]


class Tweet(TypedDict, total=True):
    """Tweet"""
    # FIXME: implement fromJSON and toJSON
    # FIXME: improve docs
    id:        str
    user:      str
    text:      str
    timestamp: str
    nlp:       Optional[TweetNlpData]
