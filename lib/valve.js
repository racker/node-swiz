/*
 * @param {Object} schema The schema defining the test/conversion rules.
 *  Copyright 2011 Rackspace US, Inc.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

/* @fileOverview A JavaScript module for validating objects against
 * arbitrary schemas.
 *
 * A schema is an object whose keys correspond to required keys in each object
 * tested against it, and whose values are rules for ensuring the validity of
 * the object's value for that key.  You specify a schema either when creating
 * a new Valve object, or by calling Valve.setSchema().
 *
 * For example, if the key 'a' is present in the schema, the key 'a' will be
 * required in the tested object.  The value corresponding to key 'a'
 * in the object will then be tested against the validator Chain (and possibly
 * modified if the Chain's rules so specify) specified by the schema.
 *
 * Schemas may contain subschemas as well.
 *
 * @example
 * var Valve = require('swiz').Valve;
 * var Chain = require('swiz').Chain;
 *
 * var v = new Valve({
 *   a: new Chain().isInt(),
 *   b: new Chain().isIP()
 * });
 *
 * var obj = { a: 1, b: "1.2.3.4" };
 *
 * v.check(obj, function(err, cleaned) {
 *   if (err) {
 *     console.error(err);
 *   } else {
 *     console.log(cleaned);
 *   }
 * );
 *
 * // A more complex schema
 * v.setSchema({
 *   a: { b: { new Chain().notEmpty() } }
 * });
 */

var async = require('async'),
    sanitize = require('validator').sanitize,
    check = require('validator').check,
    net = require('net'),
    ipv6 = require('ipv6').v6,
    Cidr = require('./cidr').CIDR;


var ipBlacklist = {
  4: [new Cidr('192.168.0.0/16'),
       new Cidr('172.16.0.0/12'),
       new Cidr('10.0.0.0/8'),
       new Cidr('224.0.0.0/4'),
       new Cidr('127.0.0.0/8')],
  6: [new Cidr('fc00::0/7'),
       new Cidr('ff00::0/8'),
       new Cidr('ff00::0/12')]
};


/**
 * Tests the specified value against the validator chain, converting the
 * value if applicable.
 *
 * @private
 * @param {String|Number|Object} value The value to be tested.
 * @param {Chain} chain The validator chain against which the value will
 *  be tested.
 * @param {Function(err, result)} callback The callback that will be invoked
 *  with the "cleaned" (tested/converted) value.
 */
function checkChain(value, chain, baton, callback) {
  var funs = chain.validators.map(function(i) {
    return i.func;
  });

  function _reduce(memo, validator, callback) {
    validator(value, baton, function(err, result) {
      var message;
      if (err) {
        if (err.hasOwnProperty(message)) {
          message = err.message;
        } else {
          message = err;
        }
        callback(message);
      } else {
        callback(null, result);
      }
    });
  };

  async.reduce(funs, null, _reduce, callback);
}


/**
 * Returns an array of documentation strings for each validator in a chain.
 *
 * @private
 * @param {Chain} chain The validator chain.
 * @return {Array} An array of documentation strings.
 */
function chainHelp(chain) {
  return chain.validators.map(function(e) {
                                return e.help;
                              })
                         .filter(function(e) {
                                return e;
                              });
}


/**
 * A "better" typeof-like function that can distinguish between array and null
 * objects.  NOTE: This is a function, not an operator like "typeof".
 *
 * @private
 * @param {value} value an object.
 * @return {String} 'array' or 'null'.
 */
function typeOf(value) {
  var t = typeof(value);
  if (t === 'object') {
    if (value) {
      if (value instanceof Array) {
        t = 'array';
      }
    }
    else {
      t = 'null';
    }
  }
  return t;
}


/**
 * Normalize an IP address.  Expands "::" notation in IPv6 addresses and
 * zero-prefixes each component number (see ipv6.canonical_form()).
 *
 * @private
 * @param {string} addr to be normalized.
 * @return {string} Normalized address.
 */
function normalizeIP(addr) {
  if (net.isIP(addr) === 6) {
    var addr6 = new ipv6.Address(addr);
    return addr6.canonical_form();
  } else {
    return addr;
  }
}


/**
 * A validator chain object.  A new instance of this object must be placed at
 * head of the list of validator functions for each key in a Valve schema.
 *
 * @constructor
 * @return {Chain} A validator chain object.
 */
