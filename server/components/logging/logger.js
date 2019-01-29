/**
 * LoggingService
 */
//const winston = require('winston');
const winston = require('winston');
const rotate = require('winston-logrotate');
const morgan = require('morgan');
const config = require('../../../config/vcap-utils');

const {createLogger, format } = winston;


let logger = null,
    morganStreamHandler = null;

let init = function() {
    logger = createLogger({
        level: config.logging.level,
        handleExceptions: config.logging.handleExceptions
    });

    logger.write = function(chunk) {
        switch(chunk.level) {
            case 'info':
                console.log(`[37m[${new Date().toISOString()}] [[0m[32m${chunk.level}[37m]: ${chunk.message}`);
                break;
            case 'error':
                console.log(`[37m[${new Date().toISOString()}] [[0m[31m${chunk.level}[37m]: ${chunk.message}`);
                break;
            case 'warning':
                console.log(`[37m[${new Date().toISOString()}] [[0m[33m${chunk.level}[37m]: ${chunk.message}`);
                break;
            default:
                console.log(`[${new Date().toISOString()}] [${chunk.level}]: ${chunk.message}`);
        }
    };

    morganStreamHandler = morgan('combined', {stream: { write: message => logger.info(message.trim()) }});
};


init();

logger.logInfo = function(message) {
    console.log(message);
    logger.info(message);
};
    
logger.logError = function(message, err) {
    if(err.message) {
        console.log(message, err.message);
        logger.error(`message - ${err.message}`);
    }
    else {
        console.log(message, err);
        logger.error(`message - ${err}`);
    }
};


module.exports = {
    logger,
    morganStreamHandler
};
