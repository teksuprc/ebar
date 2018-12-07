/**
 * 
 */
//#region Require Dependencies
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const morgan = require('morgan');
const io = require('socket.io');
const url = require('url');
const util = require('util');
const uuid = require('uuid');
const parser = require('body-parser');
const favicon = require('serve-favicon');
const debug = require('debug');
const aws = require('aws-sdk');

const dbService = require('./db-service/db-service.js');

const { timer, Observable, Subscription, of, from, fromEvent, interval, Subject } = require('rxjs');
const { ajax } = require('rxjs/ajax');
const { map, first, mapTo, tap, switchMap, merge, mergeMap, filter, take, takeUntil,
        catchError, concat, flatMap, multicast, refCount, share } = require('rxjs/operators');
//#endregion

//#region Express Setup
const app = express();
app.use(express.static('public'));
app.use(express.static('dist/ecobar-alerts'));

//#region Logging
const logger = winston.createLogger({
    transports: [
        new winston.transports.Console({
            level: 'info',
            colorize: true,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
            ),
        }),
        new winston.transports.File({
            filename: path.join(__dirname, 'server.log'),
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
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

// make sure our logger is flushed and shutdown
process.on('exit', () => {
    logger.info('server stopped...');
    logger.end();
});

app.use(morgan('combined', {stream: logger.stream}));
//#endregion

//#region SSL Key and Certificate
const appOptions = {
    key: fs.readFileSync('certs/server.key'),
    cert: fs.readFileSync('certs/server.crt')
};
//#endregion

const server = https.createServer(appOptions, app);
server.listen(4433, () => {
    logger.info('server started and listening...');
});

//#region Routing
app.get('/app', (req, res) => {
    if(req.user) {
    }
    res.sendFile(__dirname + '/dist/ecobar-alerts/index.html');
});

app.get('/test', (req, res) => {
    res.sendFile(__dirname + '/public/test.html');
});

app.get('/user', (req, res) => {
    if(req.user) {
    }
});

app.get('/clientDashboard', (req, res) => {
    // TODO: 
    // 1) authenticate user
    // 2) get user attributes
    // 3) 
    res.sendFile(__dirname + '/client/index.html');
});

//app.post('/')
app.get('/query/:appId', (req, res) => {
    if(req.params.appId)
        from(dbService.getCurrentMessagesForAudience(req.params.appId))
            .subscribe(data => res.json(data.Items));
});

//#endregion

//#endregion

//#region Data Models
let ClientRef = function(id, nickname, appId, roles) {
    return {
        id: id,
        appId: appId,
        nickname: nickname,
        roles: roles,
        authenticated: true,
        connectionTime: new Date().toISOString()
    };
};

let MessageRef = function(type, appId, message) {
    return {
        type: type,
        appId: appId,
        datetime: new Date().toISOString(),
        text: message
    };
};
//#endregion

let connectedClients = {};

const io$ = of(io(server, {
    origins: 'localhost:*',
    autoConnect: false, 
    forceNew: false,
    //pingInterval: 20000,
    transports: ['websocket', 'polling']
}));

const connection$ = io$.pipe(
    switchMap( io => fromEvent(io, 'connection').pipe(
        map( client => ({io, client}) )
    ))
);
const disconnect$ = connection$.pipe(
    mergeMap( ({client}) => fromEvent(client, 'disconnect').pipe(
        map( () => client )
    ))
);

connection$.subscribe( ({io, client}) => {
    logger.info(`${client.id} connected`);

    let newClient = new ClientRef(client.id);
    connectedClients[client.id] = newClient;
    //io.emit('message',  new MessageRef('message', `user joined: ${client.id}`));

    //==============================================================================================================
    // CLIENT Disconnect
    //==============================================================================================================
    const disconnect$ = fromEvent(client, 'disconnect').pipe(first());
    disconnect$.subscribe(() => {
        if(connectedClients[client.id]) {

            let msg = { 
                total: Object.keys(connectedClients).length,
                client: connectedClients[client.id]
            };

            let newMessage = new MessageRef('admin-disconnect-report', 'Admin Disconnect Report', msg);
            io.emit(`admin-disconnect-report`, newMessage);

            logger.info(`${JSON.stringify(connectedClients[client.id])} disconnected`);
            delete connectedClients[client.id];
            logger.info(`total clients ${Object.keys(connectedClients).length}`);
        }
        else {
            logger.warn(`***** WARNING ***** Client does not exist ${client.id}`);
        }
    });

    //==============================================================================================================
    // CLIENT JOIN
    //==============================================================================================================
    fromEvent(client, 'join')
        .pipe(takeUntil(disconnect$))
        .subscribe(nameAppId => {
            if(!connectedClients[client.id]) {
                logger.warn(`***** WARNING ***** We should not get here! Non-existing connected client ${client.id}`);
                return;
            }

            connectedClients[client.id].nickname = nameAppId.name;
            connectedClients[client.id].appId = nameAppId.appId;
            logger.info(`joined ${JSON.stringify(connectedClients[client.id])}`);
            logger.info(`total clients ${Object.keys(connectedClients).length}`);
            
            let msg = { 
                total: Object.keys(connectedClients).length,
                client: connectedClients[client.id]
            };

            let newMessage = new MessageRef('admin-connect-report', 'Admin Connect Report', msg);
            io.emit('admin-connect-report', newMessage);

            //==============================================================================================================
            // SERVER sent messages (from database where the current date is within the range of the startDate and endDate of the message)
            //==============================================================================================================
            // the audience should come from somewhere... idk where yet though
            dbService.getCurrentMessagesForAudience(connectedClients[client.id].appId)
            .then(function(data) {
                if(data && data.Items) {
                    logger.info(`${JSON.stringify(connectedClients[client.id])} db query returned ${data.Items.length} results`);
                    data.Items.forEach(function(item) {
                        if(connectedClients[client.id] && connectedClients[client.id].appId)
                            client.emit(`${connectedClients[client.id].appId}-message`, new MessageRef('db-message', connectedClients[client.id].appId, item.message));
                    });
                }
            })
            .catch(function(err) {
                logger.error(`${client.id} error calling database: ${err.message}`);
            });            
        });

    //==============================================================================================================
    // CLIENT admin-get-clients
    // These are people trying to buck the system
    //==============================================================================================================
    fromEvent(client, 'admin-get-clients')
        .pipe(takeUntil(disconnect$))
        .subscribe( () => {
            let msg = { 
                total: Object.keys(connectedClients).length,
                clients: Object.values(connectedClients)
            };

            let newMessage = new MessageRef('admin-get-clients', 'Admin Clients Report', msg);
            io.emit('admin-get-clients', newMessage);
        });

    //==============================================================================================================
    // CLIENT admin-message
    //==============================================================================================================
    // subscribe to client-messages. client -> server
    // then re-emit the same message. server -> all clients
    // ******** NOTE ********
    // WE NEED TO AUTHENTICATE THIS USERS... SO THEY CANNOT BROADCAST MESSAGES ALL WILLY NILLY
    fromEvent(client, 'admin-message')
        .pipe(takeUntil(disconnect$))
        .subscribe(adminMessage => {
            // do stuff with message
            // in this case we resend to all clients
            // TODO:
            //  1) validate the message - parse out all code or make trusted... based on our policy
            //  2) all business logic should go here to determine if a message should be broadcasted
            //  3) save the admin message into the database so new clients can get the message

            if(connectedClients[client.id].authenticated) {
                var app = adminMessage.appId;
                var message = adminMessage.message;

                // save to the database
                let newDate = new Date();
                let dateString = newDate.toISOString();
                let endDate = new Date();
                endDate.setDate(newDate.getDate() + 1);
                let newDBMessage = {
                    "id": newDate.getTime(),
                    "audience": app,
                    "visibility": "yes",
                    "startDate": dateString,
                    "endDate": endDate.toISOString(),
                    "message": message
                };

                logger.info(`admin-message from ${connectedClients[client.id]}`);
                if(app) {
                    dbService.putMessageForAudience(newDBMessage);
                    let newMessage = new MessageRef('admin-message', app, newDBMessage.message);
                    io.emit(`${app}-message`, newMessage);
                }
                else {
                    audienceKeys.forEach(function(key) {
                        if(key) {
                            //newDBMessage.id = `${key}-${newDate.getTime()}`;
                            newDBMessage.audience = key;
                            putMessageForAudience(newDBMessage);

                            let newMessage = new MessageRef('admin-message', 'global', newDBMessage.message);
                            io.emit(`${key}-message`, newMessage);
                        }
                    });
                }
            }
        });
});
