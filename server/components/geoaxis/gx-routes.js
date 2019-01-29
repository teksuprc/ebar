/**
 * GX-Routes.js
 * @desc - This handles the authentication routes for OAuth2.0 to GX.
 */
const base64 = require('base-64');
const express = require('express');
const passport = require('passport');
const config = require('../../../config/vcap-utils');
const models = require('../../models');
const redisdb = require('../redis-db');
const router = express.Router();

const db = redisdb.RedisDB;
const DBUser = models.ClientRef;


let passClientIdSecret = ((req, res, next) => {
    let b64 = base64.encode(`${config.gx.client_id}:${config.gx.client_secret}`);
    res.header('Authorization', `Basic ${b64}`);
    next();
});

let isAuthenticated = (req, res, next) => {
    if(req.user == undefined)
        res.redirect('/gx/login');
    else 
        next();
};

async function findOrCreateUser(profile) {
    if(profile && profile.user_attributes && profile.user_attributes.uid) {
        // if user... get the user
        // else created one
        let newUser = null;
        db.readUser(profile.user_attributes.uid, (err, user) => {
            if(err) return Promise.reject(err);
            if(user) return Promise.resolve(user);
            else {
                newUser = new DBUser(
                    '',
                    (profile.user_id) ? profile.user_id : '',
                    (profile.user_name) ? profile.user_name : '', 
                    (profile.user_attributes.uid) ? profile.user_attributes.uid : '', 
                    (profile.email) ? profile.email : '', 
                    (profile.phone_number) ? profile.phone_number : '',
                    (profile.user_attributes['Dept ID']) ? profile.user_attributes['Dept ID'] : '', 
                    (profile.user_attributes.DN) ? profile.user_attributes.DN.join() : '',
                    (profile.appIds) ? profile.appIds.join() : '', 
                    (profile.roles && profile.roles.length > 0) ? profile.roles.join() : '',
                    (profile.roles.includes('admin') || profile.roles.includes('manager')) ? true : false,
                    'system'
                );
                db.createUser(user.uid, user, user.authenticatedAdmin, 'system', (err, reply) => {
                    if(err) return Promise.reject(err);
                    if(reply) return Promise.resolve(newUser);
                });
            }
        });
    }
    else {
        return Promise.resolve(null);
    }
};
/*
let isAuthenticatedAdmin = (req, res, next) => {
    let profile = {
        user_id: 'ed56caa4-fb60-45e6-a712-7821522726fa',
        user_name: 'Bob Tester',
        email: 'Bob.Tester.ctr@.tests.com',
        phone_number: '123-456-7897',
        user_attributes: {
            uid: 'ed56caa4-fb60-45e6-a712-7821522726fa',
            department: 'IT',
            dn: ['OU=USS','C=USS','OU=ENTERPRISSE','OU=Star Fleet Command','CN=Tester.Bob','O=Galactic Space Federation'],
        },
        appIds: ['test1','test2'],
        roles: ['admin']
    };

    findOrCreateUser(profile).then(
        (user) => {
            console.log('user', user);
        }
        .catch((err) => logger.error(`fnidOrCreateUser error - ${err}`));
    )
};
*/

let isAuthenticatedAdmin = (req, res, next) => {
    req.user = new DBUser(
        '',
        '09025c97-b460-479b-882b-f86ccfcd3849',
        'Russell.Chandler.ctr@tests.com',
        '1049461352',
        'Russell.Chandler.ctr@tests.com',
        '(123) 456-7890',
        'The IT Dept',
        ['OU=USS','C=USS','OU=ENTERPRISE','OU=Starleet Command','CN=Chandler.Russell.987654321','O=Galactic Space Federation'],
        ['test1','test2','test3'],
        ['admin', 'manager'],
        true
    );

    if(req.user == undefined) {
        res.redirect('/gx/login');
    }
    else if(req.user.roles.includes('admin')) {
        next();
    }
    else {
        res.redirect('/');
    }
};

router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

// get 'code'
router.get('/auth', passClientIdSecret, passport.authenticate('oauth2', {
    // the list of gx scopes: ['openid', ''profile', 'roles', 'user_attributes']
    scope: ['profile', 'openid', 'roles', 'user_attributes']
}));

// we have 'code' now get 'accessToken' and 'profile'
router.get('/auth/callback', passport.authenticate('oauth2'), (req, res) => {
    const user = (req.user) ? req.user : null;
    if(user != undefined) {
        res.render('profile', {user: user});
    }
    else {
        res.redirect('/gx/login');
    }
});


module.exports = {
    router,
    isAuthenticated,
    isAuthenticatedAdmin,
};
