const aws = require('aws-sdk');


config = {
    "apiVersion": "2012-08-10",
    "accessKeyid": "abcde",
    "secretAccessKey": "abcde",
    "region": "us-east-1",
    "endpoint": "http://localhost:8000"
};

const dynamodb = new aws.DynamoDB(config);
const docClient = new aws.DynamoDB.DocumentClient(config);

class DBService {

    static putMessageForAudience(row) {
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
        docClient.put(params, function(err, data) {
            if (err)
                console.log(`db message insert error for {${params.Item.id} ${params.Item.audience}`, JSON.stringify(err, null, 2));
            else {
                console.log('db message insert', JSON.stringify(params.Item, null, 2));
            }
        });
    };
    
    static getCurrentMessagesForAudience(key) {
        var params = {
            TableName: 'Messages',
            KeyConditionExpression: '#a = :v',
            FilterExpression: ':t >= #sd and :t < #ed',
            ExpressionAttributeNames: {
                '#a': 'audience',
                '#sd': 'startDate',
                '#ed': 'endDate',
            },
            ExpressionAttributeValues: {
              ':v': key,
              ':t': new Date().toISOString()
            }
        };
        return docClient.query(params).promise();
    }
}

module.exports = DBService;