/**
 * Ecobar-Socket.js
 */
const io = require('socket.io');
const uuid = require('uuid');
const sanitize = require('sanitize-html');
const dbService = require('../db-service');
const logging = require('../logging');
const gx = require('../geoaxis');
const redisdb = require('../redis-db');
const config = require('../../../config/vcap-utils');
const models = require('../../models');

const { of, fromEvent } = require('rxjs');
const { map, first, switchMap, takeUntil } = require('rxjs/operators');

const logger = logging.logger;
const MessageRef = models.MessageRef;
const AdminMessage = models.SocketMessageRef;

const db = redisdb.RedisDB;
let AllAppIdKeys = ['test1', 'test2', 'test3'];

// NOTES:
//===================================================================
// YES I know, we should be using SETS for date ranges, indexes, etc...
// THIS WILL NEED TO BE REVISITED

class EcobarSocket {
    constructor(server) {
        this.server = server;
        this.io = io(server, {
            origins: config.socket.origins,
            //autoConnect: config.socket.autoConnect, 
            //forceNew: config.socket.forceNew,
            //pingInterval: config.socket.pingInterval,
            transports: config.socket.transports
        });

        this.appIds = null;
        // idk if this should be here..
        this.systemReadAppIds();

        const io$ = of(this.io);
        const connection$ = io$.pipe(
            switchMap(io => 
                fromEvent(io, 'connection')
                    .pipe(
                        map(client => ({io, client})))));

        connection$.subscribe( ({io, client}) => {
            this.onConnect(io, client);

//#region Client Events
            //==============================================================================================================
            // CLIENT Disconnect
            //==============================================================================================================
            const disconnect$ = fromEvent(client, 'disconnect').pipe(first());
            disconnect$.subscribe(
                () => this.onDisconnect(io, client),
                logger.error
            );

            //==============================================================================================================
            // CLIENT Join
            //==============================================================================================================
            fromEvent(client, 'join')
                .pipe(takeUntil(disconnect$))
                .subscribe(
                    (newClient) => this.onJoin(io, client, newClient),
                    logger.error
                );

            //==============================================================================================================
            // CLIENT admin-get-clients
            //==============================================================================================================
            fromEvent(client, 'admin-get-clients')
                .pipe(takeUntil(disconnect$))
                .subscribe(
                    () => this.onAdminGetClients(io, client),
                    logger.error
                );

            //==============================================================================================================
            // CLIENT admin-get-all-messages
            //==============================================================================================================
            fromEvent(client, 'admin-get-all-messages')
                .pipe(takeUntil(disconnect$))
                .subscribe(
                    () => this.onAdminGetAllMessages(io, client),
                    logger.error
                );

            //==============================================================================================================
            // CLIENT admin-get-pending-messages
            //==============================================================================================================
            fromEvent(client, 'admin-get-pending-messages')
                .pipe(takeUntil(disconnect$))
                .subscribe(
                    () => this.onAdminGetPendingMessages(io, client),
                    logger.error
                );

            //==============================================================================================================
            // CLIENT admin-get-approved-messages
            //==============================================================================================================
            fromEvent(client, 'admin-get-approved-messages')
                .pipe(takeUntil(disconnect$))
                .subscribe(
                    () => this.onAdminGetApprovedMessages(io, client),
                    logger.error
                );

            //==============================================================================================================
            // CLIENT admin-message-submit
            //==============================================================================================================
            fromEvent(client, 'admin-message-submission')
                .pipe(takeUntil(disconnect$))
                .subscribe(
                    (adminMessage) => this.onAdminMessageSubmission(io, client, adminMessage),
                    logger.error
                );

            //==============================================================================================================
            // CLIENT admin-approve-message
            //==============================================================================================================
            fromEvent(client, 'admin-approve-message')
                .pipe(takeUntil(disconnect$))
                .subscribe(
                    (id) => this.onAdminApproveMessage(io, client, id),
                    logger.error
                );

            //==============================================================================================================
            // CLIENT admin-delete-message
            //==============================================================================================================
            fromEvent(client, 'admin-delete-message')
                .pipe(takeUntil(disconnect$))
                .subscribe(
                    (id) => this.onAdminDeleteMessage(io, client, id),
                    logger.error
                );

            //==============================================================================================================
            // CLIENT admin-erase-message
            //==============================================================================================================
            fromEvent(client, 'admin-erase-message')
                .pipe(takeUntil(disconnect$))
                .subscribe(
                    (id) => this.onAdminEraseMessage(io, client, id),
                    logger.error
                );

            //==============================================================================================================
            // CLIENT admin-message
            //==============================================================================================================
            fromEvent(client, 'admin-message')
                .pipe(takeUntil(disconnect$))
                .subscribe(
                    (adminMessage) => this.onAdminMessage(io, client, adminMessage),
                    logger.error
                );

            //==============================================================================================================
            // CLIENT admin-get-users
            //==============================================================================================================
            fromEvent(client, 'admin-get-users')
                .pipe(takeUntil(disconnect$))
                .subscribe(
                    () => this.onAdminGetUsers(io, client),
                    logger.error
                );

            //==============================================================================================================
            // CLIENT admin-get-pending-users
            //==============================================================================================================
            fromEvent(client, 'admin-get-pending-users')
                .pipe(takeUntil(disconnect$))
                .subscribe(
                    () => this.onAdminGetPendingUsers(io, client),
                    logger.error
                );

            //==============================================================================================================
            // CLIENT admin-get-user-info
            //==============================================================================================================
            fromEvent(client, 'admin-get-userinfo')
                .pipe(takeUntil(disconnect$))
                .subscribe(
                    (id) => this.onAdminGetUserInfo(io, client, id),
                    logger.error
                );

            //==============================================================================================================
            // CLIENT admin-approve-user
            //==============================================================================================================
            fromEvent(client, 'admin-approve-user')
                .pipe(takeUntil(disconnect$))
                .subscribe(
                    (id) => this.onAdminApproveUser(io, client, id),
                    logger.error
                );

            //==============================================================================================================
            // CLIENT admin-create-user
            //==============================================================================================================
            fromEvent(client, 'admin-create-user')
                .pipe(takeUntil(disconnect$))
                .subscribe(
                    (user) => this.onAdminCreateUser(io, client, user),
                    logger.error
                );

            //==============================================================================================================
            // CLIENT admin-delete-user
            //==============================================================================================================
            fromEvent(client, 'admin-delete-user')
                .pipe(takeUntil(disconnect$))
                .subscribe(
                    (id) => this.onAdminDeleteUser(io, client, id),
                    logger.error
                );

            //==============================================================================================================
            // CLIENT admin-update-user
            //==============================================================================================================
            fromEvent(client, 'admin-update-user')
                .pipe(takeUntil(disconnect$))
                .subscribe(
                    (user) => this.onAdminUpdateUser(io, client, user),
                    logger.error
                );


//#endregion
        }, logger.error);
    }