var Chain = function() {
  if (! (this instanceof Chain)) {
    return new Chain();
  }
  this.validators = [];
  this.target = null;
  this.isOptional = false;
  this.isImmutable = false;
  this.isUpdateRequired = false;
};


/**
 * An internal list of custom validators.
 *
 * @private
 */
var customValidators = {};


/**
 * Adds a validator to the chain to ensure that the validated data is a
 * non-blacklisted IP address.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.notIPBlacklisted = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      var ipVersion,
          i,
          l,
          r;
      ipVersion = net.isIP(value);
      if (!ipVersion) {
        callback('Invalid IP');
        return;
      }
      for (i = 0; i < ipBlacklist[ipVersion].length; i = i + 1) {
        if (ipBlacklist[ipVersion][i].isInCIDR(value)) {
          callback('IP is blacklisted');
          return;
        }
      }
      callback(null, value);
    },
    help: 'IP address (not blacklisted)'
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data is expressed
 * in valid CIDR notation.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isCIDR = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      var cidr,
          ipVersion,
          addr,
          subnetLength;
      cidr = value.split('/');
      if (cidr.length !== 2) {
        callback('Invalid CIDR (subnet) notation');
        return;
      }
      addr = cidr[0];
      ipVersion = net.isIP(addr);
      if (! ipVersion) {
        callback('Invalid IP');
        return;
      }
      subnetLength = parseInt(cidr[1], 10);
      if (subnetLength < 0 ||
          (ipVersion === 4 && subnetLength > 32) ||
          (ipVersion === 6 && subnetLength > 128)) {
        callback('Invalid subnet length');
        return;
      }
      callback(null, normalizeIP(addr) + '/' + subnetLength);
    },
    help: 'IPv4 or IPv6 subnet (CIDR notation)'
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data is a
 * valid-looking email address.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isEmail = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      try {
        check(value).isEmail();
        callback(null, value);
      } catch (e) {
        callback(e.message);
      }
    },
    help: 'Email address'
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data is a
 * valid-looking URL.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isUrl = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      try {
        check(value).isUrl();
        callback(null, value);
      } catch (e) {
        callback(e.message);
      }
    },
    help: 'URL'
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data is a
 * valid-looking IP address.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isIP = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      try {
        check(value).isIP();
        callback(null, normalizeIP(value));
      } catch (e) {
        callback(e.message);
      }
    },
    help: 'IP address'
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data is an
 * alphabetical string.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isAlpha = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      try {
        check(value).isAlpha();
        callback(null, value);
      } catch (e) {
        callback(e.message);
      }
    },
    help: 'Alphabetical string'
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data is an
 * alphanumeric string.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isAlphanumeric = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      try {
        check(value).isAlphanumeric();
        callback(null, value);
      } catch (e) {
        callback(e.message);
      }
    },
    help: 'Alphanumeric string'
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data (either a
 * number or string) contains only numbers.  If the validated data is a number,
 * it will be converted to a string.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isNumeric = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      try {
        check(value).isNumeric();
        callback(null, value);
      } catch (e) {
        callback(e.message);
      }
    },
    help: 'Whole number (may be zero padded)'
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data (either a
 * number or string) is an integer.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isInt = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      try {
        check(value).isInt();
        callback(null, value);
      } catch (e) {
        callback(e.message);
      }
    },
    help: 'Integer'
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data is a
 * lowercase string.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isLowercase = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      try {
        check(value).isLowercase();
        callback(null, value);
      } catch (e) {
        callback(e.message);
      }
    },
    help: 'Lowercase string'
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data is an
 * uppercase string.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isUppercase = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      try {
        check(value).isUppercase();
        callback(null, value);
      } catch (e) {
        callback(e.message);
      }
    },
    help: 'Uppercase string'
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data (either a
 * number or string) is a valid decimal number (fractions are permitted).  The
 * value will be converted to a string.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isDecimal = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      try {
        check(value).isDecimal();
        callback(null, value);
      } catch (e) {
        callback(e.message);
      }
    },
    help: 'Fractional number'
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data (either a
 * number or string) is a valid floating-point number (fractions are
 * permitted).  The value will be converted to a number.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isFloat = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      try {
        check(value).isFloat();
        callback(null, value);
      } catch (e) {
        callback(e.message);
      }
    },
    help: 'Fractional number'
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data is not null
 * or an empty string.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.notNull = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      try {
        check(value).notNull();
        callback(null, value);
      } catch (e) {
        callback(e.message);
      }
    },
    help: 'Non-null value'
  });
  return this;
};

/**
 * Adds a validator to the chain to ensure that the validated data is null or
 * an empty string.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isNull = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      try {
        check(value).isNull();
        callback(null, value);
      } catch (e) {
        callback(e.message);
      }
    },
    help: 'Null value or empty string'
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data is a string
 * that does not contain only whitespace.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.notEmpty = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      try {
        check(value).notEmpty();
        callback(null, value);
      } catch (e) {
        callback(e.message);
      }
    },
    help: 'Non-empty string'
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data is a equal
 * to (but not necessarily the same type as) the provided argument.
 *
 * @param {String|Number|Object} arg The value to compare against.
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.equals = function(arg) {
  this.validators.push({
    func: function(value, baton, callback) {
      try {
        check(value).equals(arg);
        callback(null, value);
      } catch (e) {
        callback(e.message);
      }
    },
    help: "String equal to '" + arg + "'"
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data contains the
 * provided argument as a substring.
 *
 * @param {String} arg A substring that the value must contain.
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.contains = function(arg) {
  this.validators.push({
    func: function(value, baton, callback) {
      try {
        check(value).contains(arg);
        callback(null, value);
      } catch (e) {
        callback(e.message);
      }
    },
    help: "String containing the substring '" + arg + "'"
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data does not
 * contain the provided argument as a substring.
 *
 * @param {String} arg A substring that the value must not contain.
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.notContains = function(arg) {
  this.validators.push({
    func: function(value, baton, callback) {
      try {
        check(value).notContains(arg);
        callback(null, value);
      } catch (e) {
        callback(e.message);
      }
    },
    help: "String not containing the substring '" + arg + "'"
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data matches the
 * regular expression provided in the argument.
 *
 * @param {String} pattern The regular expression against which the value must
 *  match.
 * @param {String} modifiers Optional regular expression modifiers (e.g., 's',
 *  'i', 'm').
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.regex = function(pattern, modifiers) {
  this.validators.push({
    func: function(value, baton, callback) {
      try {
        check(value).regex(pattern, modifiers);
        callback(null, value);
      } catch (e) {
        callback(e.message);
      }
    },
    help: 'String matching the regex /' + pattern + '/' + modifiers
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data matches the
 * regular expression provided in the argument.
 *
 * @param {String} pattern The regular expression against which the value must
 *  match.
 * @param {String} modifiers Optional regular expression modifiers (e.g., 's',
 *  'i', 'm').
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.is = Chain.prototype.regex;


/**
 * Adds a validator to the chain to ensure that the validated data does not
 * match the regular expression provided in the argument.
 *
 * @param {String} pattern The regular expression against which the value must
 *  not match.
 * @param {String} modifiers Optional regular expression modifiers (e.g., 's',
 *  'i', 'm').
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.notRegex = function(pattern, modifiers) {
  this.validators.push({
    func: function(value, baton, callback) {
      try {
        check(value).notRegex(pattern, modifiers);
        callback(null, value);
      } catch (e) {
        callback(e.message);
      }
    },
    help: 'String not matching the regex /' + pattern + '/' + modifiers
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data does not
 * match the regular expression provided in the argument.
 *
 * @param {String} pattern The regular expression against which the value must
 *  not match.
 * @param {String} modifiers Optional regular expression modifiers (e.g., 's',
 *  'i', 'm').
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.not = Chain.prototype.notRegex;


/**
 * Adds a validator to the chain to ensure that the length of the validated
 * data is between the minimum and maximum lengths provided in the arguments.
 * If no maximum length argument is provided, the length of validated data must
 * precisely match the minimum length.
 *
 * @param {Number} min The minimum length of the value.
 * @param {Number} max (Optional) The maximum length of the value.
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.len = function(min, max) {
  this.validators.push({
    func: function(value, baton, callback) {
      try {
        check(value).len(min, max);
        callback(null, value);
      } catch (e) {
        callback(e.message);
      }
    },
    help: 'String between ' + min + ' and ' + max + ' characters long'
  });
  return this;
};


/**
 * Adds a validator to the chain to convert a string representation of
 * a fractional number to its numeric representation.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.toFloat = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      callback(null, sanitize(value).toFloat());
    },
    help: null
  });
  return this;
};


/**
 * Adds a validator to the chain to convert a string representation of
 * a whole integer to its numeric representation.  Any fractional component
 * will be discarded.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.toInt = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      callback(null, sanitize(value).toInt());
    },
    help: null
  });
  return this;
};


/**
 * Adds a validator to the chain to convert the validated data to the Boolean
 * value true unless it is 0, '0', false, 'false', null, or its length is 0.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.toBoolean = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      callback(null, sanitize(value).toBoolean());
    },
    help: null
  });
  return this;
};


/**
 * Adds a validator to the chain to convert the validated data to the Boolean
 * value true only if it is 1, true, or 'true'.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.toBooleanStrict = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      callback(null, sanitize(value).toBooleanStrict());
    },
    help: null
  });
  return this;
};


/**
 * Adds a validator to the chain to convert HTML entities in the validated data
 * to their character representations.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.entityDecode = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      callback(null, sanitize(value).entityDecode());
    },
    help: null
  });
  return this;
};


/**
 * Adds a validator to the chain to encode qualifying character representations
 * in the validated data as HTML entities.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.entityEncode = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      callback(null, sanitize(value).entityEncode());
    },
    help: null
  });
  return this;
};


/**
 * Adds a validator to the chain to remove the specified leading and trailing
 * characters from the validated data.  If no argument is specified, whitespace
 * will be removed by default.
 *
 * @param {String} chars (Optional) A list of characters to be removed
 *  (default: whitespace).
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.trim = function(chars) {
  this.validators.push({
    func: function(value, baton, callback) {
      callback(null, sanitize(value).trim(chars));
    },
    help: null
  });
  return this;
};


/**
 * Adds a validator to the chain to remove the specified leading characters
 * from the validated data.  If no argument is specified, whitespace will be
 * removed by default.
 *
 * @param {String} chars (Optional) A list of leading characters to be removed
 *  (default: whitespace).
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.ltrim = function(chars) {
  this.validators.push({
    func: function(value, baton, callback) {
      callback(null, sanitize(value).ltrim(chars));
    },
    help: null
  });
  return this;
};


/**
 * Adds a validator to the chain to remove the specified trailing characters
 * from the validated data.  If no argument is specified, whitespace will be
 * removed by default.
 *
 * @param {String} chars (Optional) A list of leading characters to be removed
 *  (default: whitespace).
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.rtrim = function(chars) {
  this.validators.push({
    func: function(value, baton, callback) {
      callback(null, sanitize(value).rtrim(chars));
    },
    help: null
  });
  return this;
};


/**
 * Adds a validator to the chain that will substitute a null value in the
 * validated data with the specified replacement.
 *
 * @param {String} replace The replacment string.
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.ifNull = function(replace) {
  this.validators.push({
    func: function(value, baton, callback) {
      callback(null, sanitize(value).ifNull(replace));
    },
    help: null
  });
  return this;
};


/**
 * Adds a validator to the chain that will remove common XSS attack vectors
 * from the validated data.
 *
 * @param {String} arg The string to be analyzed.
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.xss = function(arg) {
  this.validators.push({
    func: function(value, baton, callback) {
      callback(null, sanitize(value).xss(arg));
    },
    help: null
  });
  return this;
};


/**
 * Adds a validator to the chain that replaces enumerated values (keys in the
 * specified map) in the validated data with their replacements (values in the
 * specified map).
 *
 * @param {Object} map An enumeration map ({value : replacement}).
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.enumerated = function(map) {
  this.validators.push({
    func: function(value, baton, callback) {
      if (map.hasOwnProperty(value)) {
        callback(null, map[value]);
      } else {
        callback("Invalid value '" + value + "'");
      }
    },
    help: 'One of (' + Object.keys(map).join(', ') + ')'
  });
  return this;
};


/**
 * Adds a validator to the chain that ensures the validated data is
 * a string.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isString = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      if (typeOf(value) !== 'string') {
        callback('Not a string');
      } else {
        callback(null, value);
      }
    },
    help: 'String'
  });
  return this;
};


/**
 * Adds a validator for the chain that ensures the validated data is a boolean.
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isBoolean = function() {
  this.validators.push({
    func: function(value, baton, callback) {
      if (value.toString().match(/^0$|^false$/i)) {
        callback(null, 0);
      }
      else if(value.toString().match(/^1$|^true$/i)) {
        callback(null, 1);
      }
      else {
        callback('Not a boolean');
      }
    },
    help: 'Boolean'
  });
  return this;
};


/**
 * Adds a validator to the chain that ensures the validated data is
 * within the specified range.
 *
 * @param {Number|String} min The minimum permissible value.
 * @param {Number|String} max The maximum permissible value.
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.range = function(min, max) {
  this.validators.push({
    func: function(value, baton, callback) {
      if (value < min || value > max) {
        callback('Value out of range (' + min + '..' + max + ')');
      } else {
        callback(null, value);
      }
    },
    help: 'Value (' + min + '..' + max + ')'
  });
  return this;
};


/**
 * Adds a validator to the chain that marks the key in its schema as
 * optional: if the key is missing from the specified data, no error
 * will be returned.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.optional = function() {
  this.isOptional = true;
  this.validators.unshift({
    func: function(value, baton, callback) {
            callback(null, value);
          },
    help: 'Optional'
  });
  return this;
};


/**
 * Adds a validator to the chain that marks the key in its schema as
 * immutable: if the key is present in the partial check, an error will
 * be returned.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.immutable = function() {
  this.isImmutable = true;
  this.validators.unshift({
    func: function(value, baton, callback) {
            callback(null, value);
          },
    help: 'Immutable'
  });
  return this;
};


/**
 * Adds a validator to the chain that marks the key in its schema as
 * immutable: if the key is not present in the partial check, an error will
 * be returned.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.updateRequired = function() {
  this.isUpdateRequired = true;
  this.validators.unshift({
    func: function(value, baton, callback) {
            callback(null, value);
          },
    help: 'Required for update'
  });
  return this;
};


/**
 * Adds a validator to the chain that ensures the validated data is an
 * array.  Each member of the array will be tested/converted per
 * the specified validator chain.
 *
 * @param {Chain} chain A validator chain against which to test/convert each
 *  array member.
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isArray = function(chain) {
  var self = this;
  this.validators.push({
    func: function(value, baton, callback) {
      if (typeOf(value) !== 'array') {
        callback('Not an array');
        return;
      }
      async.map(value,
                function(item, itercb) {
                  checkChain(item, chain, baton, itercb);
                },
                callback);
    },
    help: 'Array [' + chainHelp(chain).join(',') + ']'
  });
  return this;
};


/**
 * Adds a validator to the chain that ensures the validated data is a
 * hash.  Each key and value of the hash will be tested/converted per
 * the specified validator chains.
 *
 * @param {Chain} keyChain A validator chain against which to test/convert
 *  each hash key.
 * @param {Chain} valueChain A validator chain against which to test/convert
 *  each hash value.
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isHash = function(keyChain, valueChain) {
  var self = this;
  var iter = function(baton) {
    return function(memo, item, callback) {
      // Special iterator for this validator: checks both the key and the value
      // (passed as a 2-elem array via 'item') against their respective
      // validation chains.  Updates the 'memo' object with the cleaned keys and
      // values.
      var key = item[0], value = item[1];
      checkChain(key, keyChain, baton, function(err, cleanedKey) {
        if (err) {
          callback('Key ' + key + ': ' + err);
        } else {
          checkChain(value, valueChain, baton, function(err, cleanedValue) {
            if (err) {
              callback("Value for key '" + key + "': " + err);
            }
            else {
              memo[cleanedKey] = cleanedValue;
              callback(null, memo);
            }
          });
        }
      });
    };
  };

  this.validators.push({
    func: function(value, baton, callback) {
      var key,
          kvpairs = [];
      if (typeOf(value) !== 'object') {
        callback('Not a hash');
        return;
      }
      for (key in value) {
        if (value.hasOwnProperty(key)) {
          kvpairs.push([key, value[key]]);
        }
      }
      async.reduce(kvpairs, {}, iter(baton), callback);
    },
    help: 'Hash [' + chainHelp(keyChain).join(',') + ':' +
                     chainHelp(valueChain).join(',') + ']'
  });
  return this;
};


/**
 * Adds a validator to the chain that reassigns the value for the
 * associated key to the target key.
 *
 * @param {String} target The new key to which the value will be assigned.
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.rename = function(target) {
  this.target = target;
  return this;
};


/**
 * Adds a previously-specified custom validator (see Valve.addValidator())
 * to the validator chain.
 *
 * @param {String} name The custom validator's name.
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.custom = function(name) {
  if (name === undefined) {
    throw new Error('Missing custom validator name');
  }
  if (! customValidators.hasOwnProperty(name)) {
    throw new Error("Unknown validator name '" + name + "'");
  }
  this.validators.push(customValidators[name]);
  return this;
};


/**
 * Tests/converts the specified object against the specified schema.
 *
 * @private
 * @param {Object} obj The object to be tested/converted.
 * @param {Object} schema The schema defining the test/conversion rules.
 * @param {Array} parentKeys The schema's parent keys (if this schema is a
 *  subschema).
 * @param {Boolean} isPartial true if a "partial" schema check is desired
 *  (missing keys in the object will be ignored if true).
 * @param {Function(err, result)} callback The callback that will be invoked
 *  with the "cleaned" (tested/converted) object.
 */
