/*
 * log.js: Default logging plugin which attachs winston to App instances 
 *
 * (C) 2011, Nodejitsu Inc.
 * MIT LICENSE
 *
 */
 
var winston = require('winston'),
    common = require('../common'),
    constants = require('../constants');

var log = exports;

//
// ### Setup default state for the exceptions plugin
//
log.name   = 'log';
log.ignore = ['broadway'];

//
// ### function attach (options)
// #### @options {Object} Options for this plugin
// Extends `this` (the application) with logging functionality from `winston`.
//
log.attach = function (options) {
  var self = this;
  options  = options || {};
    
  if (this.config) {
    //
    // Merge options with any pre-existing application config.
    //
    options = common.mixin({}, options, this.config.get('log') || {});
  }
  
  //
  // Hoist up relelvant logging functions onto the app
  // if requested.
  //
  this.log = new winston.Container(options);
  this.log.namespaces = options.namespaces || {};
  this.log.get('default').extend(this.log);
  
  Object.keys(this.log.namespaces).forEach(function (namespace) {
    self.log.add(namespace);
  });
  
  //
  // Listen to relevant `app` events and 
  // log them appropriately.
  //
  if (options.logAll) {
    this.logAll = true;
    this.onAny(log.logEvent);
  }
  else {
    this.logAll = false;
    this.on(['log', '*'], log.logEvent);
    this.on(['log', '*', '*'], log.logEvent);
  }
};

//
// ### function logEvent (msg, meta) 
// #### @msg {string} Message to log
// #### @meta {Object} **Optional** Metadata to log
// Logs the specified `msg` and `meta` according to 
// the following conditions:
//
// 1. `log::[level]` - Logs to the default logger
// 2. `log::[namespace]::[level]` - Logs to a namespaced logger
// 3. `[namespace]::[level|message]` - If `app.logAll` is set,
//    then we will attempt to find a logger at `namespace`, 
//    otherwise the default logger is used. If the second part
//    of the event is a level then that level is used and the
//    rest will be the message.   
// 
//
log.logEvent = function (msg, meta) {
  var parts = this.event.split(this.delimiter),
      ev = parts[0],
      namespace,
      logger,
      level;
      
  if (log.ignore.indexOf(ev) !== -1) {
    return;
  }
  
  if (ev === 'log') {
    if (parts.length === 2) {
      namespace = 'default';
      level = parts[1];
    }
    else {
      namespace = parts[1];
      level = parts[2];
    }    
  }
  else if (this.logAll) {
    namespace = this.log.namespaces[ev] ? ev : 'default';
    level = parts[1];
    
    if (!meta && typeof msg === 'object') {
      meta = msg;
      msg = '';
    }
    
    if (parts.length > 2) {
      msg = parts.slice(2).join(this.delimiter) + this.delimiter + msg;
    }
  }
  
  return log._log.call(this, namespace, level, msg, meta);
};

//
// ### @private function _log (namespace, level, msg, meta)
// #### @namespace {string} Namespace of the logger to use
// #### @level {string} Log level of the message.
// #### @msg {string} Message to log.
// #### @meta {Object} Metadata to log.
// Logs `msg` and `meta` to a logger at `namespace` at
// the specified `level`.
//
log._log = function (namespace, level, msg, meta) {
  var logger = this.log.get(namespace);
  
  if (!logger[level]) {
    level = 'info';
  }
  
  logger[level](msg, meta);
  this.emit(['broadway', 'logged'], level, msg, meta);
};