    // read the applicaiton id's from the database
    systemReadAppIds() {
        db.readAppIds((err, appIds) => {
            if(err) logger.error(`EcobarSocket readAppIds error - ${err.message}`);
            if(appIds) this.allAppIds = appIds.join();
        });
    }

    shutdown() {
        this.io.httpServer.close();
        let keys = Object.keys(this.io.sockets.sockets);
        for(var key of keys) {
            let c = this.io.sockets.sockets[key];
            c.disconnect();   
        }

        db.deleteAllSockets((err, reply) => {
            if(err) logger.error(`shutdown deleteAllSockets error - ${err}`);
            if(reply) logger.error('shutdown deleted all sockets');
        });
    }

//#region Socket.IO Event Handlers Functions
    onConnect(io, client) {
        logger.info(`client [${client.id}] connected`);
        db.createSocketUser(client.id, false, (err, reply) => {
            if(err) logger.error(`create socket client [${client.id}] error - ${err.message}`);
            if(reply) logger.info(`created socket client [${client.id}] and pushed to database`);
        });
    }

    onDisconnect(io, client) {
        logger.info(`client [${client.id}] disconnected`);
        db.deleteSocketUser(client.id, (err, deleteReply) => {
            if(err) logger.error(`delete socket client [${client.id}] error - ${err.message}`);
            if(deleteReply) {
                logger.info(`deleted socket client [${client.id}] from database`);
                let keys = Object.keys(io.sockets.sockets);
                let msg = new AdminMessage('admin-disconnect-report', {
                    total: keys.length,
                    client: {id: client.id}
                });
                io.emit('admin-disconnect-report', msg);
            }
        });
    }

