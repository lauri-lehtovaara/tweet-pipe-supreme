import { TweetStream } from './tweet-stream';
import { TweetPubSub } from './tweet-pubsub';

const tweetStreamConfig = {
    streamUrl: 'https://api.twitter.com/2/tweets/search/stream',
    authToken: process.env.TWITTER_API_AUTH_TOKEN,
    maxQueueSize: 5,
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
	console.error(error);
	return;
    }

    // tweet stream from twitter api
    const tweetStream = new TweetStream(tweetStreamConfig);
    try {
	await tweetStream.connect();
    } catch(error) {
	console.error(error);
	return;
    }
    
    console.debug('Tweet stream ready: ', tweetStream.ready());
    console.debug('Tweet stream error: ', tweetStream.error);
    
    while(true) {
	const tweet = tweetStream.next();
	if ( tweet ) {
	    console.debug(tweet);
	    await tweetPubSub.publish(tweet);
	}
	else {
	    await sleep(10);
	}
    }
}
run();

/*
async function run() {
    try {
	const pubsub = await initPubSub();
	const stream = await initTweetStream();
	
	while( stream.isOpen() ) {
	    const tweet = await stream.next();
	    
	    await pubsub.publish(
		'tweet',
		tweet
	    );
	}
    } catch(error) {
	console.error('Error: ' + error.message);
    }
}
*/

//run()

//const authToken = 'AAAAAAAAAAAAAAAAAAAAAKb0ZAEAAAAA1ngtv40aPOsIvFxwOJfnyFtvBvQ%3Dr4phQmf37le8G2JOgust8qm0XITZ4WaI7y3ZZpsxg1r0sKdkH2';

