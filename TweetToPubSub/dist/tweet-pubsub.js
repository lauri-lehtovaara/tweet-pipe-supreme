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
exports.TweetPubSub = void 0;
const pubsub_1 = require("@google-cloud/pubsub");
const tweet_1 = require("./tweet");
/**
 * TweetPubSub
 */
class TweetPubSub {
    constructor(config) {
        this.config = config;
    }
    /**
     * connect
     */
    connect() {
        const { projectId } = this.config;
        this.pubsub = new pubsub_1.PubSub({ projectId });
    }
    /**
     * publish tweet
     */
    publish(tweet) {
        return __awaiter(this, void 0, void 0, function* () {
            const { topic } = this.config;
            const buffer = Buffer.from(tweet_1.Tweet.toJson(tweet), 'utf-8');
            return yield this.pubsub
                .topic(topic)
                .publish(buffer);
        });
    }
}
exports.TweetPubSub = TweetPubSub;
//# sourceMappingURL=tweet-pubsub.js.map