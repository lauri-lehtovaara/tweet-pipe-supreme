import * as needle  from 'needle';

import { Tweet } from './tweet';

import { logger } from './logger';

/**
 * TweetStreamConfig
 */
export interface TweetStreamConfig {
    public maxQueueSize: number;
    public streamUrl: string;
    public authToken: string;
};

/**
 * TweetStream
 *
 * see https://developer.twitter.com/en/docs/twitter-api/tweets/filtered-stream/quick-start
 *
 */
export class TweetStream {
    protected queue: Tweet[] = [];

    protected isOpen: boolean = false;

    protected _error: Error;

    protected reconnectTimeout: number = 100;


    /**
     * error if has one
     */
    public get error() : Error {
	return this._error;
    }

    /**
     * constructor
     */
    constructor(protected config: TweetStreamConfig) {}


    /**
     * connect
     */
    async connect() : Promise<needle.ReadableStream> {
	const { streamUrl, authToken } = this.config;

	const options = {
	    headers: {
		"User-Agent":    "tweet-stream",
		// "Content-Type":  "application/json",
		"Authorization": `Bearer ${authToken}`
	    }
	};

	const stream = needle.get(
	    streamUrl,
	    options
	);

	const onResponse = this.onResponse.bind(this);
	const onData  = this.onData.bind(this);
	const onError = this.onError.bind(this);
	const onEnd   = this.onEnd.bind(this);

	stream.on('data', onData);
	stream.on('err', onError);
	stream.on('done', onEnd);
	stream.on('response', onResponse);

	return stream;
    }

    /**
     * TODO: set rules
     *
     * get old rules, delte old rules, set new rules
     */
    // async setRules(rules) {
    //
    // }

    /**
     * ready
     *
     * returns true if stream is ready and recording tweets
     */
    ready() : boolean {
	if ( this._error )
	    return false;

	if ( this.isOpen )
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
    next() : Tweet | undefined {
	const tweet = this.queue.shift();

	if ( tweet )
	    return tweet;

	if ( this._error )
	    throw this._error;
    }

    /**
     * close
     */
    // async close() {
    //    return this.stream.destory();
    // }

    /**
     * onData
     *
     * translates received data to tweet
     * note: do not call directly
     */
    protected onData(data: any) {
	if ( ! data ) return;

	if ( ! ( data instanceof Buffer ) )
	    return this.onError(Error(JSON.stringify(data)));

	try {
	    const jsonString = data.toString('utf-8');
	    // logger.debug(jsonString);

	    if ( jsonString === '\r\n' ) {
		logger.debug('<<< TweetStream got keep alive >>>');
		return;
	    }

	    const json = JSON.parse(jsonString);
	    // logger.debug(data);

	    if ( this.queue.length >= this.config.maxQueueSize ) {
		logger.debug("Tweet stream's queue is full... dropping oldest");
		this.queue.shift();
	    }

	    const tweet = Tweet.fromTwitterJson(json);

	    // logger.debug(tweet);

	    this.queue.push(tweet);

	} catch(error) {
	    logger.debug(error);
	    this._error = error;
	}
    }


    /**
     * onOpen
     *
     * stream is open... but might have error
     * note: do not call directly
     */
    protected onResponse() {
	logger.debug('TweetStream opened');
	this.isOpen = true;
    }

    /**
     * onEnd
     *
     * not open any more
     * note: do not call directly
     */
    protected onEnd() {
	logger.debug('TweetStream closed');
	this.isOpen = false;
    }

    /**
     * onError
     *
     * just set error
     * note: do not call directly
     */
    protected onError(error: NodeJS.ErrnoException) {
	// on connection reset, try to reconnect
	if (  error.code === 'ECONNRESET' ) {
	    const connect = this.connect.bind(this);
	    this.reconnectTimeout = Math.min(this.reconnectTimeout * 2, 10000);

	    setTimeout(() => {
                logger.warn("TweetStream faced a connection error occurred. Reconnecting...");
		connect();
            }, this.reconnectTimeout);
	}

	// otherwise, just set the error
	else {
	    logger.debug(error);
	    this._error = error;
	}
    }
}

