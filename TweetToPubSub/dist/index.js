"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const tweet_stream_1 = require("./tweet-stream");
const tweet_pubsub_1 = require("./tweet-pubsub");
const logger_1 = require("./logger");
const tweetStreamConfig = {
    streamUrl: 'https://api.twitter.com/2/tweets/search/stream',
    rules: (process.env.TWEET_STREAM_RULES
        ? process.env.TWEET_STREAM_RULES.split(';')
        : null),
    authToken: process.env.TWITTER_API_AUTH_TOKEN,
    maxQueueSize: (process.env.TWEET_STREAM_MAX_QUEUE_SIZE
        ? parseInt(process.env.TWEET_STREAM_MAX_QUEUE_SIZE, 10)
        : 10000)
};
const tweetPubSubConfig = {
    projectId: process.env.TWEET_PUBSUB_PROJECT_ID,
    topic: process.env.TWEET_TOPIC,
};
function sleep(ms) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => setTimeout(resolve, ms));
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        // filtered stream rules
        if (!tweetStreamConfig.rules)
            logger_1.logger.info("Environment variable TWITTER_FILTERED_STREAM_RULES not set... using existing rules");
        // tweet pubsub
        const tweetPubSub = new tweet_pubsub_1.TweetPubSub(tweetPubSubConfig);
        try {
            yield tweetPubSub.connect();
        }
        catch (error) {
            logger_1.logger.error(error);
            return;
        }
        // tweet stream from twitter api
        const tweetStream = new tweet_stream_1.TweetStream(tweetStreamConfig);
        try {
            // if rules where given, replace the existing rules
            if (tweetStreamConfig.rules) {
                yield tweetStream.resetRules(tweetStreamConfig.rules);
            }
            yield tweetStream.connect();
        }
        catch (error) {
            logger_1.logger.error(error);
            return;
        }
        while (true) {
            try {
                const tweet = tweetStream.next();
                if (tweet) {
                    logger_1.logger.debug('Tweet received', tweet);
                    yield tweetPubSub.publish(tweet);
                }
                else {
                    yield sleep(10);
                    if (tweetStream.error)
                        logger_1.logger.debug(tweetStream.error);
                }
            }
            catch (error) {
                logger_1.logger.error(error);
                break;
            }
        }
    });
}
run();
//# sourceMappingURL=index.js.map