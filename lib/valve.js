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
    validators = require('./validators'),
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
    validator(memo, baton, function(err, result) {
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
  }

  async.reduce(funs, value, _reduce, callback);
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

    if (addr6.error) {
      throw new Error(addr6.error);
    }

    return addr6.canonicalForm();
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
  this._validatorCount = 0;
};


/**
 * Return validator position in the chain if validation exists, -1 otherwise.
 * Note: Position denotes actual position when the validator has been added
 * to the chain.
 *
 * @param {String} name Validator name.
 * @return {Number}
 */
Chain.prototype.getValidatorPos = function(name) {
  var i, len, validator;

  for (i = 0, len = this.validators.length; i < len; i++) {
    validator = this.validators[i];

    if (validator.name === name) {
      return validator.pos;
    }
  }

  return -1;
};


/**
 * Return true if the validation is present in the chain, false otherwise.
 * *
 * @param {String} name Validator name.
 * @return {Boolean}
 */
Chain.prototype.hasValidator = function(name) {
  return (this.getValidatorPos(name) >= 0);
};


/**
 * Return validator at the specified position.
 *
 * @param {String} name Validator name.
 * @return {Object|null} Validator object or null if not found.
 */
Chain.prototype.getValidatorAtPos = function(pos) {
  var i, len, validator;

  for (i = 0, len = this.validators.length; i < len; i++) {
    validator = this.validators[i];

    if (validator.pos === pos) {
      return validator;
    }
  }

  return null;
};


/**
 * Add a validator to the end of the array and increase the counter.
 * @param {Object} validator Validator.
 */
Chain.prototype._pushValidator = function(validator) {
  validator.pos = this._validatorCount;
  this.validators.push(validator);
  this._validatorCount++;
};


/**
 * Add a validator at the beginning of the array and increase the counter.
 * @param {Object} validator Validator.
 */
Chain.prototype._unshiftValidator = function(validator) {
  validator.pos = this._validatorCount;
  this.validators.unshift(validator);
  this._validatorCount++;
};


/**
 * An internal list of custom validators.
 *
 * @private
 */
var customValidators = {};