    onJoin(io, client, newClient) {
        logger.info(`client ${client.id} joined with user name ${newClient.name}`);
        if(newClient) {
            db.readSocketUser(client.id, (err, readReply) => {
                if(err) logger.error(`onJoin error for [${client.id}] - ${err}`);
                if(readReply) {
                    // updated the socket.user info
                    // I know this part is crazy...
                    if(newClient.user)
                        newClient = newClient.user;
                    newClient.socketId = client.id;
                    let auth = client.authenticatedAdmin = (newClient.authenticatedAdmin) ? true : false;
                    db.updateSocketUser(client.id, newClient, auth, (err, updateReply) => {
                        if(err) logger.error(`updateSocketUser [${client.id}] error - ${err}`);
                        if(updateReply) {
                            logger.info(`socket user updated [${client.id}, ${newClient.name}]`);
                            // NOTE: not sure about this security wise...
                            // attach the updated user to the client
                            client.user = newClient;
                            let keys = Object.keys(io.sockets.sockets);
                            let msg = new AdminMessage('admin-connect-report', {
                                total: keys.length,
                                client: {id: client.id, name: newClient.name, appIds: newClient.appIds}
                            });
                            io.emit('admin-connect-report', msg);
                        }
                    });
                }
            });

            //==============================================================================================================================
            // SERVER sent messages (from database where the current date is within the range of the startDate and endDate of the message)
            //==============================================================================================================================
            //TODO: fix this to use SETS for the date ranges...
            // using SETS we dont have to query and filter all of the message keys
            db.readMessages((err, messages) => {
                if(err) db.logError(err);
                if(messages) {
                    let now = new Date();
                    let today = now.getTime();
                    let appIds = newClient.appIds.split(',');
                    let currentMessages = messages.filter(m => ((today >= m.startDate) && (today <= m.endDate) && appIds.includes(m.appId) && (m.status === 'approved')));
                    if(currentMessages) {
                        currentMessages.forEach(m => {
                            let msg = {
                                type: m.type,
                                appId: m.appId,
                                message: m.message,
                                classification: m.classification,
                                datetime: m.createdDate
                            };
                            client.emit(`${m.appId}-message`, msg);
                        });
                    }
                }
            });
        }
    }

    onAdminGetClients(io, client) {
        if(client.authenticatedAdmin) {
            let keys = Object.keys(io.sockets.sockets);
            db.getMultipleSocketUsers(keys, (err, users) => {
                if(err) logger.error(`onAdminGetClients getAllSocketUsers error - ${err}`);
                if(users) {
                    if(client.user.roles.includes('manager')) {
                        // do nothing... we get all users
                    }
                    else{
                        // if not a manager(its an admin) filter out the users that have the same appIds as the admin
                        users = users.filter(u => admin.appIds.some(appId => u.appIds.includes(appId)));
                    }
                    let msg = new AdminMessage('admin-get-clients', {total: keys.length, users: users});
                    client.emit('admin-get-clients', msg);
                }
            });
        }
    }