function checkSchema(obj, schema, parentKeys, isPartial, baton, callback) {
  var key,
      chain;

  async.reduce(Object.keys(schema), {}, function(cleanedObj,
                                                 key,
                                                 reduceCallback) {
    chain = schema[key];
    if (obj.hasOwnProperty(key)) {
      if (chain instanceof Chain) {
        if (chain.isImmutable && isPartial) {
          reduceCallback({ key: key,
                           parentKeys: parentKeys,
                           message: 'Attempted to mutate immutable key' });
        }
        checkChain(obj[key], chain, baton, function(err, cleanedValue) {
          var message;
          if (err) {
            if (err.hasOwnProperty(message)) {
              message = err.message;
            } else {
              message = err;
            }
            reduceCallback({ key: key,
                             parentKeys: parentKeys,
                             message: message });
          } else {
            if (chain.target !== null) {
              key = chain.target;
            }
            cleanedObj[key] = cleanedValue;
            reduceCallback(err, cleanedObj);
          }
        });
      } else {
        // Schema contains a subschema
        parentKeys.push(key);
        checkSchema(obj[key], chain, parentKeys, isPartial, baton,
                    function(err, cleanedValue) {
          if (err) {
            reduceCallback(err);
          } else {
            cleanedObj[key] = cleanedValue;
            reduceCallback(null, cleanedObj);
          }
        });
      }
    } else if ((isPartial && !chain.isUpdateRequired) || chain.isOptional) {
      reduceCallback(null, cleanedObj);
    } else {
      reduceCallback({ key: key,
                       parentKeys: parentKeys,
                       message: 'Missing required key' });
    }
  },
  callback
  );
}


