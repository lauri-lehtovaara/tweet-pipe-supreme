"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.TweetStream = exports.TweetStreamConfig = void 0;
const needle = __importStar(require("needle"));
const tweet_1 = require("./tweet");
const logger_1 = require("./logger");
/**
 * TweetStreamConfig
 */
class TweetStreamConfig {
}
exports.TweetStreamConfig = TweetStreamConfig;
;
/**
 * TweetStream
 *
 * see https://developer.twitter.com/en/docs/twitter-api/tweets/filtered-stream/quick-start
 *
 */
class TweetStream {
    /**
     * constructor
     */
    constructor(config) {
        this.config = config;
        this.queue = [];
        this.isOpen = false;
        this.reconnectTimeout = 100;
    }
    /**
     * error if has one
     */
    get error() {
        return this._error;
    }
    /**
     * connect
     */
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            const { streamUrl, authToken } = this.config;
            const options = {
                headers: {
                    "User-Agent": "tweet-stream",
                    //"Content-Type":  "application/json",
                    "Authorization": `Bearer ${authToken}`
                }
            };
            const stream = needle.get(streamUrl, options);
            const onResponse = this.onResponse.bind(this);
            const onData = this.onData.bind(this);
            const onError = this.onError.bind(this);
            const onEnd = this.onEnd.bind(this);
            stream.on('data', onData);
            stream.on('err', onError);
            stream.on('done', onEnd);
            stream.on('response', onResponse);
            return stream;
        });
    }
    /**
     * TODO: set rules
     *
     * get old rules, delte old rules, set new rules
     */
    //async setRules(rules) {
    //	
    //}
    /**
     * ready
     *
     * returns true if stream is ready and recording tweets
     */
    ready() {
        if (this._error)
            return false;
        if (this.isOpen)
            return true;
        return false;
    }
    /**
     * next
     *
     * returns next tweet if has one
     * throws an error if there is an error AND we have consumed all tweets
     * return undefined if no error and we have consumed all tweets
     */
    next() {
        const tweet = this.queue.shift();
        if (tweet)
            return tweet;
        if (this._error)
            throw this._error;
    }
    /**
     * close
     */
    //async close() {
    //    return this.stream.destory();
    //}
    /**
     * onData
     *
     * translates received data to tweet
     * note: do not call directly
     */
    onData(data) {
        if (!data)
            return;
        if (!(data instanceof Buffer))
            return this.onError(Error(JSON.stringify(data)));
        try {
            const jsonString = data.toString('utf-8');
            //logger.debug(jsonString);
            if (jsonString == '\r\n') {
                logger_1.logger.debug('<<< TweetStream got keep alive >>>');
                return;
            }
            const json = JSON.parse(jsonString);
            //logger.debug(data);
            if (this.queue.length >= this.config.maxQueueSize) {
                logger_1.logger.debug("Tweet stream's queue is full... dropping oldest");
                this.queue.shift();
            }
            const tweet = tweet_1.Tweet.fromTwitterJson(json);
            //logger.debug(tweet);
            this.queue.push(tweet);
        }
        catch (error) {
            logger_1.logger.debug(error);
            this._error = error;
        }
    }
    /**
     * onOpen
     *
     * stream is open... but might have error
     * note: do not call directly
     */
    onResponse() {
        logger_1.logger.debug('TweetStream opened');
        this.isOpen = true;
    }
    /**
     * onEnd
     *
     * not open any more
     * note: do not call directly
     */
    onEnd() {
        logger_1.logger.debug('TweetStream closed');
        this.isOpen = false;
    }
    /**
     * onError
     *
     * just set error
     * note: do not call directly
     */
    onError(error) {
        // on connection reset, try to reconnect
        if (error.code === 'ECONNRESET') {
            const connect = this.connect.bind(this);
            this.reconnectTimeout = Math.min(this.reconnectTimeout * 2, 10000);
            setTimeout(() => {
                logger_1.logger.warn("TweetStream faced a connection error occurred. Reconnecting...");
                connect();
            }, this.reconnectTimeout);
        }
        // otherwise, just set the error
        else {
            logger_1.logger.debug(error);
            this._error = error;
        }
    }
}
exports.TweetStream = TweetStream;
//# sourceMappingURL=tweet-stream.js.map