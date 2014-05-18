var fs = require('fs');
var path = require('path');
var url = require('url');

var async = require('async');

var Steam = require('steam');
var SteamTrade = require('steam-trade');
var SteamTradeOffers = require('steam-tradeoffers');
var rpc = require('node-json-rpc');

var stdin = require('./stdin');
var appData = require('./appData');

var currentDir = process.cwd();
var authCode;

if (!process.argv[2] || process.argv[2] == '') {
  throw new Error('Error: Config is not specified.');
}

var config;
var configPath = path.join(currentDir, process.argv[2] + '.json');

function saveConfig() {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

async.series([

  function(callback) {
    try {
      config = require(configPath);
    } catch (e) {}

    async.series([
      function startConfigure(cb) {
        if (config) {
          return cb();
        }

        config = config || {};
        console.log('Config ' + configPath + ' does not exist. Create? (Y/n)');
        stdin(function (data) {
          if (data == '' || data.toLowerCase() == 'y') {
            saveConfig();
            cb();
          } else {
            process.exit();
          }
        });
      },

      function getSteamUsername(cb) {
        if (config.steamUsername) {
          return cb();
        }

        console.log('Enter Steam username:');
        stdin(function(data) {
          config.steamUsername = data;
          saveConfig();
          cb();
        }, 'You must provide Steam username for bot to function.');
      },

      function getSteamPassword(cb) {
        if (config.steamPassword) {
          return cb();
        }

        console.log('Enter Steam password:');
        stdin(function (data) {
          config.steamPassword = data;
          saveConfig();
          cb();
        }, 'You must provide Steam password for bot to function.');
      },

      function getSteamGuardCode(cb) {
        if (config.steamGuard) {
          return cb();
        }

        var steam = new Steam.SteamClient();
        steam.logOn({
          accountName: config.steamUsername,
          password: config.steamPassword
        });

        steam.once('error', function (e) {
          if (e.cause != 'logonFail') {
            throw e;
          }
          if (e.eresult == Steam.EResult.InvalidPassword) {
            delete config.steamUsername;
            delete config.steamPassword;
            saveConfig();
            throw new Error('Your username and/or password is invalid. Try again.');
          } else if (e.eresult == Steam.EResult.AlreadyLoggedInElsewhere) {
            throw new Error('This account is already logged in elsewhere.');
          } else if (e.eresult == Steam.EResult.AccountLogonDenied) {
            console.log('Your Steam Guard code should have been emailed to you.');
            console.log('Enter Steam Guard Code:');
            stdin(function (data) {
              authCode = data;
              cb();
            }, 'You must provide Steam Guard Code. Wait for email or check your Spam folder.');
          } else {
            throw e;
          }
        });
      },

      function getServerConfig(cb) {
        if (config.server) {
          return cb();
        }
        config.server = appData.defaultServerOptions;
        console.log('Specify the port that the bot should listen: (' + config.server.port + ')');
        (function stdinServerPort() {
          stdin(function (data) {
            if (data == '') {
              saveConfig();
              cb();
            } else if(parseInt(data, 10) != 0 && !isNaN(parseInt(data, 10)) && parseInt(data, 10) <= 65535) {
              config.server.port = parseInt(data, 10);
              saveConfig();
              cb();
            } else {
              console.log('Invalid port, please choose another port: (' + config.server.port + ')');
              stdinServerPort();
            }
          });
        })();
      },

      function getClientConfig(cb) {
        if (config.client) {
          return cb();
        }
        config.client = appData.defaultClientOptions;
        var m = 'Specify the URL of your JSON-RPC server that the bot should call (Ex. http://example.com/api.php):';
        console.log(m);
        (function stdinClientURL() {
          stdin(function (data) {
            var parsedURL = url.parse(data);
            if(parsedURL.hostname && parsedURL.path) {
              config.client.host = parsedURL.hostname;
              config.client.path = parsedURL.path;
              if (parsedURL.port) {
                config.client.port = parseInt(parsedURL.port, 10);
              }
              saveConfig();
              cb();
            } else {
              console.log('Invalid URL, please specify another URL:');
              stdinClientURL();
            }
          }, m);
        })();
      }

    ], function (err) {
      if (err){
        throw err;
      }
      callback();
    });
    
  },

  function (callback) {
    var loginOptions = {
      accountName: config.steamUsername,
      password: config.steamPassword
    };

    if (config.steamGuard) {
      loginOptions.shaSentryfile = new Buffer(config.steamGuard);
    } else if (authCode) {
      loginOptions.authCode = authCode;
    } else {
      return callback(new Error('No Steam Guard Hash or Auth Code'));
    }

    var sk = {};

    function getProperty(property) {
      if (this[property]) {
        return this[property];
      } else {
        return new Error('No such property');
      }
    };

    Steam.SteamClient.prototype.getProperty = getProperty;
    SteamTrade.prototype.getProperty = getProperty;
    SteamTradeOffers.prototype.getProperty = getProperty;

    sk.steam = new Steam.SteamClient();
    sk.trade = new SteamTrade();
    sk.tradeOffers = new SteamTradeOffers();

    sk.steam.logOn(loginOptions);

    if (config.debug) {
      sk.steam.on('debug', function(input){ console.log('steam: ' + input) });
      sk.trade.on('debug', function(input){ console.log('trade: ' + input) });
      sk.tradeOffers.on('debug', function(input){ console.log('tradeoffers: ' + input) });
    }

    sk.steam.on('loggedOn', function (result) {
      sk.steam.setPersonaState(Steam.EPersonaState.Online);
    });

    sk.steam.once('loggedOn', function () {
      startServer();
      startClient();
    });

    sk.steam.on('webSessionID', function (sessionID) {
      sk.steam.webLogOn(function (newCookie) {
        sk.tradeOffers.setup(sessionID, newCookie);
        
        sk.trade.sessionID = sessionID;
        newCookie.forEach(function (name) {
          sk.trade.setCookie(name);
        });
      });
    });

    sk.steam.on('error', function (e) {
      if (e.cause == 'loggedOff') {
        sk.steam.logOn(loginOptions);
      } else if (e.eresult == Steam.EResult.InvalidPassword) {
        throw new Error('Your password is invalid. Edit config to fix it');
      } else if (e.eresult == Steam.EResult.AlreadyLoggedInElsewhere) {
        throw new Error('This account is already logged in elsewhere.');
      } else if (e.eresult == Steam.EResult.AccountLogonDenied) {
        throw new Error('Your Steam Guard Hash is invalid. Remove "steamGuard" from config to get new code.');
      } else {
        throw e;
      }
    });

    sk.steam.on('sentry', function (sentry) {
      config.steamGuard = sentry;
      saveConfig();
    });

    function startServer() {

      var serverOptions = config.server || appData.defaultServerOptions;

      function createCaller(group, method) {
        return function (params, callback) {
          if (Object.prototype.toString.apply(params) != '[object Array]') {
            return callback({ code: -32602, message: "Invalid params" });
          }
          try {
            if (typeof method.callback == 'number') {
              params[method.callback] = function () {
                callback(null, Array.prototype.slice.call(arguments, 0));
              };
            }
            var results = sk[group][method.method].apply(sk[group], params);
            if (typeof method.callback == 'undefined') {
              callback(null, results || "OK");
            }
          } catch (e) {
            callback({ code: -32602, message: "Invalid params" });
          }
        };
      }

      var server = new rpc.Server(serverOptions);
      var x;
      for (x in appData.rpcMethods) {
        appData.rpcMethods[x].forEach(function (method) {
          var methodName = x + '.' + method.method;
          var add = false;
          if (config.methodsWhitelist) {
            if (config.methodsWhitelist.indexOf(method.method) != -1) {
              add = true;
            }
          } else {
            if (!config.methodsBlacklist || config.methodsBlacklist.indexOf(method.method) == -1) {
              add = true;
            }
          }
          if (add) {
            server.addMethod(methodName, createCaller(x, method));
          }
        });
      }

      server.start(function (error) {
        if (error) {
          throw error
        }
        console.log('Storekeeper is running...');
      });

    }

    function startClient() {

      function createListener(client, group, method) {
        return function () {
          client.call(
            {
              "jsonrpc": "2.0",
              "method": group + "." + method,
              "params": {
                "steamID": sk.steam.steamID,
                "arguments": Array.prototype.slice.call(arguments, 0)
              }
            },
            function (err, res) {
              if (err) {
                console.log(err);
              }
            }
          );
        };
      }

      var clientOptions = config.client || appData.defaultClientOptions;

      var client = new rpc.Client(clientOptions);
      var x;
      for (x in appData.rpcEvents){
        appData.rpcEvents[x].forEach(function (event) {
          var listen = false;
          if (config.eventsWhitelist) {
            if (config.eventsWhitelist.indexOf(event) != -1) {
              listen = true;
            }
          } else {
            if (!config.eventsBlacklist || config.eventsBlacklist.indexOf(event) == -1) {
              listen = true;
            }
          }
          if (listen) {
            sk[x].on(event, createListener(client, x, event));
          }
        });
      }
      
    }

    callback();
  }

], function (err) {
  if (err) {
    throw err;
  }
});