/**
 * Creates a new Valve object.
 *
 * @constructor
 * @param {Object} schema The schema defining the test/conversion rules.
 */
var Valve = function(schema, /* optional */ baton) {
  if (! (this instanceof Valve)) {
    return new Valve();
  }
  this.schema = schema;
  this.baton = baton;
};


/**
 * Specifies the schema against which objects will be tested/converted.
 *
 * @param {Object} schema The schema defining the test/conversion rules.
 * @return {Valve} The Valve object.
 */
Valve.prototype.setSchema = function(schema) {
  this.schema = schema;
  return this;
};


/**
 * Adds a custom final validation function to the given Valve instance.  This
 * function will be called to validate the resulting "cleaned" object after all
 * Chain validators have been run, and only if no other errors have been
 * detected.  Such a function may be useful to validate the object where the
 * permissible value associated with one key depends upon the value associated
 * with a different key.
 *
 * @param {Function(obj, callback(err, cleaned))} func The validator
 *  function.  This function is passed the cleaned object and a callback
 *  which must be invoked when the function completes.  The callback must be
 *  invoked with an error string as its first argument (null if there was no
 *  error), and the "cleaned" value (either the original value, or a modified
 *  version) as its second argument.
 * @return {Valve} The Valve object.
 */
Valve.prototype.addFinalValidator = function(func) {
  if ((typeof func) !== 'function') {
    throw new Error('No validator function specified');
  }
  this.finalValidator = func;
  return this;
};

