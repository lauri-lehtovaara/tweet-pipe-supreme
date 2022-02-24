import { TweetStream } from './tweet-stream';
import { TweetPubSub } from './tweet-pubsub';

import { logger } from './logger';

const tweetStreamConfig = {
    streamUrl: 'https://api.twitter.com/2/tweets/search/stream',
    rules: (
        process.env.TWEET_STREAM_RULES
            ? process.env.TWEET_STREAM_RULES.split(';')
            : null
    ),
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
    // filtered stream rules
    if ( ! tweetStreamConfig.rules )
        logger.info(
            "Environment variable TWITTER_FILTERED_STREAM_RULES not set... using existing rules"
        );
    
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
        // if rules where given, replace the existing rules
        if ( tweetStreamConfig.rules ) {
            await tweetStream.resetRules(
                tweetStreamConfig.rules
            );
        }
	await tweetStream.connect();
    } catch(error) {
	logger.error(error);
	return;
    }

    while(true) {
	try {
	    const tweet = tweetStream.next();
	    if ( tweet ) {
		logger.debug('Tweet received', tweet);
		await tweetPubSub.publish(tweet);
	    }
	    else {
		await sleep(10);
                if ( tweetStream.error )
                    logger.debug(tweetStream.error)
	    }
	} catch(error) {
	    logger.error(error);
	    break;
	}
    }
}

run();