    onAdminMessageSubmission(io, client, msg) {
        if(client.authenticatedAdmin) {
            let appIds = msg.appIds;
            let message = sanitize(msg.message, {
                allowedTags: [],
                allowedAttributes: {},
                allowedClasses: {},
                allowedStyles: {},
                allowedIframeHostnames: [],
                allowedSchemes: [],
                allowedSchemesByTag: {},
                allowProtocolRelative: false
            });

            //TODO: validate the message...
            // TEXT ONLY
            // TRY 'sanitize-html'
            // scrub html, js, etc...
            let startDate = new Date(msg.start);
            let endDate = new Date(msg.end);
            let creationDate = new Date();

            // THIS is for the Database
            appIds.forEach(appId => {
                // YES I know, we should be using SETS for date ranges...
                // THIS WILL NEED TO BE REVISITED
                let newMessage = new MessageRef(
                    `${appId}_${creationDate.getTime()}_${startDate.getTime()}_${endDate.getTime()}`,
                    `${appId}-admin-message`,
                    appId,
                    startDate.getTime(),
                    endDate.getTime(),
                    (msg.message) ? msg.message : '',
                    (msg.classification) ? msg.classification : "(U)",
                    "pending",
                    client.user.name,
                    endDate.getTime(),
                    (msg.title) ? msg.title : "(U)",
                    (msg.title) ? msg.title : ''
                );

                logger.info(`${appId}-admin-message [${newMessage.id}] submitted by ${client.user.name}`);
                db.createMessage(newMessage, client.user.name, (err, reply) => {
                    if(err) logger.error(`onAdminMesssageSubmission createMessage error - ${err.message}`);
                    if(reply) {
                        let msg = new AdminMessage('admin-submit-message', `message [${newMessage.id}] has been submitted by [${client.user.name}] for approval`);
                        io.emit('admin-message', msg);
                    }
                });
            });
        }
    }

    onAdminMessage(io, client, adminMessage) {
        if(client.authenticatedAdmin && client.user.roles.includes('manager')) {
            var appIds = adminMessage.appIds;
            var message = adminMessage.message;
            var title = adminMessage.title;

            // save to the database
            let startDate = new Date();
            let endDate = new Date();
            endDate.setDate(endDate.getDate() + 1);
            let creationDate = new Date();

            if(appIds.includes('global')) {
                appIds = AllAppIdKeys;
            }

            appIds.forEach(appId => {
                let id = `${appId}_${creationDate.getTime()}_${startDate.getTime()}_${endDate.getTime()}`;
                // THIS is for the Database
                let newDBMessage = new MessageRef(id, "global-admin-message", appId, startDate.getTime(), 
                    endDate.getTime(), message, "(U)", "approved", client.user.name, endDate.getTime(), '(U)', title);
                db.createMessage(newDBMessage, client.user.name, (err, reply) => {
                    if(err) logger.error(`onAdminMesssage createMessage error - ${err.message}`);
                    if(reply) logger.info(`global message [${id}] created by [${client.user.name}] added to the database`);
                });
    
                // THIS is for socket.io
                logger.info(`sending global admin-message ${id} from ${client.user.name}`);
                let msg = new AdminMessage('global-admin-message', message);
                io.emit(`${appId}-message`, msg);
            });

            // send to the admins
            logger.info(`global message sent by [${client.user.name}]`);
            let msg = new AdminMessage('global-admin-message', message, '(U)', '(U)', title);
            io.emit('admin-message', msg);
        }
    }

    onAdminGetAllMessages(io, client) {
        if(client.authenticatedAdmin && client.user.roles.includes('manager')) {
            db.readMessages((err, messages) => {
                if(err) logger.error(`onAdminGetAllMesssages readMessages error - ${err.message}`);
                if(messages) {
                    if(client.user.roles.includes('manager')) {
                        // do nothing... we get all users
                    }
                    else{
                        // if not a manager(its an admin) filter out the users that have the same appIds as the admin
                        users = users.filter(u => admin.appIds.some(appId => u.appIds.includes(appId)));
                    }
                    client.emit(`admin-get-all-messages`, messages);
                }
            });
        }
    }

