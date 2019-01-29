/**
 * GXStrategy.js
 * @desc - This module sets up passport and the gx oauth20 stategy.
 * usage: 
 *   const passportSetup = require('./config/passport-setup')();
 *   const Strategy = require('passport-oauth2').Strategy;
 *   const request = require('request-promise');
 */
const passport = require('passport');
const Strategy = require('passport-oauth2').Strategy;
const request = require('request-promise');

const redisDB = require('../redis-db');
const config = require('../../../config/vcap-utils');
const models = require('../../models');
const logging = require('../logging');

const logger = logging.logger;
const db = redisDB.RedisDB;
const DBUser = models.ClientRef;


module.exports = function() {
    /**
     * @name findOrCreateUser
     * @desc - This method finds a user within the stored users. If no user is found then we create a new user.
     * @param {*} profile - the user to find or create.
     */
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

    passport.serializeUser((user, done) => {
        done(null, user);
    });

    passport.deserializeUser((obj, done) => {
        done(null, obj);
    });

    passport.use(new Strategy({
            clientID: config.gx.client_id,
            clientSecret: config.gx.client_secret,
            callbackURL: config.gx.redirect_url,
            authorizationURL : config.gx.auth_url,
            tokenURL: config.gx.token_url
        }, 
        (accessToken, refreshToken, profile, done) => {
            console.log('verify');
            console.log('profile', profile);
            const options = {
                uri: config.gx.userinfo_url,
                method: 'POST',
                json: true,
                headers: {
                    authorization: `Bearer ${accessToken}`
                }
            };
            request(options, (err, res, body) => {
                if(err) done(err, null);
                if(body) {
                    findOrCreateUser(body).then(
                        (user) => {
                            if(user) done(null, user);
                            else done(null, false);
                        }
                    )
                    .catch((err) => logger.error(`fnidOrCreateUser error - ${err}`));
                }
                else done(null, false);
            }).catch(err => logger.logError('passport strategy error', err));
        })
    );
};