/**
 * Adds a validator to the chain to ensure that the provided are has no
 * duplicates.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isUnique = function() {
  this._pushValidator({
    name: 'isUnique',
    func: function(value, baton, callback) {
      var i, item, seen = {};

      if (!(value instanceof Array)) {
        callback('value must be an array');
        return;
      }

      for (i = 0; i < value.length; i++) {
        item = value[i];

        if (seen.hasOwnProperty(item)) {
          callback('item ' + item + ' is repeated more then once');
          return;
        }
        else {
          seen[item] = true;
        }
      }

      callback(null, value);
    },
    help: null
  });
  return this;

};


/**
 * Adds a validator to the chain which removes all the duplicates from an array.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.toUnique = function() {
  this._pushValidator({
    name: 'toUnique',
    func: function(value, baton, callback) {
      var i, item, seen = {}, result = [];

      if (!(value instanceof Array)) {
        callback('value must be an array');
        return;
      }

      for (i = 0; i < value.length; i++) {
        item = value[i];

        if (!seen.hasOwnProperty(item)) {
          seen[item] = true;
          result.push(item);
        }
      }

      callback(null, result);
    },
    help: null
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data is a
 * non-blacklisted IP address.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.notIPBlacklisted = function() {
  this._pushValidator({
    name: 'notIPBlacklisted',
    func: function(value, baton, callback) {
      var ipVersion,
          i,
          l,
          r,
          blacklisted;

      ipVersion = net.isIP(value);
      if (!ipVersion) {
        callback('Invalid IP');
        return;
      }

      for (i = 0; i < ipBlacklist[ipVersion].length; i = i + 1) {
        try {
          blacklisted = ipBlacklist[ipVersion][i].isInCIDR(value);
        }
        catch (e) {
          callback(e.message);
          return;
        }

        if (blacklisted) {
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
  this._pushValidator({
    name: 'isCIDR',
    func: function(value, baton, callback) {
      var cidr,
          ipVersion,
          addr,
          subnetLength,
          normalized;
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

      try {
        normalized = normalizeIP(addr);
      }
      catch (e) {
        callback(e.message);
        return;
      }

      callback(null, normalized + '/' + subnetLength);
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
  this._pushValidator({
    name: 'isEmail',
    func: function(value, baton, callback) {
      try {
        check(value).isEmail();
      } catch (e) {
        callback(e.message);
        return;
      }

      callback(null, value);
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
  this._pushValidator({
    name: 'isUrl',
    func: function(value, baton, callback) {
      try {
        check(value).isUrl();
      } catch (e) {
        callback(e.message);
        return;
      }

      callback(null, value);
    },
    help: 'URL'
  });
  return this;
};


/*
 * Adds a validator to the chain to ensure that the validated data is a
 * valid-looking IPv4 or IPv6 address.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isAddressPair = function() {
  this._pushValidator({
    name: 'isAddressPair',
    func: function(value, baton, callback) {
      var idx = value.lastIndexOf(':'),
          ip, port, cleaned;

      if (idx === -1) {
        callback('Missing semicolon (:) Address must be in the following ' +
                 'format - ip:port');
        return;
      }

      ip = value.slice(0, idx);
      port = value.slice(idx + 1);

      try {
        check(ip).isIP();
      } catch (e1) {
        callback('IP address in the address pair is not valid');
        return;
      }

      try {
        port = validators.isPort(port, baton);
      } catch (e2) {
        callback('Port in the address pair is out of range [1,65535]');
        return;
      }

      try {
        cleaned = normalizeIP(ip) + ':' + port;
      }
      catch (e) {
        callback(e.message);
        return;
      }

      callback(null, cleaned);
    },
    help: 'ip:port pair'
  });
  return this;
};

/**
 * Adds a validator to the chain to ensure that the validated data is a
 * valid-looking IPv4 or IPv6 address.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isIP = function() {
  this._pushValidator({
    name: 'isIP',
    func: function(value, baton, callback) {
      var ip;

      try {
        check(value).isIP();
        ip = normalizeIP(value);
      } catch (e) {
        callback(e.message);
        return;
      }

      callback(null, ip);
    },
    help: 'IPv4 or IPv6 address'
  });
  return this;
};

/**
 * Adds a validator to the chain to ensure that the validated data is a
 * valid-looking IPv4 address.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isIPv4 = function() {
  this._pushValidator({
    name: 'isIPv4',
    func: function(value, baton, callback) {
      var valid = net.isIPv4(value), normalized;

      if (!valid) {
        callback('Invalid IPv4');
        return;
      }

      try {
        normalized = normalizeIP(value);
      }
      catch (e) {
        callback(e.message);
        return;
      }

      callback(null, normalized);
    },
    help: 'IPv4 address'
  });
  return this;
};

/**
 * Adds a validator to the chain to ensure that the validated data is a
 * valid-looking IPv6 address.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isIPv6 = function() {
  this._pushValidator({
    name: 'isIPv6',
    func: function(value, baton, callback) {
      var valid = net.isIPv6(value), normalized;

      if (!valid) {
        callback('Invalid IPv6');
        return;
      }

      try {
        normalized = normalizeIP(value);
      }
      catch (e) {
        callback(e.message);
        return;
      }

      callback(null, normalized);
    },
    help: 'IPv4 address'
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
  this._pushValidator({
    name: 'isAlpha',
    func: function(value, baton, callback) {
      try {
        check(value).isAlpha();
      } catch (e) {
        callback(e.message);
        return;
      }

      callback(null, value);
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
  this._pushValidator({
    name: 'isAlphanumeric',
    func: function(value, baton, callback) {
      try {
        check(value).isAlphanumeric();
      } catch (e) {
        callback(e.message);
        return;
      }

      callback(null, value);
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
  this._pushValidator({
    name: 'isNumeric',
    func: function(value, baton, callback) {
      try {
        check(value).isNumeric();
      } catch (e) {
        callback(e.message);
        return;
      }

      callback(null, value);
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
  this._pushValidator({
    name: 'isInt',
    func: function(value, baton, callback) {
      try {
        check(value).isInt();
      } catch (e) {
        callback(e.message);
        return;
      }

      callback(null, value);
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
  this._pushValidator({
    name: 'isLowercase',
    func: function(value, baton, callback) {
      try {
        check(value).isLowercase();
      } catch (e) {
        callback(e.message);
        return;
      }

      callback(null, value);
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
  this._pushValidator({
    name: 'isUppercase',
    func: function(value, baton, callback) {
      try {
        check(value).isUppercase();
      } catch (e) {
        callback(e.message);
        return;
      }

      callback(null, value);
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
  this._pushValidator({
    name: 'isDecimal',
    func: function(value, baton, callback) {
      try {
        check(value).isDecimal();
      } catch (e) {
        callback(e.message);
        return;
      }

      callback(null, value);
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
  this._pushValidator({
    name: 'isFloat',
    func: function(value, baton, callback) {
      try {
        check(value).isFloat();
      } catch (e) {
        callback(e.message);
        return;
      }

      callback(null, value);
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
  this._pushValidator({
    name: 'notNull',
    func: function(value, baton, callback) {
      try {
        check(value).notNull();
      } catch (e) {
        callback(e.message);
        return;
      }

      callback(null, value);
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
  this._pushValidator({
    name: 'isNull',
    func: function(value, baton, callback) {
      try {
        check(value).isNull();
      } catch (e) {
        callback(e.message);
        return;
      }

      callback(null, value);
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
  this._pushValidator({
    name: 'notEmpty',
    func: function(value, baton, callback) {
      try {
        check(value).notEmpty();
      } catch (e) {
        callback(e.message);
        return;
      }

      callback(null, value);
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
  this._pushValidator({
    name: 'equals',
    func: function(value, baton, callback) {
      try {
        check(value).equals(arg);
      } catch (e) {
        callback(e.message);
        return;
      }

      callback(null, value);
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
  this._pushValidator({
    name: 'contains',
    func: function(value, baton, callback) {
      try {
        check(value).contains(arg);
      } catch (e) {
        callback(e.message);
        return;
      }

      callback(null, value);
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
  this._pushValidator({
    name: 'notContains',
    func: function(value, baton, callback) {
      try {
        check(value).notContains(arg);
      } catch (e) {
        callback(e.message);
        return;
      }

      callback(null, value);
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
  var modifiersHelp = modifiers || '';
  this._pushValidator({
    name: 'regex',
    func: function(value, baton, callback) {
      try {
        check(value).regex(pattern, modifiers);
      } catch (e) {
        callback(e.message);
        return;
      }

      callback(null, value);
    },
    help: 'String matching the regex /' + pattern + '/' + modifiersHelp
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
  this._pushValidator({
    name: 'notRegex',
    func: function(value, baton, callback) {
      try {
        check(value).notRegex(pattern, modifiers);
      } catch (e) {
        callback(e.message);
        return;
      }

      callback(null, value);
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
  var v = {
    name: 'len',
    help: 'String between ' + min + ' and ' + max + ' characters long'
  };

  if (!max) {
    v.help = 'String longer than ' + min + ' characters';
    max = Infinity;
  }

  v.func = function(value, baton, callback) {
    try {
      check(value).len(min, max);
    } catch (e) {
      callback(e.message);
      return;
    }

    callback(null, value);
  };

  this._pushValidator(v);
  return this;
};


/**
 * Verify that the provided array or object has between min and max number of
 * elements.
 * @param {Number} min Minimum number of elements.
 * @param {Number} max Maximum number of elements.
 */