/**
 * Adds a custom validator to Valve under the given name.  This validator
 * may be added to a chain by calling Chain.custom(name).
 *
 * @param {String} name The name of the custom validator.
 * @param {String} description An optional description of the validator.
 * @param {Function(value, callback(err, cleaned))} func The validator
 *  function.  This function is passed a value to be tested, and a callback
 *  which must be invoked when the function completes.  The callback must be
 *  invoked with an error string as its first argument (null if there was no
 *  error), and the "cleaned" value (either the original value, or a modified
 *  version) as its second argument.
 */
Valve.addChainValidator = function(name, description, func) {
  if (typeof func !== 'function') {
    throw new Error('No validator function specified');
  }
  description = description ? description : '(help not found)';
  customValidators[name] = {
    'func': func,
    'help': description
  };
};


/**
 * Tests/converts ("cleans") an object against its schema.
 *
 * @param {Object} obj The object to be tested/converted.
 * @param {Function(err, result)} callback The callback that will be invoked
 *  with the "cleaned" (tested/converted) object.
 */
Valve.prototype.check = function(obj, callback) {
  // keep finalValidator in scope
  var finalValidator = this.finalValidator;

  if (! this.schema) {
    callback('no schema specified');
    return;
  }
  checkSchema(obj, this.schema, [], false, this.baton, function(err, cleaned) {
    if (err) {
      callback(err);
      return;
    }
    if (finalValidator) {
      finalValidator(cleaned, function(err, finalCleaned) {
        if (err) {
          err = { message: err };
        }
        callback(err, finalCleaned);
      });
    } else {
      callback(err, cleaned);
    }
  });
};


