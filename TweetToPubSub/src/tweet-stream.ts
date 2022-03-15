import got from 'got';

import { Tweet } from './tweet';

import { logger } from './logger';

/**
 * TweetStreamConfig
 */
export interface TweetStreamConfig {
    maxQueueSize: number;
    streamUrl: string;
    authToken: string;
}

/**
 * TweetStream
 *
 * see https://developer.twitter.com/en/docs/twitter-api/tweets/filtered-stream/quick-start
 *
 */
export class TweetStream {
    protected buffer: Buffer = Buffer.from([]);

    protected queue: Tweet[] = [];

    protected isOpen = false;

    protected _error: Error;

    protected reconnectTimeout = 100;


    /**
     * Error if has one
     */
    public get error() : Error {
        return this._error;
    }

    /**
     * Constructor
     */
    constructor(protected config: TweetStreamConfig) {}


    /**
     * Reset stream's rules
     */
    async resetRules(rules: string[]) : Promise<void> {
        const { streamUrl, authToken } = this.config;

        try {
            // get previous rules
            const getOptions = {
	        headers: {
		    "User-Agent":    "tweet-stream",
		    // "Content-Type":  "application/json",
		    "Authorization": `Bearer ${authToken}`
	        }
	    };
            const prevRules = (
                await got(
                    `${streamUrl}/rules`,
                    getOptions,
                )
                    .json()
            ) as { data: { id: string }[] };

            logger.debug('Previous rules for tweet stream', prevRules);

            // extract IDs
            const prevIDs = (
                prevRules.data
                    ? prevRules.data.map((rule) => rule.id)
                    : []
            )

            // delete  previous rules
            const deleteOptions = {
	        headers: {
		    "User-Agent":    "tweet-stream",
		    // "Content-Type":  "application/json",
		    "Authorization": `Bearer ${authToken}`
	        },
                json: {
                    delete: { ids: prevIDs },
                }
	    };
            if ( prevIDs.length > 0 )
                await got.post(
                    `${streamUrl}/rules`,
                    deleteOptions,
                )
                    .json();

            // set new rules
            const setOptions = {
	        headers: {
		    "User-Agent":    "tweet-stream",
		    // "Content-Type":  "application/json",
		    "Authorization": `Bearer ${authToken}`
	        },
                json: {
                    add: rules.map((rule) => ({ value: rule }))
                }
	    };
            const newRules = await got.post(
                `${streamUrl}/rules`,
                setOptions,
            )
                .json();

            logger.debug('New rules for tweet stream', newRules);

            return;
        } catch(error) {
            logger.error('error');
            throw error;
        }
    }

    /**
     * Connect
     */
    async connect() : Promise<any> {
        const { streamUrl, authToken } = this.config;

        const options = {
	    headers: {
                "User-Agent":    "tweet-stream",
                // "Content-Type":  "application/json",
                "Authorization": `Bearer ${authToken}`
	    },
            // timeout: { request: 3600*1000 }
        };

        const stream = await got.stream(
	    `${streamUrl}?tweet.fields=author_id,created_at`,
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
     * Ready
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
     * Next
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
    protected onData(data: any) {
        // logger.debug('onData', data);
        if ( ! data ) return;

        if ( ! ( data instanceof Buffer ) )
	    return this.onError(new Error(JSON.stringify(data)));

        this.buffer = Buffer.concat([this.buffer, data]);

        let pos = this.buffer.indexOf(Buffer.from('\r\n'));
        while( pos >= 0 ) {
            const line = this.buffer.slice(0,pos);

            if ( line.length > 0 ) {
                this.onLine(line.toString('utf-8'));
            }
            else {
                logger.debug('<<< TweetStream got keep alive >>>');
            }

            this.buffer = this.buffer.slice(pos+2);

            pos = this.buffer.indexOf(Buffer.from('\r\n'));
        }
    }

    /**
     * onLine
     *
     * translates received JSON line to tweet
     * note: do not call directly
     */
    protected onLine(jsonLine: string) {
        try {
	    logger.debug(jsonLine);

	    const json = JSON.parse(jsonLine);
	    logger.debug(json);

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
            logger.warn("TweetStream faced a connection error occurred. Reconnecting...");
	    const connect = this.connect.bind(this);
	    this.reconnectTimeout = Math.min(this.reconnectTimeout * 2, 10000);

	    setTimeout(() => {
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

