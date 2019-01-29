const dbService = require('./db-service');

const db = new dbService.Ecobar_DBService();
db.init();

module.exports = {
    Ecobar_DBService: db,
    Ecobar_DBMessage: dbService.Ecobar_DBMessage,
    Ecobar_DBUser: dbService.Ecobar_DBUser
}
    