


class ClientRef {
    constructor(socketId, sessionId, name, uid, email, phone, department, dn, appIds, roles, authenticatedAdmin, createdBy) {
        this.socketId = socketId;
        this.sessionId = sessionId;
        this.name = name;
        this.uid = uid;
        this.email = email;
        this.phone = phone;
        this.department = department;
        this.dn = dn;
        this.appIds = appIds;
        this.roles = roles;
        this.authenticatedAdmin = authenticatedAdmin;
        this.createdBy = createdBy;
        this.creationDate = new Date().getTime();
    }
};

class MessageRef {
    constructor(id, type, appId, startDate, endDate, message, classification, status, createdBy, expireDate, titleClassification, title, approvedBy, approvedDate) {
        this.id = (id) ? id : '';
        this.type = (type) ? type : '';
        this.appId = (appId) ? appId : '';
        this.startDate = (startDate) ? startDate : '';
        this.endDate = (endDate) ? endDate : '';

        this.message = (message) ? message : 'empty message';
        this.classification = (classification) ? classification : '';
        this.status = (status) ? status : 'disapproved';
        this.createdBy = (createdBy) ? createdBy : '';
        this.createdDate = new Date().getTime();
        this.approvedBy = (approvedBy) ? approvedBy : '',
        this.approvedDate = (approvedDate) ? approvedDate : '',
        this.expireDate = expireDate;
    };
};

class SocketMessageRef {
    constructor(type, message, classification='(U)', titleClassification='', title='') {
        this.type = type;
        this.message = message;
        this.classification = classification;
        this.titleClassification = titleClassification;
        this.title = title;
        this.datetime = Date.now();
    }
}

module.exports = {
    ClientRef,
    MessageRef,
    SocketMessageRef
};