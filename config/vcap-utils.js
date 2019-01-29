/**
 * VCAP-UTILS.js
 * 
 * @desc - check for VCAP_SERVICES env variable. If so, its running on PAAS so use the env variables for the oauth info.
 */
let vcap_services = null;
if(process.env.VCAP_SERVICES) {
    const vcap_services = JSON.parse(process.env.VCAP_SERVICES);
    console.log('=================================================================');
    console.log('vcap services exists');
    console.log('=================================================================');
}
else {
    console.log('=================================================================');
    console.log('vcap services does not xist');
    console.log('=================================================================');
}

let EnvConfig = {
    version: "1.0.0",
    server: {
        port: process.env.Port || 8080
    },
    logging: {
        logLocation: process.env.LogLocation || './server.log',
        timeFormat: process.env.LogFormat || 'YYYY-MM-dd HH:mm:ss',
        level: process.env.LogLevel || 'info',
        handleExceptions: process.env.HandleExceptions || true,
        json: process.env.JSON || false,
        timestamp: process.env.Timestamp || true,
        colorize: process.env.Colorize || true,
        maxSize: process.env.MaxSize || 5242880,        // 5MB
        maxFiles: process.env.MaxFiles || 5,        // 5
    },
    session: {
        domain: process.env.SessionDomain || 'localhost',
        expires: process.env.SessionExpires || 30 * 60 * 1000,        // 30 mins
        httpOnly: process.env.HttpOnly || false,
        keys: process.env.Keys || ['7h3y@lll0v3rsc@7s', '7h3y@lll0v3rsd0gs'],
        maxAge: process.env.SessionMaxAge || 24 * 60 * 60 * 1000,    // 1 day
        name: process.env.SessionName || '3c0bar',
        path: process.env.SessionPath || '/',
        resave: process.env.Resave || false,
        sameSite: process.env.SameSite || 'strict',
        saveUninitialized: process.env.SaveUninitialized || false,
        secret: process.env.Secret || '7h3y@lll0v3rsc@7s',
        secure: process.env.SessionSecure || false
    },
    socket: {
        origins: process.env.Origins || 'localhost:*',
        autoConnect: process.env.AutoConnect || false, 
        forceNew: process.env.ForceNew || false,
        pingInterval: process.env.PingInterval || 900000,
        transports: process.env.Transports || ['polling'] //['websocket', 'polling']
    },
    db: {
        apiVersion: process.env.APIVersion || "2012-08-10",
        accessKeyid: (vcap_services) ? vcap_services['aws-dynamodb'][0].access_key_id : "abcde",
        secretAccessKey: (vcap_services) ? vcap_services['aws-dynamodb'][0].secret_access_key : "abcde",
        region: (vcap_services) ? vcap_services['aws-dynamodb'][0].region : "us-east-1",
        endpoint: process.env.EndPoint || "http://127.0.0.1:8000"
    },
    db_redis: {
        port: process.env.RedisPort || "6000", 
        host: process.env.RedisHost || '127.0.0.1',
        no_ready_check: process.env.RedisNoReadyCheck || true
    },
    gx: {
        client_id: (vcap_services) ? vcap_services['p-identity'][0].credentials.client_id : "abcde",
        client_secret: (vcap_services) ? vcap_services['p-identity'][0].credentials.client_secret : "abcde",
        auth_domain: (vcap_services) ? `${vcap_services['p-identity'][0].credentials.auth_domain}` : "localhost",
        auth_url: (vcap_services) ? `${vcap_services['p-identity'][0].credentials.auth_domain}/oauth/authorize`  : "localhost/authorize",
        token_url: (vcap_services) ? `${vcap_services['p-identity'][0].credentials.auth_domain}/oauth/token` : "localhost/token",
        userinfo_url: (vcap_services) ? `${vcap_services['p-identity'][0].credentials.auth_domain}/userinfo` : "localhost/me",

        redirect_url: process.env.RedirectUrl || "" || "/gx/auth/callback"
    }
};


module.exports = EnvConfig;
