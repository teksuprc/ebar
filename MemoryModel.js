function InMemoryCache() {
    this.clients = [{ 
      clientID : 'dummy-client-id',
      clientSecret : 'dummy-client-secret',
      redirectUris : [''],
      grants: ['client_credentials'],
    }];
    this.tokens = [];
    this.users = [{ id : '123', username: 'bill', password: 'bill' }];
  }
  
  /**
   * Dump the cache.
   */
  InMemoryCache.prototype.dump = function() {
    console.log('clients', this.clients);
    console.log('tokens', this.tokens);
    console.log('users', this.users);
  };
  
  /*
   * Get access token.
   */
  InMemoryCache.prototype.getAccessToken = function(bearerToken) {
    //console.log('called getAccessToken, bearerToken=', bearerToken);
    var tokens = this.tokens.filter(function(token) {
      return token.accessToken === bearerToken;
    });
  
    return tokens.length ? tokens[0] : false;
  };
  
  /**
   * Get refresh token.
   */
  InMemoryCache.prototype.getRefreshToken = function(bearerToken) {
    //console.log('called getRefreshToken, bearerToken=', bearerToken);
    var tokens = this.tokens.filter(function(token) {
      return token.refreshToken === bearerToken;
    });
  
    return tokens.length ? tokens[0] : false;
  };
  
  /**
   * Get client.
   */
  InMemoryCache.prototype.getClient = function(clientID, clientSecret) {
    //console.log(`called InMemoryCache.getClient - clientId=${clientId}, clientSecret=${clientSecret}`);
    var clients = this.clients.filter(function(client) {
      return client.clientID === clientID &&
             client.clientSecret === clientSecret;
    });
    //console.log('found clients: ' + clients.length);
    return clients.length ? clients[0] : false;
  };
  
  /**
   * Save token.
   */
  InMemoryCache.prototype.saveToken = function(token, client, user) {
    //console.log('called saveToken', arguments);
    var newToken = {
      accessToken: token.accessToken,
      accessTokenExpiresAt: token.accessTokenExpiresAt,
      clientID: client.clientID,
      refreshToken: token.refreshToken,
      refreshTokenExpiresAt: token.refreshTokenExpiresAt,
      userId: user.id,
  
      //these are required in /node_modules/express-oauth-server/node_modules/oauth2-server/lib/models/token-model.js
      client: client,
      user:user,
      scope: null, //where are we taking scope from? maybe client?
    };
    this.tokens.push(newToken);
    return newToken;
  };
  
  /*
   * Get user.
   */
  InMemoryCache.prototype.getUser = function(username, password) {
    var users = this.users.filter(function(user) {
      return user.username === username && user.password === password;
    });
  
    return users.length ? users[0] : false;
  };
  
  InMemoryCache.prototype.getUserFromClient = function(){
    //console.log('called prototype.getUserFromClient', arguments);
    //todo: find correct user.
    return this.users[0];
  }
  
  InMemoryCache.prototype.saveAuthorizationCode = function(){
      console.log('how is this implemented!?', arguments);
  }


  module.exports = InMemoryCache;