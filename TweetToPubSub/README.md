# TweeToPubSub

## Install

1) Install
	```
	npm install
	```
	
2) Get Twitter Developer API credentials
	- https://developer.twitter.com/en/products/twitter-api
	- Put them to ../credentials OR to GCP Secret Manager

3) Setup Google Cloud Platform
	a) Select or create project
	b) Activate PubSub API
	c) Create Service Account with the following Roles
		- PubSub Publisher
		- (PubSub Viewer)
		- (PubSub Viewer)
	d) Download service account's credentials
		- Put them to ../credentials OR to GCP Secret Manager
		
## Run

With local credentials:
```
TWITTER_API_AUTH_TOKEN='AAAAAAAAAAAAAAAAAAAAAKb0ZAEAAAA...' \
   GOOGLE_APPLICATION_CREDENTIALS=../credentials/<service-account>....json \
   TWEET_PUBSUB_PROJECT_ID='<GCP project ID' \
   TWEET_TOPIC='tweet' \
   npm start
```

With GCP Secret Manager:
```
TODO
```


