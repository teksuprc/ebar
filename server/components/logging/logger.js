/**
 * LoggingService
 */
const path = require('path');
const winston = require('winston');
const morgan = require('morgan');
const fs = require('fs');


let defaultConfig = {
    logLocation: './server.log',
    timeFormat: 'YYYY-MM-dd HH:mm:ss',
    level: 'info'
};

let logger = null,
    morganStreamHandler = null;

let init = function(config) {
    logger = winston.createLogger({
        transports: [
            new winston.transports.Console({
                level: config.level,
                colorize: true,
                format: winston.format.combine(
                    winston.format.timestamp({ format: config.timeFormat }),
                    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
                )
            }),
            new winston.transports.File({
                filename: config.logLocation,
                level: config.level,
                format: winston.format.combine(
                    winston.format.timestamp({ format: config.timeFormat }),
                    winston.format.printf(info => `[${info.timestamp}] [${info.level}]: ${info.message}`)
                )
            })
        ]
    });
    
    logger.stream = {
        write: function(message, encoding) {
            logger.info(message);
        }
    };
    let accessLogStream = fs.createWriteStream(path.join(__dirname, '..', 'server.log'), { flags: 'a' })
    morganStreamHandler = morgan('combined', {stream: accessLogStream}); //logger.stream});
};

module.exports = function(config) {
    init(config || defaultConfig);    
    return {
        logger: logger,
        morganStreamHandler: morganStreamHandler
    };
}
