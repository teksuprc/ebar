/**
 * Admin-Routes.js
 * @desc - This handles the administrator routes for the admin application.
 */
const express = require('express');
const uuid = require('uuid');
const config = require('../config/vcap-utils');
const gx = require('../server/components/geoaxis');
const redisdb = require('../server/components/redis-db');
const models = require('../server/models');
const logging = require('../server/components/logging');
const logger = logging.logger;
const router = express.Router();

const randomMessage = [
    "What\'s the difference between a good joke and a bad joke timing",
    "A wife tells her programmer husband, \"Go to the store and buy a loaf of bread. If they have eggs, buy a dozen.\" The husband returns with 12 loaves of bread",
    "A blind man walks into a bar. And a table. And a chair",
    "My boss told me to have a good day... so I went home",
    "What do you call a fake noodle? An impasta",
    "Five out of four people admit... they\'re bad with fractions!",
    "Where do sheep get their hair cut? The baa-baa shop",
    "Where do rabbits go after they get married? On a bunny-moon",
    "How do you make a tissue dance? You put a little boogie in it",
    "Why did the tomato turn red? It saw the salad dressing"
];

const db = redisdb.RedisDB;
const DBUser = models.ClientRef;
const DBMessage = models.MessageRef;


router.use(gx.isAuthenticatedAdmin);

// We do this to remove the session id
let mapReqUser = function(user) {
    return {
        socketId: user.socketId,
        uid: user.uid,
        name: user.name,
        appIds: user.appIds.join(),
        email: user.email,
        phone: user.phone,
        department: user.department,
        dn: user.dn.join(),
        roles: user.roles.join(),
        creationDate: user.creationDate,
        authenticatedAdmin: user.authenticatedAdmin
    };
}

router.get('/adminDashboard', (req, res) => {
    res.render('admin', {user: JSON.stringify(mapReqUser(req.user))});
});

router.get('/api', (req, res) => {
    res.render('api', {user: req.user, data: {version: null, message: null}});
});

router.get('/api/messages', (req, res) => {
    let msg = randomMessage[Math.floor((Math.random() * randomMessage.length))];
    let data = {version: config.version, message: msg};
    res.render('api', {user: req.user, data: data});
});

router.get('/api/message/:id', (req, res) => {
    let id = req.params.id;
    let msg = randomMessage[Math.floor((Math.random() * randomMessage.length))];
    let data = {version: config.version, message: `${msg} - ${id}`};
    res.render('api', {user: req.user, data: data});
});

router.get('/profile', (req, res) => {
    res.render('profile', {user: req.user});
});

router.get('/user/add', (req, res) => {
    res.render('adduser', {user: req.user});
});

// TODO: we need to fix this... b/c we will not have the user's uid at this point
// change to have the user register to have admin/manager roles, while we capture the data needed when they login
router.post('/user/add', (req, res) => {
    if(req.body != undefined) {
        let admin = 'admin1';
        let user = new DBUser(`user:${uuid()}`, body.name, body.email, body.phone, body.appIds, body.roles, body.department);
        db.addUser(user, admin, (err, reply) => {
            if(err) res.render('adduser', {user: req.user, status: 'failed', error: err});
            res.render('adduser', {user: req.user, status: 'success', reply: reply});
        });
    }
    res.render('adduser', {user: req.user, status: 'failed', error: 'no valid data to create user'});
});


module.exports = {
    router
};
