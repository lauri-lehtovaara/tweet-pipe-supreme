# TweetToPubSub

## Install

1. Install
    ```
    npm install
    ```

2. Get Twitter Developer API credentials
    - https://developer.twitter.com/en/products/twitter-api
    - Put them to ../credentials OR to GCP Secret Manager

3. Setup Google Cloud Platform
    1. Select or create project
    2. Activate PubSub API
    3. Create Service Account with the following Roles
        - PubSub Publisher
        - (PubSub Subscriber)
        - (PubSub Viewer)
    4. Download service account's credentials
        - Put them to ../credentials OR to GCP Secret Manager
        
## Run

With local credentials:
```
TWITTER_API_AUTH_TOKEN='AAAAAAAAAAAAAAAAAAAAAKb0ZAEAAAA...' \
   GOOGLE_APPLICATION_CREDENTIALS=../credentials/<service-account>....json \
   TWEET_PUBSUB_PROJECT_ID='tweet-pipe-supreme' \
   TWEET_TOPIC='tweet' \
   TWEET_STREAM_RULES='#ukraine OR #ukraina OR #украина' \
   npm start
```

With GCP Secret Manager:
```
TODO
```


