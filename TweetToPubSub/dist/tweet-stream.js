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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TweetStream = void 0;
const got_1 = __importDefault(require("got"));
const tweet_1 = require("./tweet");
const logger_1 = require("./logger");
;
/**
 * TweetStream
 *
 * see https://developer.twitter.com/en/docs/twitter-api/tweets/filtered-stream/quick-start
 *
 */
class TweetStream {
    /**
     * Constructor
     */
    constructor(config) {
        this.config = config;
        this.buffer = Buffer.from([]);
        this.queue = [];
        this.isOpen = false;
        this.reconnectTimeout = 100;
    }
    /**
     * Error if has one
     */
    get error() {
        return this._error;
    }
    /**
     * Reset stream's rules
     */
    resetRules(rules) {
        return __awaiter(this, void 0, void 0, function* () {
            const { streamUrl, authToken } = this.config;
            try {
                // get previous rules
                const getOptions = {
                    headers: {
                        "User-Agent": "tweet-stream",
                        // "Content-Type":  "application/json",
                        "Authorization": `Bearer ${authToken}`
                    }
                };
                const prevRules = (yield (0, got_1.default)(`${streamUrl}/rules`, getOptions)
                    .json());
                logger_1.logger.debug('Previous rules for tweet stream', prevRules);
                // extract IDs
                const prevIDs = (prevRules.data
                    ? prevRules.data.map((rule) => rule.id)
                    : []);
                // delete  previous rules
                const deleteOptions = {
                    headers: {
                        "User-Agent": "tweet-stream",
                        // "Content-Type":  "application/json",
                        "Authorization": `Bearer ${authToken}`
                    },
                    json: {
                        delete: { ids: prevIDs },
                    }
                };
                if (prevIDs.length > 0)
                    yield got_1.default.post(`${streamUrl}/rules`, deleteOptions)
                        .json();
                // set new rules
                const setOptions = {
                    headers: {
                        "User-Agent": "tweet-stream",
                        // "Content-Type":  "application/json",
                        "Authorization": `Bearer ${authToken}`
                    },
                    json: {
                        add: rules.map((rule) => ({ value: rule }))
                    }
                };
                const newRules = yield got_1.default.post(`${streamUrl}/rules`, setOptions)
                    .json();
                logger_1.logger.debug('New rules for tweet stream', newRules);
                return;
            }
            catch (error) {
                logger_1.logger.error('error');
                throw error;
            }
        });
    }
    /**
     * Connect
     */
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            const { streamUrl, authToken } = this.config;
            const options = {
                headers: {
                    "User-Agent": "tweet-stream",
                    // "Content-Type":  "application/json",
                    "Authorization": `Bearer ${authToken}`
                },
                //timeout: { request: 3600*1000 }
            };
            const stream = yield got_1.default.stream(`${streamUrl}?tweet.fields=author_id,created_at`, options);
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
     * Ready
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
     * Next
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
     * Close
     */
    // async close() {
    //    return this.stream.destory();
    // }
    /**
     * onData
     *
     * receives data to a buffer and calls
     * onLine if the buffer has a new line `\r\n`
     *
     * note: do not call directly
     */
    onData(data) {
        //logger.debug('onData', data);
        if (!data)
            return;
        if (!(data instanceof Buffer))
            return this.onError(new Error(JSON.stringify(data)));
        this.buffer = Buffer.concat([this.buffer, data]);
        let pos = this.buffer.indexOf(Buffer.from('\r\n'));
        while (pos >= 0) {
            const line = this.buffer.slice(0, pos);
            if (line.length > 0) {
                this.onLine(line.toString('utf-8'));
            }
            else {
                logger_1.logger.debug('<<< TweetStream got keep alive >>>');
            }
            this.buffer = this.buffer.slice(pos + 2);
            pos = this.buffer.indexOf(Buffer.from('\r\n'));
        }
    }
    /**
     * onLine
     *
     * translates received JSON line to tweet
     * note: do not call directly
     */
    onLine(jsonLine) {
        try {
            logger_1.logger.debug(jsonLine);
            const json = JSON.parse(jsonLine);
            logger_1.logger.debug(json);
            if (this.queue.length >= this.config.maxQueueSize) {
                logger_1.logger.debug("Tweet stream's queue is full... dropping oldest");
                this.queue.shift();
            }
            const tweet = tweet_1.Tweet.fromTwitterJson(json);
            // logger.debug(tweet);
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
            logger_1.logger.warn("TweetStream faced a connection error occurred. Reconnecting...");
            const connect = this.connect.bind(this);
            this.reconnectTimeout = Math.min(this.reconnectTimeout * 2, 10000);
            setTimeout(() => {
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