/**
 * Tests/converts ("cleans") an object against its schema.  Similar to
 * check() but is less strict: keys missing from the object will not
 * cause an error to be returned in the callback.
 *
 * @param {Object} obj The object to be tested/converted.
 * @param {Function(err, result)} callback The callback that will be invoked
 *  with the "cleaned" (tested/converted) object.
 */
Valve.prototype.checkPartial = function(obj, callback) {
  // keep finalValidator in scope
  var finalValidator = this.finalValidator;

  if (! this.schema) {
    callback('no schema specified');
    return;
  }
  checkSchema(obj, this.schema, [], true, this.baton, function(err, cleaned) {
    if (err) {
      callback(err);
      return;
    }
    if (finalValidator) {
      finalValidator(cleaned, function(err, finalCleaned) {
        if (err) {
          err = { message: err };
        }
        callback(err, finalCleaned);
      });
    } else {
      callback(err, cleaned);
    }
  });
};


/**
 * Returns an object containing an English description for each
 * key in the schema.
 *
 * @param {Object} schema A validation schema.
 * @return {Object} An object containing a description of the schema, indexed
 *  by key.
 */
Valve.prototype.help = function(schema) {
  var help = {},
      key,
      chain;

  if (! schema) {
    schema = this.schema;
    if (! schema) {
      throw new Error('No schema specified');
    }
  }
  for (key in schema) {
    if (schema.hasOwnProperty(key)) {
      chain = schema[key];
      help[key] = (chain instanceof Chain) ? chainHelp(chain) : this.help(
        chain);
    }
  }
  return help;
};