Chain.prototype.numItems = function(min, max) {
  var v = {
    name: 'numItems',
    help: 'Array or object with number of items between ' + min + ' and ' + max
  };

  if (!max) {
    v.help = 'Array or objects with at least ' + min + ' items';
    max = Infinity;
  }

  v.func = function(value, baton, callback) {
    var len;

    if (value instanceof Array) {
      len = value.length;
    }
    else {
      len = Object.keys(value).length;
    }

    if (len < min || len > max) {
      callback('Object needs to have between ' + min + ' and ' + max + ' items');
      return;
    }

    callback(null, value);
  };

  this._pushValidator(v);
  return this;
};


/**
 * Adds a validator to the chain to convert a string representation of
 * a fractional number to its numeric representation.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.toFloat = function() {
  this._pushValidator({
    name: 'toFloat',
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
  this._pushValidator({
    name: 'toInt',
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
  this._pushValidator({
    name: 'toBoolean',
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
  this._pushValidator({
    name: 'toBooleanStrict',
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
  this._pushValidator({
    name: 'entityDecode',
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
  this._pushValidator({
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
  this._pushValidator({
    name: 'trim',
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
  this._pushValidator({
    name: 'ltrim',
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
  this._pushValidator({
    name: 'rtrim',
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
  this._pushValidator({
    name: 'ifNull',
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
  this._pushValidator({
    name: 'css',
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
  this._pushValidator({
    name: 'enumerated',
    func: function(value, baton, callback) {
      if (map.hasOwnProperty(value)) {
        callback(null, map[value]);
      } else {
        callback("Invalid value '" + value + "'. Should be one of " +
                 "(" + Object.keys(map).join(', ') + ").");
      }
    },
    help: 'One of (' + Object.keys(map).join(', ') + ')'
  });
  return this;
};


/**
 * Adds a validator to the chain that verifies that a value is in the provided
 * array.
 *
 * @param {Array} array An array with valid values.
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.inArray = function(array) {
  this._pushValidator({
    name: 'inArray',
    func: function(value, baton, callback) {
      if (array.indexOf(value) !== -1) {
        callback(null, value);
      } else {
        callback("Invalid value '" + value + "'. Should be one of " +
                 "(" + array.join(', ') + ").");
      }
    },
    help: 'One of (' + array.join(', ') + ')'
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
  this._pushValidator({
    name: 'isString',
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
  this._pushValidator({
    name: 'isBoolean',
    func: function(value, baton, callback) {
      if (value === null || value === undefined) {
        callback('Not a boolean');
      } else if (value.toString().match(/^0$|^false$/i)) {
        callback(null, false);
      }
      else if(value.toString().match(/^1$|^true$/i)) {
        callback(null, true);
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
  this._pushValidator({
    name: 'range',
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
  this._unshiftValidator({
    name: 'optional',
    func: function(value, baton, callback) {
            callback(null, value);
          },
    help: 'Optional'
  });
  return this;
};


/**
 * Adds a validator to the chain that checks for valid port numbers.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isPort = function() {
  this._pushValidator({
    name: 'isPort',
    func: function(value, baton, callback) {
      try {
        value = validators.isPort(value, baton);
      } catch (e) {
        callback('Value out of range [1,65535]');
        return;
      }

      callback(null, value);
    },
    help: 'Integer between 1-65535 inclusive'
  });
  return this;
};


/**
 * Adds a validator to the chain that checks for valid UUIDs.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isUUID = function() {
  this._pushValidator({
    name: 'isUUID',
    func: function(str, callback) {
      try {
        str = validators.isUUID(str);
      } catch (e) {
        callback(e.message);
        return;
      }

      callback(null, str);
    },
    help: 'Something was not right'
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
  this._unshiftValidator({
    name: 'immutable',
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
  this._unshiftValidator({
    name: 'updateRequired',
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
  this._pushValidator({
    name: 'isArray',
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

  this._pushValidator({
    name: 'isHash',
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
  this._pushValidator(customValidators[name]);
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
                       message: 'Missing required key (' + key + ')' });
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

  if (!this.schema) {
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
        if (err instanceof Error) {
          throw new Error('err argument must be a swiz error object')
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
  if (!this.schema) {
    callback('no schema specified');
    return;
  }

  checkSchema(obj, this.schema, [], true, this.baton, callback);
};


/**
 * Can be used in conjunction with checkPartial to validate an update. Use
 * checkPartial as a first pass at validation, before loading data from the
 * database, etc. Once the object being updated has been retrieved, call
 * checkUpdate to verify that immutable fields are not changed and to trigger
 * the finalValidator to perform "whole object" verification.
 *
 * NOTE: currently immutability checking will only work with primitive values,
 * and will not recurse into nested schemas.
 * @param {Object} existing An object.
 * @param {Object} obj A partial update object.
 * @param {Function(err, cleaned)} callback A callback fired with (err, cleaned).
 */
