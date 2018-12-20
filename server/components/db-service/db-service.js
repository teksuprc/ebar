/**
 * Ecobar_DBService
 */
const loggingConfig = {
    logLocation: '../../../server.log',
    timeFormat: 'YYYY-MM-dd HH:mm:ss',
    level: 'info'
};
const logging = require('../logging')(loggingConfig);
const aws = require('aws-sdk');

defaultConfig = {
    "apiVersion": "2012-08-10",
    "accessKeyid": "abcde",
    "secretAccessKey": "abcde",
    "region": "us-east-1",
    "endpoint": "http://localhost:8000"
};

let dynamodb, docClient;
const logger = logging.logger;

class Ecobar_DBService {
    constructor() {}

    init(config) {
        if(config) {
            try {
                dynamodb = new aws.DynamoDB(config);
                docClient = new aws.DynamoDB.DocumentClient(config);
                logger.info('database connection successful');
            }
            catch(err) {
                logger.error(err);
            }
        }
    };

    // TODO: add batch put
    batchPut(table, ) {
        var params = {
            RequestItems: { // A map of TableName to Put or Delete requests for that table
                table_name_1: [ // a list of Put or Delete requests for that table
                    { // An example PutRequest
                        PutRequest: {
                            Item: { // a map of attribute name to AttributeValue    
                                attribute_name: attribute_value,
                                // attribute_value (string | number | boolean | null | Binary | DynamoDBSet | Array | Object)
                                // ... more attributes ...
                            }
                        }
                    },
                    { // An example DeleteRequest
                        DeleteRequest: {
                            Key: { 
                                key_attribute_name: attribute_value, //(string | number | boolean | null | Binary)
                                // more primary attributes (if the primary key is hash/range schema)
                            }
                        }
                    },
                    // ... more put or delete requests ...
                ],
                // ... more tables ...
            },
            ReturnConsumedCapacity: 'NONE', // optional (NONE | TOTAL | INDEXES)
            ReturnItemCollectionMetrics: 'NONE', // optional (NONE | SIZE)
        };
        docClient.batchWrite(params).promise();
    };

    putMessageForKey(row) {
        let params = {
            "TableName": "Messages",
            "Item": {
                "id": row.id,
                "audience": row.audience,
                "visibility": (row.visibility) ? row.visibility : "yes",
                "startDate": row.startDate,
                "endDate": row.endDate,
                "message": row.message
            }
        };
        docClient.put(params).promise();
    };
   
    scan() {
        var params = {
            TableName: 'Messages'
        };
        return docClient.scan(params).promise();
    };

    customQuery(table, keyCondition, attributeNames, attributeValues) {
        var params = {
            TableName: table,
            KeyConditionExpression: keyCondition,
            ExpressionAttributeNames: attributeNames,
            ExpressionAttributeValues: attributeValues
        };
        return docClient.query(params).promise();
    };

    getItem(key, startDate) {
        var params = {
            TableName: 'Messages',
            KeyConditionExpression: '#a = :a and #id = :id',
            ExpressionAttributeNames: {
                '#a': 'appId',
                '#id': 'id'
            },
            ExpressionAttributeValues: {
              ':a': key,
              ':id': `${key}-${startDate.getTime()}`
            }
        };
        return docClient.query(params).promise();
    };
    
    getCurrentMessagesForKey(key) {
        var params = {
            TableName: 'Messages',
            KeyConditionExpression: '#a = :a',
            FilterExpression: ':t >= #sd and :t < #ed',
            ExpressionAttributeNames: {
                '#a': 'audience',
                '#sd': 'startDate',
                '#ed': 'endDate',
            },
            ExpressionAttributeValues: {
              ':a': key,
              ':t': new Date().toISOString()
            }
        };
        return docClient.query(params).promise();
    };
}

function Ecobar_DBMessage(appId, startDate, endDate, classification, message, status, createdBy) {
    return {
        id: `${appId}-${startDate.getTime()}`,
        appId: appId,
        startDate: startDate,
        endDate: endDate,
        classification: classification,
        message: message,
        status: status,
        createdBy: createdBy,
        modifedBy: createdBy,
        createdDate: new Date().toISOString(),
        modifedDated: new Date() .toISOString()
    };
};

function Ecobar_DBUser(id, appIds, roles, connectionDate, lastLoginDate, createdBy) {
    return {
        id: id,
        appIds: appIds,
        roles: roles,
        lastLoginDate: lastLoginDate,
        connectionDate: connectionDate,
        createdBy: createdBy,
        modifedBy: createdBy,
        createdDate: new Date().toISOString(),
        modifedDated: new Date() .toISOString()
    };
};

module.exports = function(config) {
    let dbService = new Ecobar_DBService();
    dbService.init(config || defaultConfig);

    return {
        Ecobar_DBService: dbService,
        Ecobar_DBMessage: Ecobar_DBMessage,
        Ecobar_DBUser: Ecobar_DBUser
    };
};