/** Make a valve lookup off of a swiz def
 *
 * As it turns out, swiz and valve view things slightly differently.
 * Swiz should be able to assign a structure to your serialization.
 * And this can sometimes mean that you want things in a particular
 * order.
 *
 * Valve, on the other hand, should never care about order.
 *
 * Thus, here's a function that turns a swiz-style array def into a
 * less verbose valve def.
 *
 * @param {Object} def swiz-style defs.
 * @return {Object} translated structure.
 */
exports.defToValve = function(def) {
  var validity = {}, propname, group, i, l;
  for (propname in def) {
    if (true) { // *sigh* lint
      group = propname;
      l = def[group].length;
      validity[group] = {};
      for (i = 0; i < l; i += 1) {
        if (def[group][i][1].hasOwnProperty('val')) {
          validity[group][def[group][i][0]] = def[group][i][1].val;
        } else if (def[group][i][1].hasOwnProperty('enumerated')) {
          validity[group][def[group][i][0]] =
              new Chain().enumerated(def[group][i][1].enumerated);
        } else {
          validity[group][def[group][i][0]] = new Chain();
        }
        if (def[group][i][1].hasOwnProperty('src')) {
          validity[group][def[group][i][0]].rename(def[group][i][1].src)
                                           .optional();
        }
      }
    }
  }
  return validity;
};


/**
 * Valve.
 */
exports.Valve = Valve;


/**
 * Chain.
 */
exports.Chain = Chain;
