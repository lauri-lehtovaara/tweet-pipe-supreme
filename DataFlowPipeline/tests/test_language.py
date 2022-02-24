"""Test tweetpipesupreme.language"""
# pylint: disable=line-too-long

import os
import json
import uuid

import urllib.request

from apache_beam.io.localfilesystem import LocalFileSystem

from tweetpipesupreme.language.detect_language_dofn import DetectLanguageDoFn
from tweetpipesupreme.language.models import FastTextLid176Model


def test_detect_language_do_fn():
    """Test DetectLanguageDoFn"""

    # download and store to tmp file t
    tmp_path = f'/tmp/{str(uuid.uuid4())}'
    tmp_file = f"{tmp_path}/lid.176.ftz"

    if not os.path.exists(tmp_path):
        os.mkdir(tmp_path)

    urllib.request.urlretrieve(
        "https://dl.fbaipublicfiles.com/fasttext/supervised-models/lid.176.ftz", tmp_file)

    filesystem = LocalFileSystem({})
    model_path = tmp_file

    model = FastTextLid176Model(
        filesystem=filesystem,
        model_path=model_path
    )

    # create DoFn
    dofn = DetectLanguageDoFn(
        model=model
    )

    # download and setup model
    dofn.setup()

    # english
    tweets = dofn.process(
        '{"id":"test1","text":"This is english","user":"test","timestamp":"2022-02-18T10:26:17.028Z"}'
    )
    assert json.loads(next(tweets))['nlp']['language'] == 'en'

    # swedish
    tweets = dofn.process(
        '{ "id": "test2", "text": "Jag pratar svenska", "user": "test", "timestamp": "2022-02-18T10:26:17.028Z" }'
    )
    assert json.loads(next(tweets))['nlp']['language'] == 'sv'

    # finnish
    tweets = dofn.process(
        '{ "id": "test3", "text": "Mitäs mitäs suomea!!!", "user": "test", "timestamp": "2022-02-18T10:26:17.028Z" }'
    )
    assert json.loads(next(tweets))['nlp']['language'] == 'fi'

    # teardown
    dofn.teardown()

    # remove tmp stuff
    os.remove(tmp_file)
    os.rmdir(tmp_path)
