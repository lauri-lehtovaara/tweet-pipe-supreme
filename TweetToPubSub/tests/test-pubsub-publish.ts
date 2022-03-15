//import * as assert from "assert";

import * as chai from 'chai'    
import chaiAsPromised from 'chai-as-promised'

import { Tweet } from '@tweetpipesupreme/tweet';
import { TweetPubSub } from '@tweetpipesupreme/tweet-pubsub';

chai.use(chaiAsPromised)


function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('PubSub', function () {
    const tweetPubSubConfig = {
        projectId: process.env.TWEET_PUBSUB_PROJECT_ID,
        topic:     process.env.TWEET_TOPIC,
    }
    
    it('Publish 100 random tweets within 50s', async function() {
        this.timeout(1.5*50*1000);
        
        const texts = [
            "This is english",
            "Jag pratar svenska",
            "Mitäs mitäs suomea!!!"
        ];
        try {
            const tweetPubSub = new TweetPubSub(tweetPubSubConfig);
            tweetPubSub.connect();
            
            for(let i = 0; i < 100; ++i) {
                const tweet : Tweet = {
                    id:        `testing-${Date.now()}-${i}`,
                    author:    `test-${i % 10}`,
                    timestamp: new Date(Date.now()-(30*1000)).toISOString(),
                    text:      texts[i % 3],
                };
                tweetPubSub.publish(tweet)
                    .then(() =>
                        console.debug(`Published message #${i}`, tweet));
                await delay(50 * 1000 / 100);
                
            }
        } catch(error) {
            console.error(error);
            throw error;
        }
        return true;
    });
})
