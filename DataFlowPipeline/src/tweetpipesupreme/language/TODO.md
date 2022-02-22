# TODO

1) Implement PubSub subscriber
2) Implement PubSub publisher
3) Add logic to use bucket/pubsub based on input and output params
	* input=gs://<bucket>/<path> => read file
	* input=pubsub://<topic> => stream from pubsub
	* output=gs://<bucket>/<path> => write to file
	* output=pubsub://<topic> => stream to pubsub
