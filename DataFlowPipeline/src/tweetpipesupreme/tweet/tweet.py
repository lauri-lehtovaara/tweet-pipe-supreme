from typing import TypedDict, List, Optional

class TweetNlpData(TypedDict, total=False):
    language: str
    sentences: List[str]
    embedding: List[List[float]]


class Tweet(TypedDict, total=True):
    id:        str
    user:      str
    text:      str
    timestamp: str
    nlp:       Optional[TweetNlpData]
    
