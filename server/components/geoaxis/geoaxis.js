/**
 * GeoAxis
 */
const https = require('https');
const passport = require('passport');
const passportHttp = require('passport-http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');

let defaultConfig = {
};

let geoaxis = null;

let init = function(config) {

};

module.exports = function(config) {
    init(config || defaultConfig);    
    return {
        geoaxis: geoaxis
    };
}
