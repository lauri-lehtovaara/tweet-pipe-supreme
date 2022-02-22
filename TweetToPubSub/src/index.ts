import { TweetStream } from './tweet-stream';
import { TweetPubSub } from './tweet-pubsub';

import { logger } from './logger';

const tweetStreamConfig = {
    streamUrl: 'https://api.twitter.com/2/tweets/search/stream',
    authToken: process.env.TWITTER_API_AUTH_TOKEN,
    maxQueueSize: (
	process.env.TWEET_STREAM_MAX_QUEUE_SIZE
	    ? parseInt(process.env.TWEET_STREAM_MAX_QUEUE_SIZE,10)
	    : 10000
    )
};

const tweetPubSubConfig = {
    projectId: process.env.TWEET_PUBSUB_PROJECT_ID,
    topic:     process.env.TWEET_TOPIC,
}




async function sleep(ms) {
    return new Promise(
	(resolve) => setTimeout(resolve, ms)
    );
}


async function run() {
    // tweet pubsub
    const tweetPubSub = new TweetPubSub(tweetPubSubConfig);
    try {
	await tweetPubSub.connect();
    } catch(error) {
	logger.error(error);
	return;
    }

    // tweet stream from twitter api
    const tweetStream = new TweetStream(tweetStreamConfig);
    try {
	await tweetStream.connect();
    } catch(error) {
	logger.error(error);
	return;
    }

    while(true) {
	try {
	    const tweet = tweetStream.next();
	    if ( tweet ) {
		logger.debug('Tweet received', { tweet });
		await tweetPubSub.publish(tweet);
	    }
	    else {
		await sleep(10);
	    }
	} catch(error) {
	    logger.error(error);
	    break;
	}
    }
}

run();



