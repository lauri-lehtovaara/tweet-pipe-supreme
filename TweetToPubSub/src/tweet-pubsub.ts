import { PubSub } from '@google-cloud/pubsub';
import { Tweet } from './tweet';

/**
 * TweetPubSubConfig
 */
export interface TweetPubSubConfig {
    public projectId: string;
    public topic: string;
}

/**
 * TweetPubSub
 */
export class TweetPubSub {
    protected pubsub: PubSub;

    constructor(protected config: TweetPubSubConfig) {}

    /**
     * connect
     */
    connect() {
	const { projectId } = this.config;
	this.pubsub = new PubSub({ projectId });
    }

    /**
     * publish tweet
     */
    async publish(tweet: Tweet) {
	const { topic } = this.config;

	const buffer = Buffer.from(Tweet.toJson(tweet), 'utf-8');
	return await this.pubsub
	    .topic(topic)
	    .publish(buffer);
    }
}
