# TweetPipeSupreme

## Goal

Demonstrate streaming machine-learning pipeline on Google Cloud Platform (GCP).

1) Read tweets from Twitter API (e.g. #covid)
2) Write tweets to PubSub
3) Read tweets from PubSub to Dataflow
	1) Detect language
		* FastText with `lid.176.ftz` model
	2) Perform sentiment analysis (positive/negative) using
		* Keras / Tensorflow
		* Pretrained embedding: Language-agnostic BERT for Sentence Embedding (LaBSE)	
		* Fine-tune data: Twitter dataset (TweetEval)
		* Pretrained embeddings and data from Hugging Face
	3) Calculate embeddings for semantic search
		* Keras / Tensorflow
		* Pretrained embedding: Language-agnostic BERT for Sentence Embedding (LaBSE)	
		* Pretrained embeddings from Hugging Face
		* Flask API in Cloud Run
4) Store tweets with language, embeddings, and sentiment data to FireStore
5) Store tweet embeddings to vector database = Vertex AI Matching Engine
6) Offer semantic search of tweets in a webapp
	* Serverless webapp
	* Use LaBSE embedding API deployed on Cloud Run
	* Find similar using Vertex AI
	* Return tweets from FireStore
7) Load data from FireStore to BigQuery
8) Create dashboard in DataStudio


## Status

1) TweetToPubSub
	1) Read tweets from Twitter API (e.g. #covid)
	2) Write tweets to PubSub
	* Status: working
	* Next steps: 
		* setting filters from code
		* add user metadata to tweet
	
2) DataFlowPipeline - phase 1: read from pubsub
	1) Read tweets from PubSub
	* Status: working
	
3) DataFlowPipeline - phase 2: batch language detect
	1) Read tweets (jsonp) from GCP bucket
	2) Detect language
	3) Write tweets with language to GCP bucket
	* Status: working
	
4) DataFlowPipeline - phase 3: streaming language detect
	1) Read tweets from PubSub
	2) Detect language
	3) Write tweets to PubSub
	* Status: todo
	
5) DataFlowPipeline - phase 4: sentiment detect
	* Status: todo
	* Next steps: 
		* train model in Colab (TweetEval + LaBSE)
		* save model to GCP bucket
		* add model to DataFlow / Apache Beam pipeline

6) DataFlow to FireStore
	* Status: todo

7) FireStore to BigQuery
	* Status: todo

8) BigQuery to DataStudio
	* Status: todo

9) Cloud Run API for LaBSE embeddings
	* Status: todo
	* Next steps:
		* setup a docker image that serves API for LaBSE embeddings
		* serve image with Cloud Run

10) DataFlowPipeline - phase 5: embeddings
	* Status: todo
	* Next steps:
		* add API call to DataFlow pipeline

11) DataFlow to Vertex AI Matching Engine
	* Status: todo
	
12) Webapp
	* Status: todo