Valve.prototype.checkUpdate = function(existing, obj, callback) {
  var key, chain, target,
      schema = this.schema,
      cleaned = {};

  if (!schema) {
    callback('no schema specified');
    return;
  }

  // Make sure no immutable fields are modified
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      chain = schema[key];

      // It is OK to pass in fields that aren't in the def here
      if (!chain) {
        continue;
      }

      target = chain.target || key;

      if (chain && chain.isImmutable && existing[target] !== obj[key]) {
        callback({
          key: key,
          parentKeys: [],
          message: 'Attempted to mutate immutable field'
        });
        return;
      }
    }
  }

  // Merge every defined field from existing and obj into a 'cleaned' hash
  for (key in schema) {
    if (schema.hasOwnProperty(key)) {
      chain = schema[key];
      target = chain.target || key;
      cleaned[key] = obj.hasOwnProperty(key) ? obj[key] : existing[target];
    }
  }

  if (this.finalValidator) {
    this.finalValidator.call(null, cleaned, function(err, finalCleaned) {
      if (err instanceof Error) {
        throw new Error('err argument must be a swiz error object')
      }
      callback(err, finalCleaned);
    });
  } else {
    callback(null, cleaned);
  }
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

  if (!schema) {
    schema = this.schema;
    if (!schema) {
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
 * Thus, here's a function that turns a swiz-style def into a
 * less verbose valve def.
 *
 * @param {Object} def swiz-style defs.
 * @return {Object} translated structure.
 */
exports.defToValve = function(def) {
  var validity = {}, obj, group, fields, i, leni, j, lenj, field, name;

  for (i = 0, leni = def.length; i < leni; i++) {
    obj = def[i];
    group = obj.name;
    fields = obj.fields;

    validity[group] = {};
    for (j = 0, lenj = fields.length; j < lenj; j++) {
      field = fields[j];
      name = field.name;

      if (field.ignorePublic === true) {
        continue;
      }
      else if (field.val) {
        validity[group][name] = field.val;
      }
      else {
        validity[group][name] = new Chain();
      }

      if (field.enumerated) {
        validity[group][name] = validity[group][name].enumerated(field.enumerated);
      }

      if (field.src) {
        validity[group][name].rename(field.src).optional();
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
