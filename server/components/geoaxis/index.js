/**
 * GX Component
 */
const gxStrategy = require('./gxStrategy')();
const gxRoutes = require('./gx-routes');

const router = gxRoutes.router;
const isAuthenticated = gxRoutes.isAuthenticated;
const isAuthenticatedAdmin = gxRoutes.isAuthenticatedAdmin;

module.exports = {
    router,
    isAuthenticated,
    isAuthenticatedAdmin
};
