var cfg   = require('config');
var defer = require('config/defer').deferConfig;

module.exports = {

  appName: "gumtreeTrawler",

  resultsStoreFile: ".gumtreeResults.json",

  gumtreeSearch: "OVERRIDE_ME",

  maxResults: 10,
  log: {
    appName: defer(function (cfg) { return cfg.appName } ),
    level:   "INFO",
    log4jsConfigs: {
      appenders: [
        {
          type:       "file",
          filename:   defer(function (cfg) { return cfg.log.logDir.concat("/" , cfg.appName, "-", process.env.NODE_ENV, ".log" ) }),
          category:   defer(function (cfg) { return cfg.log.appName }),
          reloadSecs: 60,
          maxLogSize: 1024000
        },
        {
          type: "console"
        }
      ],
      replaceConsole: true
    },
    logDir: "./logs"
  },

  reporter: {
    appName             : defer( function (cfg) { return cfg.appName } ),
    appSpecificPassword : "OVERRIDE_ME",
    emailsFrom          : "OVERRIDE_ME",
    name                : "Reporter (Personal)",
    notificationTo      : "OVERRIDE_ME",
    user                : "OVERRIDE_ME",
    clientSecretFile    : "",
    googleScopes        : "",
    tokenDir            : "",
    tokenFile           : ""
  }

}
