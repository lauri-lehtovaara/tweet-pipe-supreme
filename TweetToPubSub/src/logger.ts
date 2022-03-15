import * as winston from 'winston';

const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

const logger: winston.Logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.timestamp()
    ),
    transports: [
        new winston.transports.Console({ level: logLevel }),
    ],
});

// let logger = console;

export { logger };
