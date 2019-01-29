/**
 * Server.js
 */
const express = require('express');
const path = require('path');
const ejs = require('ejs');
const helmet = require('helmet');
const bodyParser = require('body-parser');

const config = require('../config/vcap-utils');
const logging = require('./components/logging');
const gx = require('./components/geoaxis');
const adminRoutes = require('../routes/admin-routes');
const Socket = require('./components/socket');

const app = express();
const logger = logging.logger;


app.use(express.static(path.join(__dirname, '..', 'public')));
app.set('view engine', 'ejs');
app.set('views', 'views');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(helmet());
app.use(logging.morganStreamHandler);

/*
// jquery
app.use('/js', express.static(path.join(__dirname, '..', 'node_modules', 'jquery/dist')));
// bootstrap
app.use('/css', express.static(path.join(__dirname, '..', 'node_modules', 'bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, '..', 'node_modules', 'bootstrap/dist/js')));
// font-awesome
app.use('/css', express.static(path.join(__dirname, '..', 'node_modules', 'font-awesome/css')));
app.use('/fonts', express.static(path.join(__dirname, '..', 'node_modules', 'font-awesome/fonts')));
*/

app.use('/admin', adminRoutes.router);
app.use('/gx', gx.router);


const server = app.listen(config.server.port, () => {
    logger.info('server started and listening...');
});


let socket = new Socket(server);

process.on('exit', (code) => {
    socket.shutdown();
});
process.on('SIGINT', (code) => {
    socket.shutdown();
});
process.on('SIGUSR1', (code) => {
    socket.shutdown();
});
process.on('SIGUSR2', (code) => {
    socket.shutdown();
});
process.on('uncoughtException', (code) => {
    socket.shutdown();
});
process.on('unhandledRejection', (reason) => {
    console.log(`server shutting down because ${reason}`);
    socket.shutdown();
});

server.on('close', () => {
    logger.info('shutting down the server...');
    socket.shutdown();
});


app.get('/', (req, res) => {
    res.render('index', {user: (req.user) ? req.user : null});
});

app.get('/clientDashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'client', 'index.html'));
});

app.get('/login', (req, res) => {
    res.render('login');
});