    onAdminGetPendingMessages(io, client) {
        if(client.authenticatedAdmin && client.user.roles.includes('manager')) {
            db.readMessages((err, messages) => {
                if(err) logger.error(`onAdminGetPendingMesssages readMessages error - ${err.message}`);
                if(messages) {
                    let newMessages = messages.filter(m => m.status.toLowerCase() === 'pending');
                    client.emit(`admin-get-pending-messages`, newMessages);
                }
            });
        }
    }
    
    onAdminGetApprovedMessages(io, client) {
        if(client.authenticatedAdmin && client.user.roles.includes('manager')) {
            db.readMessages((err, messages) => {
                if(err) logger.error(`onAdminGetApprovedMesssages readMessages error - ${err.message}`);
                if(messages) {
                    let appIds = client.user.appIds.split(',');
                    let newMessages = messages.filter(m => m.status.toLowerCase() === 'approved');
                    client.emit(`admin-get-approved-messages`, newMessages);
                }
            });
        }
    }

    onAdminApproveMessage(io, client, id) {
        if(client.authenticatedAdmin && client.user.roles.includes('manager')) {
            db.updateMessage(id, 'approved', client.user.name, (err, reply) => {
                if(err) logger.error(`onAdminApproveMessage updateMessage error - ${err.message}`);
                if(reply) {
                    logger.info(`admin [${client.user.name}] approved message [${id}]`);
                    let msg = new AdminMessage('admin-approve-message', `message [${id}] has been approved by [${client.user.name}]`);
                    io.emit('admin-message', msg);
                }
            });
        }
    }

    onAdminDeleteMessage(io, client, id) {
        if(client.authenticatedAdmin && client.user.roles.includes('manager')) {
            db.updateMessage(id, 'disabled', client.user.name, (err, reply) => {
                if(err) logger.error(`onAdminDeleteMessage deleteMessage error - ${err.message}`);
                if(reply) {
                    logger.info(`admin [${client.user.name}] deleted message [${id}]`);
                    let msg = new AdminMessage('admin-delete-message', `message [${id}] has been deleted`);
                    io.emit('admin-message', msg);
                }
            });
        }
    }

    onAdminEraseMessage(io, client, id) {
        if(client.authenticatedAdmin && client.user.roles.includes('manager')) {
            db.deleteMessage(id, (err, reply) => {
                if(err) logger.error(`onAdminEraseMessage deleteMessage error - ${err.message}`);
                if(reply) {
                    logger.info(`admin [${client.user.name}] erased message [${id}]`);
                    let msg = new AdminMessage('admin-erase-message', `message [${id}] has been erased by [${client.user.name}]`, "(U)");
                    io.emit('admin-message', msg);
                }
            });
        }
    }

    onAdminGetUsers(io, client) {
        if(client.authenticatedAdmin && client.user.roles.includes('manager')) {
            db.getAllUsers((err, users) => {
                if(err) logger.error(`onAdminGetUsers getAllUsers error - ${err.message}`);
                if(users) client.emit('admin-get-users', users);
            });
        }
    }

    onAdminCreateUser(io, client, user) {
        if(client.authenticatedAdmin && client.user.roles.includes('manager')) {
            let auth = (user.roles.includes('admin') || user.roles.includes('manager')) ? true : false;
            let uid = uuid();
            user.id = (user.id) ? user.id : uid;
            user.uid = (user.uid) ? user.uid : uid;
            db.createUser(user.id, user, auth, client.user.name, (err, reply) => {
                if(err) logger.error(`onAdminCreateUser createUser [${user.id}] error - ${err.message}`);
                if(reply) {
                    logger.info(`onAdminCreateuser new user created [${user.id}] by admin ${client.user.name}`);
                    let msg = new AdminMessage('admin-user-created', `new user ${user.id} created by ${client.user.name}`);
                    io.emit('admin-message', msg);
                }
            });
        }
    }

    onAdminGetPendingUsers(io, client) {
        if(client.authenticatedAdmin && client.user.roles.includes('manager')) {
            db.getAllUsers((err, users) => {
                if(err) logger.error(`onAdminGetUsers getAllUsers error - ${err.message}`);
                if(users) {
                    // filter out users with existing admin/manager roles
                    users = users.filter(u => (!u.roles.includes('admin') && !u.roles.includes('manager')));
                    client.emit('admin-get-users', users);
                }
            });
        }
    }

