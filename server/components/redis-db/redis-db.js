/**
 * Redis-DB.js
 */
const redis = require('redis');
const uuid = require('uuid');
const config = require('../../../config/vcap-utils');
const logging = require('../logging');
const logger = logging.logger;


/*
NOTE: All CALLBACK functions take (err, reply).
    err - Not null if an error occurred.
    reply - The result of the operation.
*/

class RedisDataBase {
    constructor() {
        this.client = null;
    }

    init() {
        try {
            this.client = redis.createClient({
                port: config.db_redis.port, 
                host: config.db_redis.host,
                no_ready_check: config.db_redis.no_ready_check
            });

            this.client.on('connect', () => {
                logger.logInfo('redis db client connected')
            });
            this.client.on('error', (err) => {
                logger.logError('redis db onerror', err);
            });
        }
        catch(err) {
            logger.logError('redis db init', err);
        }
    }

//#region Config
    addAppId(appId, callback) {
        this.client.sadd('config:appIds', appId, callback);
    }

    readAppIds(callback) {
        this.client.smembers('config:appIds', callback);
    }

    deleteAppId(appId, callback) {
        this.client.srem('config:appIds', appId, callback);
    }
//#endregion

//#region Sockets
    createSocketUser(id, authenticated, callback) {
        let expire = new Date();
        expire.setDate(expire.getDate() + 1);
        let obj = {
            authenticatedAdmin: authenticated, 
            creationDate: new Date().getTime(),
            EXPIREAT: expire.getTime()
        };
        this.client.hmset(`socket:${id}`, obj, callback);

        let multi = this.client.multi();
        multi.hmset(`socket:${id}`, obj);
        multi.persist(`user:${id}`);
        multi.exec(callback);
    }

    readSocketUser(id, callback) {
        this.client.hgetall(`socket:${id}`, callback);
    }

    updateSocketUser(id, user, authenticated, callback) {
        if(user == undefined) callback({message:"redisdb updateSocketUser - user object is not valid"}, null);
        let obj = {
            "authenticatedAdmin": authenticated,
            "socketId": id,
            "sessionId": (user.sessionId) ? user.sessionid : '',
            "name": (user.name) ? user.name : '',
            "uid": (user.uid) ? user.uid : '',
            "email": (user.email) ? user.email : '',
            "phone": (user.phone) ? user.phone : '',
            "department": (user.department) ? user.department : '',
            "dn": (user.dn) ? user.dn : '',
            "appIds": (user.appIds) ? user.appIds : '',
            "roles": (user.roles ? user.roles : '')
        };
        this.client.hmset(`socket:${id}`, obj, callback);
    }

    deleteSocketUser(id, callback) {
        this.client.del(`socket:${id}`, callback);
    }

    deleteAllSockets(callback) {
        this.client.keys('socket:*', (err, keys) => {
            if(err) callback(err, null);
            if(keys) {
                let multi = this.client.multi();
                keys.forEach(k => {
                    multi.del(k);
                });
                multi.exec(callback);
            }
        });
    }

    getTotalSocketUsers(callback) {
        this.client.keys('socket:*', callback);
    }

    getMultipleSocketUsers(keys, callback) {
        let multi = this.client.multi();
        keys.forEach(k => {
            multi.hgetall(`socket:${k}`);
        });
        multi.exec(callback);
    }

    getAllSocketUsers(callback) {
        this.client.keys('socket:*', (err, keys) => {
            if(err) callback(err, null);
            if(keys) {
                let multi = this.client.multi();
                keys.forEach(k => {
                    multi.hgetall(k);
                });
                multi.exec(callback);
            }
        });
    }
//#endregion

//#region Users
    createUser(id, user, authenticated, admin, callback) {
        if(user == undefined) callback({message:"redisdb createUser - user object is not valid"}, null);
        let today = new Date();
        let obj = {
            "id": id,
            "authenticatedAdmin": authenticated,
            "sessionId": (user.sessionId) ? user.sessionid : '',
            "name": (user.name) ? user.name : '',
            "uid": (user.uid) ? user.uid : '',
            "email": (user.email) ? user.email : '',
            "phone": (user.phone) ? user.phone : '',
            "department": (user.department) ? user.department : '',
            "dn": (user.dn) ? user.dn : '',
            "appIds": (user.appIds) ? user.appIds : '',
            "roles": (user.roles ? user.roles : ''),
            "createdBy": admin,
            "creationDate": today.getTime()
        };
        this.client.hmset(`user:${id}`, obj, callback);
    }

    readUser(id, callback) {
        this.client.hgetall(`user:${id}`, callback);
    }

    updateUser(id, user, admin, callback) {
        if(user == undefined) callback({message:"redisdb updateUser - user object is not valid"}, null);
        let today = new Date();
        let obj = {
            "updatedBy": admin,
            "updateDate": today.getTime()
        };

        if(user.name) obj["name"] = user.name;
        if(user.name) obj["uid"] = user.uid;
        if(user.name) obj["email"] = user.email;
        if(user.name) obj["phone"] = user.phone;
        if(user.name) obj["department"] = user.department;
        if(user.name) obj["dn"] = user.dn;
        if(user.name) obj["appIds"] = user.appIds;
        if(user.name) obj["roles"] = user.roles;

        this.client.hmset(`user:${id}`, obj, callback);
    }

    deleteUser(id, callback) {
        this.client.del(`user:${id}`, callback);
    }

    getTotalUsers(callback) {
        this.client.keys('user:*', (err, keys) => {
            if(err) callback(err, null);
            if(keys) callback(null, keys.length);
        });
    }

    getAllUsers(callback) {
        this.client.keys('user:*', (err, keys) => {
            if(err) callback(err, null);
            if(keys) {
                let i = 0, users = [];
                let multi = this.client.multi();
                keys.forEach(k => {
                    multi.hgetall(k);
                });
                multi.exec((err, users) => {
                    if(err) callback(err, null);
                    if(users) callback(null, users);
                });
            }
        });
    }
//#endregion

//#region Messages
    createMessage(msg, admin, callback) {
        var obj = {
            "id": msg.id,
            "type": msg.type,
            "appId": msg.appId,
            "startDate": msg.startDate,
            "endDate": msg.endDate,
            "message": msg.message,
            "classification": msg.classification,
            "status": msg.status,
            "createdBy": admin,
            "createdDate": msg.createdDate,
            "EXPIREAT": msg.expireDate  
        };
        this.client.hmset(`message:${msg.id}`, obj, callback);
    }

    readMessages(callback) {
        this.client.keys('message:*', (err, keys) => {
            if(err) callback(err, null);
            if(keys) {
                let multi = this.client.multi();
                keys.forEach(k => {
                    multi.hgetall(k);
                });
                multi.exec((err, messages) => {
                    if(err) callback(err, null);
                    if(messages) callback(null, messages);
                });
            }
        });
    }

    updateMessage(id, status, admin, callback) {
        let date = new Date();
        let obj = {
            "status": status,
            "approvedBy": admin,
            "approvedDate": date.getTime()
        };
        this.client.hmset(`message:${id}`, obj, callback);
    }

    deleteMessage(id, callback) {
        this.client.del(`message:${id}`, callback);
    }
//#endregion
};

let RedisDB = new RedisDataBase();
RedisDB.init();


module.exports = {
    RedisDB
};
