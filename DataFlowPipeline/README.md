# DataFlowEmbedding

See 
* https://beam.apache.org/get-started/quickstart-py/
* https://cloud.google.com/pubsub/docs/pubsub-dataflow
* https://github.com/apache/beam/blob/master/sdks/python/apache_beam/examples/complete/juliaset/

## Setup GCP project

1. Enable APIs:
   - Dataflow API
   - Compute Engine API
   - Cloud Logging API
   - Cloud Storage
   - Google Cloud Storage JSON API
   - BigQuery API
   - Cloud Pub/Sub API
   - Cloud Datastore API
   - Cloud Resource Manager API

2. Create service account with the following roles:
    - Service Account Token Creator
    - Service Account User
    - Dataflow Worker
    - Storage:
        - Storage Object Viewer (for reading models)
        - Storage Object Admin, if jobs write to Cloud Storage
    - PubSub:
        - Pub/Sub Publisher
        - Pub/Sub Subscriber
        - Pub/Sub Viewer
        - (Pub/Sub Admin, if using temporary subscriptions for topics instead of permanent subscriptions)

3. Create bucket `tweet-pipe-supreme`


## Install with docker (Mac OSX with M1 = arm64)

1. Run Apache Beam docker interactively
   ```
   docker run --rm -it  \
       -v ${PWD}:/app  \
       -v ${PWD}/../credentials:/credentials  \
       --entrypoint /bin/bash  \
       apache/beam_python3.8_sdk
   ```
2. Install GCP support
   ```
   pip install apache-beam[gcp]
   ```
3. Run local test inside Apache Beam container with DirectRunner
   ```
   python -m apache_beam.examples.wordcount --output output.txt
   ```
4. Run test inside Apache Beam container with DataflowRunner
   ```
   GOOGLE_APPLICATION_CREDENTIALS=/credentials/<credentials>.json \
   python -m apache_beam.examples.wordcount \
       --input gs://dataflow-samples/shakespeare/kinglear.txt \
       --output gs://tweet-pipe-supreme/dataflow-test/counts \
       --runner DataflowRunner \
       --project tweet-pipe-supreme \
       --region europe-north1 \
       --temp_location gs://tweet-pipe-supreme/tmp/ \
       --service_account_email tweet-pipe-supreme@tweet-pipe-supreme.iam.gserviceaccount.com
	   --max_num_workers N  \
	   --worker_machine_type e2-standard-2 
	   
   ```
   
5. Install your own pipeline as editable python package
   ```
   pip install -e /app -r /app/requirements.txt

   ```
   
6. Start our own batch pipeline
   ```
   GOOGLE_APPLICATION_CREDENTIALS=/credentials/<credentials>.json \
   python -m tweetpipesupreme.language \
       --setup_file /app/setup.py \
       --input gs://tweet-pipe-supreme/dataflow-test/tweets.jsonl \
       --model_path gs://tweet-pipe-supreme/dataflow-test/lid.176.ftz \
       --output gs://tweet-pipe-supreme/dataflow-test/tweets-with-lang \
       --runner DataflowRunner \
       --project tweet-pipe-supreme \
       --region europe-west1 \
       --temp_location gs://tweet-pipe-supreme/tmp/ \
       --service_account_email tweet-pipe-supreme@tweet-pipe-supreme.iam.gserviceaccount.com
	   --max_num_workers N # optional \
	   --worker_machine_type e2-standard-2 # optional \
   ```

7. Start our own streaming pipeline (tweet => tweet-with-lang)
   ```
   GOOGLE_APPLICATION_CREDENTIALS=/credentials/<credentials>.json \
   python -m tweetpipesupreme.language \
       --setup_file /app/setup.py \
       --input ps://projects/tweet-pipe-supreme/subscriptions/tweet-sub \
       --model_path gs://tweet-pipe-supreme/dataflow-test/lid.176.ftz \
       --output ps://projects/tweet-pipe-supreme/topics/tweet-with-lang \
       --runner DataflowRunner \
       --project tweet-pipe-supreme \
       --region europe-north1 \
       --temp_location gs://tweet-pipe-supreme/tmp/ \
       --service_account_email tweet-pipe-supreme@tweet-pipe-supreme.iam.gserviceaccount.com
	   --max_num_workers N # optional \
	   --worker_machine_type e2-standard-2 # optional \
       --streaming
   ```


## Python development

Install package as editable so that you can `import` it and 
its (sub)modules as it would be installed normally:
`pip install -e <path> -r requirements.txt`

### Linting

Show linting errors
`pylint src/tweetpipesupreme`

Autofix
`autopep8 --in-place src/tweetpipesupreme`

### Testing

`pytest`


## Debugging DataFlow

If getting mysterious behaviour like DataFlow repeatedly 
recreating PubSub (temporary) subscription, it is probably 
because of insufficient permissions for the service account used.
DataFlowRunner does not (necessarily) report these errors, 
and therefore, it is better to try with DirectRunner to 
debug permissions.


## DOES NOT WORK: Install Mac M1... why?!? 
From https://issues.apache.org/jira/browse/BEAM-11703?focusedCommentId=17373531
but with double quotes: `pip install "apache-beam[gcp]"`
```
brew install miniforge
...

conda create -n <namespace> python=3.8
conda activate <namespace>
...

# We need pyarrow and grpcio from conda repository, PyPi packages are not compiling
conda install pyarrow==3.0.0
conda install grpcio==1.36.1

# Cython is incompatible
pip uninstall cython

# Finally!
pip install "apache-beam[gcp]"
```
