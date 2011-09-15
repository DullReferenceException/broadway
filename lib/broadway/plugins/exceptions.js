/*
 * exceptions.js: Plugin responsible for logging all uncaughtExceptions in a flatiron App.
 *
 * (C) 2011, Nodejitsu Inc.
 * MIT LICENSE
 *
 */

var winston = require('winston'),
    common = require('../common');

var exceptions = exports;

//
// Setup default state for the exceptions plugin
//
exceptions.name       = 'exceptions';
exceptions.initalized = false;

var defaultConfig = exceptions.defaultConfig = {
  console: {
    colorize: false,
    json: true,
    level: 'silly'
  }
};

exceptions.init = function (app, options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  callback = callback || function () { };
  options  = options  || {};
  
  if (app.config) {
    options = common.mixin({}, options, app.config.get('exceptions') || {});
  }
  
  if (exceptions.initalized) {
    return callback();
  }

  var exceptionHandlers = [];

  //
  // Create the exceptionHandlers defaulting to Console and Loggly.
  //
  exceptionHandlers.push(new winston.transports.Console(options.console || defaultConfig.console));
  
  //
  // Only add the Loggly transport if the input token is 
  // in the options passed to 'init' 
  //
  if (options.loggly && options.loggly.inputs['exceptions']) {
    exceptionHandlers.push(new winston.transports.Loggly({
      json:       options.loggly.json !== false,
      inputToken: options.loggly.inputs['exceptions'],
      level:      options.loggly.level || null,
      subdomain:  options.loggly.subdomain      
    }));
  }
  
  //
  // Update the state of the plugin with the logger.
  //
  exceptions.logger = new winston.Logger({ exceptionHandlers: exceptionHandlers });
  exceptions.initalized = true;
  
  //
  // Have the logger handle uncaught exceptions.
  //
  exceptions.logger.handleExceptions();
  callback();
};