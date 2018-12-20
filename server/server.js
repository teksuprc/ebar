/**
 * ECOBAR_ALERTS
 */

//#region Require Dependencies
const express = require('express');
const https = require('https');
const helmet = require('helmet');
const passport = require('passport');
const passportHttp = require('passport-http');
const fs = require('fs');
const path = require('path');
const io = require('socket.io');
const url = require('url');
//const util = require('util');
//const uuid = require('uuid');
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const debug = require('debug');
const aws = require('aws-sdk');

const { timer, Observable, Subscription, of, from, fromEvent, interval, Subject } = require('rxjs');
const { ajax } = require('rxjs/ajax');
const { map, first, mapTo, tap, switchMap, merge, mergeMap, filter, take, takeUntil,
        catchError, concat, flatMap, multicast, refCount, share } = require('rxjs/operators');
//#endregion

//#region Logging Setup
const loggingConfig = {
    logLocation: './server.log',
    timeFormat: 'YYYY-MM-DD HH:mm:ss',
    level: 'info'
};
const logging = require('./components/logging')(loggingConfig);
const logger = logging.logger;
//#endregion

const allowedDomains = 'localhost';
const AppIdList = ['test1', 'test2', 'test3'];

let handleError = function(err) {
    if(err.message) logger.error(err.message);
    else logger.error(JSON.stringify(err));
};

//#region Database Setup
const dbConfig = {
    "apiVersion": "2012-08-10",
    "accessKeyid": "abcde",
    "secretAccessKey": "abcde",
    "region": "us-east-1",
    "endpoint": "http://localhost:8000"
};
const dbService = require('./components/db-service')(dbConfig);
//#endregion

//#region Express Setup
const app = express();
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/app', express.static(path.join(__dirname, '..', 'dist', 'ecobar-alerts')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(logging.morganStreamHandler);
app.use(helmet());

/*
app.use(function(req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.setHeader('Strict-Transport-Security', 'max-age=8640000; includeSubDomains');
    if (!req.secure) {
        return res.redirect(301, 'https://' + req.host  + ":" + process.env.PORT + req.url);
    }
    else {
        return next();
    }
});
*/

//#region SSL Key and Certificate
const appOptions = {
    key: fs.readFileSync(path.join(__dirname, '/../certs/server.key')),
    cert: fs.readFileSync(path.join(__dirname, '/../certs/server.crt'))
};
//#endregion

const Users = [
    {username: 'russ', password: '1234'},
    {username: 'bill', password: '1234'}
];

let findUser = function(username, callback) {
    let user = Users.filter( u => u.username == username)[0];
    if(user) 
        callback(null, user);
    else
        callback(new Error(`invalid user: ${username}`));
}

let verifyPassword = function(user, pass) {
    return user.password === pass;
}

passport.use(new passportHttp.BasicStrategy((userid, password, done) => {
    findUser(userid, (err, user) => {
        if(err) { return done(err); }
        if(!user) {return done(null, false); }
        if(!verifyPassword(user, password)) { return done(null, false); }
        return done(null, user.username);
    });
}));

const server = https.createServer(appOptions, app);
server.listen(4433, () => {
    logger.info('server started and listening...');
});

//#region Routing
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'start_page', 'index.html'));
});

app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'test.html'));
});

app.get('/app/*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'ecobar-alerts', 'index.html'));
});

app.get('/auth', passport.authenticate('basic', {session: false} ), (req, res) => {
    res.json(req.user);
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
    res.sendFile(path.join(__dirname, '..', 'views', 'client', 'index.html'));
});

app.get('/adminDashboard', (req, res) => {
    // TODO: 
    // 1) user must be authenticated
    // 2) user must have valid role (admin/manager/etc)
    // 3) get user attributes
    res.sendFile(path.join(__dirname, '..', 'views', 'admin', 'index.html'));
});

//app.post('/putItem', (req, res) => {
//});

app.get('/query/:appId', (req, res) => {
    // TODO:
    // 1) user must be authenticated
    // 2) user must have valid role (admin/manager/etc)
    if(req.params.appId && (AppIdList.indexOf(req.params.appId) >= 0))
        from(dbService.Ecobar_DBService.getCurrentMessagesForKey(req.params.appId))
            .subscribe(data => res.json(data.Items), handleError);
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
let audienceKeys = ['test1', 'test2', 'test3'];

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
    }, handleError);

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
            // TODO:
            //  1) make a hash of client and message... to filter out if the client has seen this message already
            from(dbService.Ecobar_DBService.getCurrentMessagesForKey(connectedClients[client.id].appId))
                .pipe(
                    flatMap(res => res.Items
                        .filter(item => item.message)
                        .map(item => new MessageRef('db-message', connectedClients[client.id].appId, item.message))
                    )
                )
                .subscribe(item => {
                    // **** Hash test goes here for client seen this message
                    // better yet database entry
                    client.emit(`${connectedClients[client.id].appId}-message`, item)
                },
                handleError);
/*
            Ecobar_DBService.getCurrentMessagesForKey(connectedClients[client.id].appId)
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
*/
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
        }, handleError);

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
                    dbService.Ecobar_DBService.putMessageForKey(newDBMessage);
                    let newMessage = new MessageRef('admin-message', app, newDBMessage.message);
                    io.emit(`${app}-message`, newMessage);
                }
                else {
                    audienceKeys.forEach(function(key) {
                        if(key) {
                            //newDBMessage.id = `${key}-${newDate.getTime()}`;
                            newDBMessage.audience = key;
                            dbService.Ecobar_DBService.putMessageForKey(newDBMessage);

                            let newMessage = new MessageRef('admin-message', 'global', newDBMessage.message);
                            io.emit(`${key}-message`, newMessage);
                        }
                    });
                }
            }
        }, handleError);
}, handleError);
