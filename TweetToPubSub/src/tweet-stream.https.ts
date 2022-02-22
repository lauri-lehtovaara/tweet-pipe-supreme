import * as http  from 'http';
import * as https from 'https';

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

    protected request: http.ClientRequest;

    protected isOpen: boolean = false;

    protected _error: Error;

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
     *
     * connects to twitter api and starts recording tweets
     */
    async connect() : Promise<void> {
	const { streamUrl, authToken } = this.config;

	const options = {
	    headers: {
		"Content-type":  "application/json",
		"Authorization": `Bearer ${authToken}`
	    }
	};

	const onData  = this.onData.bind(this);
	const onError = this.onError.bind(this);
	const onEnd   = this.onEnd.bind(this);


	return new Promise((resolve, reject) => {

	    this.request = https.get(
		streamUrl,
		options,
		response => {
		    if ( response.statusCode !== 200 ) {
			const error = new Error('Authentication failed');
			onError(error);
			return reject(error);
		    }

		    response.on('data', onData);
		    response.on('error', onError);
		    response.on('end', onEnd);

		    this.isOpen = true;

		    resolve();
		})
		.on('error', (error) => {
		    onError(error);
		    reject(error);
		});
	});
    }


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
    async close() {
	return this.request.destroy();
    }

    /**
     * onData
     *
     * translates received data to tweet
     * note: do not call directly
     */
    protected onData(buffer: Buffer) {
	if ( ! buffer ) return;

	try {
	    const jsonString = buffer.toString('utf-8');
	    if ( jsonString === '\r\n' ) {
		logger.debug('<<< TweetStream got keep alive >>>');
		return;
	    }

	    const data = JSON.parse(jsonString);
	    // logger.debug(data);

	    if ( this.queue.length >= this.config.maxQueueSize ) {
		logger.debug("Tweet stream's queue is full... dropping oldest");
		this.queue.shift();
	    }

	    const tweet = Tweet.fromTwitterJson(data);

	    // logger.debug(tweet);

	    this.queue.push(tweet);

	} catch(error) {
	    logger.debug(error);
	    this._error = error;
	}
    }

    /**
     * onEnd
     *
     * not open any more
     * note: do not call directly
     */
    protected onEnd() {
	this.isOpen = false;
    }

    /**
     * onError
     *
     * just set error
     * note: do not call directly
     */
    protected onError(error: Error) {
	logger.debug(error);
	this._error = error;
    }
}