    onAdminGetUserInfo(io, client, id) {
        if(client.authenticatedAdmin && client.user.roles.includes('manager')) {
            db.readUser(id, (err, user) => {
                if(err) logger.error(`onAdminGetUserInfo getUser error - ${err.message}`);
                if(user) client.emit('admin-get-userinfo', user)
            });
        }
    }

    onAdminApproveUser(io, client, id) {
        if(client.authenticatedAdmin && client.user.roles.includes('manager')) {
            db.updateUser(id, {roles: 'admin'}, client.user.name, (err, reply) => {
                if(err) logger.error(`onAdminApproveUser updateUser error - ${err.message}`);
                if(reply) {
                    logger.info(`user ${id} was approved to be an admin by ${client.user.name}`);
                    let msg = new AdminMessage('admin-user-approved', `user ${user.id} was approved for admin access by ${client.user.name}`);
                    io.emit('admin-message', msg);
                }
            });
        }
    }

    onAdminUpdateUser(io, client, user) {
        if(client.authenticatedAdmin && client.user.roles.includes('manager')) {
            db.updateUser(id, user, client.user.name, (err, reply) => {
                if(err) logger.error(`onAdminUpdateUser updateUser error - ${err.message}`);
                if(reply) {
                    logger.info(`user:${user.id} was updated by ${client.user.name}`);
                    let msg = new AdminMessage('admin-user-updated', `user ${user.id} updated by ${client.user.name}`);
                    io.emit('admin-message', msg);
                }
            });
        }
    }

    onAdminDeleteUser(io, client, id) {
        if(client.authenticatedAdmin && client.user.roles.includes('manager')) {
            db.deleteUser(id, (err, reply) => {
                if(err) logger.error(`onAdminDeleteUser deleteUser [${id}] error - ${err.message}`);
                if(reply) {
                    logger.info(`onAdminDeleteUser user [${id}] deleted by admin ${client.user.name}`);
                    let msg = new AdminMessage('admin-user-deleted', `user ${id} deleted by ${client.user.name}`, 'U');
                    io.emit('admin-message', msg);
                }
            });
        }
    }

    onAdminAddAppId(io, client, appId) {
        if(client.authenticatedAdmin && client.user.roles.includes('manager')) {
            db.addAppId(appId, (err, reply) => {
                if(err) logger.error(`EcobarSocket addAppId error - ${err.message}`);
                if(reply) {
                    logger.info(`admin [${client.user.name}] added appId [${appId}] sucessfully`);
                    let msg = new AdminMessage('admin-add-appid-message', `admin [${client.user.name}] added appId [${appId}]`);
                    io.emit('admin-message', newMessage);
                }
            });
        }
    }

    onAdminReadAppIds(io, client) {
        if(client.authenticatedAdmin && client.user.roles.includes('manager')) {
            db.readAppId(appId, (err, appIds) => {
                if(err) logger.error(`EcobarSocket readAppId [${appId}] error - ${err.message}`);
                if(appIds) {
                    let msg = new AdminMessage('admin-read-appIds', appIds);
                    io.emit('admin-message', msg);
                }
            });
        }
    }

    onAdminDeleteAppId(io, client, appId) {
        if(client.authenticatedAdmin && client.user.roles.includes('manager')) {
            db.deleteAppId(appId, (err, reply) => {
                if(err) logger.error(`EcobarSocket deleteAppId [${appId}] error - ${err.message}`);
                if(reply) {
                    logger.info(`admin [${client.user.name}] deleted appId [${appId}] sucessfully`);
                    let msg = new AdminMessage('admin-message', `admin [${client.user.name}] deleted appId [${appId}]`);
                    io.emit('admin-message', msg);
                }
            });
        }
    }
//#endregion
};

module.exports = EcobarSocket;
