/**
 * Ecobar_DBService
 */
const aws = require('aws-sdk');
const logging = require('../logging');
const config = require('../../../config/vcap-utils');


let dynamodb, docClient;
const logger = logging.logger;


class Ecobar_DBService {
    constructor() {}

    init() {
        try {
            dynamodb = new aws.DynamoDB(config.db);
            docClient = new aws.DynamoDB.DocumentClient(config.db);
            logger.info('database connection successful');
        }
        catch(err) {
            logger.error(err);
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


module.exports = {
    Ecobar_DBService
};
