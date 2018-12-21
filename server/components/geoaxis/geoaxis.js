/**
 * 
 */

const express = require('express');
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');
const http = require('http');
const base64 = require('base-64');


const routes = express.Router();

const DefaultConfig = {
    authorizationURL: process.env.AuthorizationURL || '/local/authorization',
    tokenURL: process.env.TokenURL || '/local/token',
    clientID: process.env.ClientID || 'abc123',
    clientSecret: process.env.ClientSecret || 'abc123',
    callbackURL: process.env.CallbackURL || '/adminDashboard'
};

let config = null;

routes.get('/auth/gx', passport.authenticate('oauth2', {scope: '*'}));

//routes.post(config.tokenURL, passport.authenticate(['basic', 'oauth2-client-password'], {session: false}), oauth.token()])

routes.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
})

let isAuthenticated = function(req, res, next) {
    // check null and undefined with non-strict !=
    if(req.user != undefined && req.session.user != undefined) 
        next();
    else
        res.redirect("/");
}

module.exports = function(cfg) {
    config = cfg || DefaultConfig;
    /*
    if(cfg.authorizationURL == undefined ||
        cfg.tokenURL == undefined ||
        cfg.clientID == undefined ||
        cfg.clientSecret == undefined ||
        cfg.callbackURL == undefined) {
            throw('***** ERROR ***** no valid OAuth configuration');
        }
    */

    passport.use(new OAuth2Strategy(config, (accessToken, refreshToken, params, profile, done) => {
        console.log('accessToken', accessToken);
        console.log('refreshToken', refreshToken);
        console.log('profile', profile);
        console.log('params', params);

        const options = {
            host: 'http://localhost',
            port: 3000,
            path: '/api/userinfo',
            headers: {
                Authorization: base64.encode(`${clientID}:${config.clientSecret}`),
            },
            rejectUnauthorized: false,
        };
      
        // get the user based on the accessToken
        http.post(options, (res) => {
            console.log('got a res');
        }).on('data', (d) => {
            console.log('data', d);
        }).on('error', (e) => {
            console.log('error', e.message);
        });
    }));

    passport.serializeUser((user, done) => {
        done(null, user);
    });

    passport.deserializeUser((user, done) => {
        done(null, user);
    });

    return {
        routes: routes,
        isAuthenticated: isAuthenticated
    };
};
