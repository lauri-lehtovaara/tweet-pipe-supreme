import * as http  from 'http';
import * as https from 'https';

import { Tweet } from './tweet';

/**
 * TweetStreamConfig
 */
export class TweetStreamConfig {
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
	const onError = this.onData.bind(this);
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
     */
    ready() : boolean {
	if ( this._error )
	    return false;
	
	if ( this.isOpen )
	    return true;

	return false;
    }
    
    
    /**
     * next tweet in stream if has one
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
    
    onData(buffer: Buffer) {
	if ( ! buffer ) return;

	try {
	    const jsonString = buffer.toString('utf-8');
	    if ( jsonString == '\r\n' ) {
		console.debug('<<< TweetStream got keep alive >>>');
		return;
	    }
	    
	    const data = JSON.parse(jsonString);
	    //console.debug(data);
	    
	    if ( this.queue.length >= this.config.maxQueueSize ) {
		console.debug("Tweet stream's queue is full... dropping oldest");
		this.queue.shift();
	    }

	    const tweet = Tweet.fromTwitterJson(data);

	    //console.debug(tweet);
	    
	    this.queue.push(tweet);
	    
	} catch(error) {
	    console.debug(error);
	    this._error = error;
	}
    }
    
    onEnd() {
	this.isOpen = false;
    }
    
    onError(error: Error) {
	console.debug(error);
	this._error = error;
    }
}

