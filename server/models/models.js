
class ClientRef {
    constructor(id, nickname, appId, roles) {
        this.id = id;
        this.appId = appId;
        this.nickname = nickname;
        this.roles = roles;
        this.authenticated = true;
        this.connectionTime = new Date().toISOString();
    }
};

class MessageRef {
    constructor(type, appId, message) {
        this.type = type;
        this.appId = appId;
        this.datetime = new Date().toISOString();
        this.text = message;
    };
};

module.exports = {
    ClientRef,
    MessageRef
};