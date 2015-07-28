/*vrrc
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
    check = require('validator'),
    validators = require('./validators'),
    utils = require('./util'),
    net = require('net'),
    ipv6 = require('ipv6').v6,
    ipv4 = require('ipv6').v4,
    Cidr = require('./cidr').CIDR;

var entities = {
  '&nbsp;': '\u00a0',
  '&iexcl;': '\u00a1',
  '&cent;': '\u00a2',
  '&pound;': '\u00a3',
  '&curren;': '\u20ac',
  '&yen;': '\u00a5',
  '&brvbar;': '\u0160',
  '&sect;': '\u00a7',
  '&uml;': '\u0161',
  '&copy;': '\u00a9',
  '&ordf;': '\u00aa',
  '&laquo;': '\u00ab',
  '&not;': '\u00ac',
  '&shy;': '\u00ad',
  '&reg;': '\u00ae',
  '&macr;': '\u00af',
  '&deg;': '\u00b0',
  '&plusmn;': '\u00b1',
  '&sup2;': '\u00b2',
  '&sup3;': '\u00b3',
  '&acute;': '\u017d',
  '&micro;': '\u00b5',
  '&para;': '\u00b6',
  '&middot;': '\u00b7',
  '&cedil;': '\u017e',
  '&sup1;': '\u00b9',
  '&ordm;': '\u00ba',
  '&raquo;': '\u00bb',
  '&frac14;': '\u0152',
  '&frac12;': '\u0153',
  '&frac34;': '\u0178',
  '&iquest;': '\u00bf',
  '&Agrave;': '\u00c0',
  '&Aacute;': '\u00c1',
  '&Acirc;': '\u00c2',
  '&Atilde;': '\u00c3',
  '&Auml;': '\u00c4',
  '&Aring;': '\u00c5',
  '&AElig;': '\u00c6',
  '&Ccedil;': '\u00c7',
  '&Egrave;': '\u00c8',
  '&Eacute;': '\u00c9',
  '&Ecirc;': '\u00ca',
  '&Euml;': '\u00cb',
  '&Igrave;': '\u00cc',
  '&Iacute;': '\u00cd',
  '&Icirc;': '\u00ce',
  '&Iuml;': '\u00cf',
  '&ETH;': '\u00d0',
  '&Ntilde;': '\u00d1',
  '&Ograve;': '\u00d2',
  '&Oacute;': '\u00d3',
  '&Ocirc;': '\u00d4',
  '&Otilde;': '\u00d5',
  '&Ouml;': '\u00d6',
  '&times;': '\u00d7',
  '&Oslash;': '\u00d8',
  '&Ugrave;': '\u00d9',
  '&Uacute;': '\u00da',
  '&Ucirc;': '\u00db',
  '&Uuml;': '\u00dc',
  '&Yacute;': '\u00dd',
  '&THORN;': '\u00de',
  '&szlig;': '\u00df',
  '&agrave;': '\u00e0',
  '&aacute;': '\u00e1',
  '&acirc;': '\u00e2',
  '&atilde;': '\u00e3',
  '&auml;': '\u00e4',
  '&aring;': '\u00e5',
  '&aelig;': '\u00e6',
  '&ccedil;': '\u00e7',
  '&egrave;': '\u00e8',
  '&eacute;': '\u00e9',
  '&ecirc;': '\u00ea',
  '&euml;': '\u00eb',
  '&igrave;': '\u00ec',
  '&iacute;': '\u00ed',
  '&icirc;': '\u00ee',
  '&iuml;': '\u00ef',
  '&eth;': '\u00f0',
  '&ntilde;': '\u00f1',
  '&ograve;': '\u00f2',
  '&oacute;': '\u00f3',
  '&ocirc;': '\u00f4',
  '&otilde;': '\u00f5',
  '&ouml;': '\u00f6',
  '&divide;': '\u00f7',
  '&oslash;': '\u00f8',
  '&ugrave;': '\u00f9',
  '&uacute;': '\u00fa',
  '&ucirc;': '\u00fb',
  '&uuml;': '\u00fc',
  '&yacute;': '\u00fd',
  '&thorn;': '\u00fe',
  '&yuml;': '\u00ff',
  '&quot;': '\u0022',
  '&lt;': '\u003c',
  '&gt;': '\u003e',
  '&apos;': '\u0027',
  '&minus;': '\u2212',
  '&circ;': '\u02c6',
  '&tilde;': '\u02dc',
  '&Scaron;': '\u0160',
  '&lsaquo;': '\u2039',
  '&OElig;': '\u0152',
  '&lsquo;': '\u2018',
  '&rsquo;': '\u2019',
  '&ldquo;': '\u201c',
  '&rdquo;': '\u201d',
  '&bull;': '\u2022',
  '&ndash;': '\u2013',
  '&mdash;': '\u2014',
  '&trade;': '\u2122',
  '&scaron;': '\u0161',
  '&rsaquo;': '\u203a',
  '&oelig;': '\u0153',
  '&Yuml;': '\u0178',
  '&fnof;': '\u0192',
  '&Alpha;': '\u0391',
  '&Beta;': '\u0392',
  '&Gamma;': '\u0393',
  '&Delta;': '\u0394',
  '&Epsilon;': '\u0395',
  '&Zeta;': '\u0396',
  '&Eta;': '\u0397',
  '&Theta;': '\u0398',
  '&Iota;': '\u0399',
  '&Kappa;': '\u039a',
  '&Lambda;': '\u039b',
  '&Mu;': '\u039c',
  '&Nu;': '\u039d',
  '&Xi;': '\u039e',
  '&Omicron;': '\u039f',
  '&Pi;': '\u03a0',
  '&Rho;': '\u03a1',
  '&Sigma;': '\u03a3',
  '&Tau;': '\u03a4',
  '&Upsilon;': '\u03a5',
  '&Phi;': '\u03a6',
  '&Chi;': '\u03a7',
  '&Psi;': '\u03a8',
  '&Omega;': '\u03a9',
  '&alpha;': '\u03b1',
  '&beta;': '\u03b2',
  '&gamma;': '\u03b3',
  '&delta;': '\u03b4',
  '&epsilon;': '\u03b5',
  '&zeta;': '\u03b6',
  '&eta;': '\u03b7',
  '&theta;': '\u03b8',
  '&iota;': '\u03b9',
  '&kappa;': '\u03ba',
  '&lambda;': '\u03bb',
  '&mu;': '\u03bc',
  '&nu;': '\u03bd',
  '&xi;': '\u03be',
  '&omicron;': '\u03bf',
  '&pi;': '\u03c0',
  '&rho;': '\u03c1',
  '&sigmaf;': '\u03c2',
  '&sigma;': '\u03c3',
  '&tau;': '\u03c4',
  '&upsilon;': '\u03c5',
  '&phi;': '\u03c6',
  '&chi;': '\u03c7',
  '&psi;': '\u03c8',
  '&omega;': '\u03c9',
  '&thetasym;': '\u03d1',
  '&upsih;': '\u03d2',
  '&piv;': '\u03d6',
  '&ensp;': '\u2002',
  '&emsp;': '\u2003',
  '&thinsp;': '\u2009',
  '&zwnj;': '\u200c',
  '&zwj;': '\u200d',
  '&lrm;': '\u200e',
  '&rlm;': '\u200f',
  '&sbquo;': '\u201a',
  '&bdquo;': '\u201e',
  '&dagger;': '\u2020',
  '&Dagger;': '\u2021',
  '&hellip;': '\u2026',
  '&permil;': '\u2030',
  '&prime;': '\u2032',
  '&Prime;': '\u2033',
  '&oline;': '\u203e',
  '&frasl;': '\u2044',
  '&euro;': '\u20ac',
  '&image;': '\u2111',
  '&weierp;': '\u2118',
  '&real;': '\u211c',
  '&alefsym;': '\u2135',
  '&larr;': '\u2190',
  '&uarr;': '\u2191',
  '&rarr;': '\u2192',
  '&darr;': '\u2193',
  '&harr;': '\u2194',
  '&crarr;': '\u21b5',
  '&lArr;': '\u21d0',
  '&uArr;': '\u21d1',
  '&rArr;': '\u21d2',
  '&dArr;': '\u21d3',
  '&hArr;': '\u21d4',
  '&forall;': '\u2200',
  '&part;': '\u2202',
  '&exist;': '\u2203',
  '&empty;': '\u2205',
  '&nabla;': '\u2207',
  '&isin;': '\u2208',
  '&notin;': '\u2209',
  '&ni;': '\u220b',
  '&prod;': '\u220f',
  '&sum;': '\u2211',
  '&lowast;': '\u2217',
  '&radic;': '\u221a',
  '&prop;': '\u221d',
  '&infin;': '\u221e',
  '&ang;': '\u2220',
  '&and;': '\u2227',
  '&or;': '\u2228',
  '&cap;': '\u2229',
  '&cup;': '\u222a',
  '&int;': '\u222b',
  '&there4;': '\u2234',
  '&sim;': '\u223c',
  '&cong;': '\u2245',
  '&asymp;': '\u2248',
  '&ne;': '\u2260',
  '&equiv;': '\u2261',
  '&le;': '\u2264',
  '&ge;': '\u2265',
  '&sub;': '\u2282',
  '&sup;': '\u2283',
  '&nsub;': '\u2284',
  '&sube;': '\u2286',
  '&supe;': '\u2287',
  '&oplus;': '\u2295',
  '&otimes;': '\u2297',
  '&perp;': '\u22a5',
  '&sdot;': '\u22c5',
  '&lceil;': '\u2308',
  '&rceil;': '\u2309',
  '&lfloor;': '\u230a',
  '&rfloor;': '\u230b',
  '&lang;': '\u2329',
  '&rang;': '\u232a',
  '&loz;': '\u25ca',
  '&spades;': '\u2660',
  '&clubs;': '\u2663',
  '&hearts;': '\u2665',
  '&diams;': '\u2666'
};


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


var encode = function(str) {
  str = str.replace(/&/g, '&amp;');

  //IE doesn't accept &apos;
  str = str.replace(/'/g, '&#39;');

  //Encode literal entities
  for (var i in entities) {
    str = str.replace(new RegExp(entities[i], 'g'), i);
  }

  return str;
}

var decode = function (str) {
  if (!~str.indexOf('&')) return str;

  //Decode literal entities
  for (var i in entities) {
    str = str.replace(new RegExp(i, 'g'), entities[i]);
  }

  //Decode hex entities
  str = str.replace(/&#x(0*[0-9a-f]{2,5});?/gi, function (m, code) {
    return String.fromCharCode(parseInt(+code, 16));
  });

  //Decode numeric entities
  str = str.replace(/&#([0-9]{2,4});?/gi, function (m, code) {
    return String.fromCharCode(+code);
  });

  str = str.replace(/&amp;/g, '&');

  return str;
}


/**
 * Returns whether string a ends with string b.
 */
function endsWith(a, b) {
  return a.indexOf(b, a.length - b.length) !== -1;
}


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
 * Normalize an IP address.  Expands "::" notation in IPv6 addresses and
 * zero-prefixes each component number (see ipv6.canonical_form()).
 *
 * @private
 * @param {string} addr to be normalized.
 * @return {string} Normalized address.
 */
function normalizeIP(addr) {
  var claimsToBeIPv6 = /:/.test(addr);
  if(claimsToBeIPv6) {
    var ip6 = new ipv6.Address(addr);
    if(ip6.valid) {
      return ip6.canonicalForm();
    } else if(ip6.error) {
      throw new Error(ip6.error);
    } else {
      throw new Error("Unknown error while parsing IPv6 address.");
    }
  } else {
    var isIPv4 = false;
    try {
      var ip4 = new ipv4.Address(addr);
      isIPv4 = ip4.valid;
    }
    //  Any exception thrown implies not a valid IPv4 address.
    catch(error) {
      throw new Error("Unknown error while parsing IPv4 Address: "+error);
    }

    if(isIPv4) {
      return addr;
    }
    else {
      throw new Error("Unknown error while parsing IPv4 Address.");
    }
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
  this._numItemsValidator = null;
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
          blacklisted,
          ip6;

      ip6 = new ipv6.Address(value);
      ipVersion = (ip6.is4() ? 4 : (ip6.valid ? 6 : 0));

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
          ip6,
          normalized;
      cidr = value.split('/');
      if (cidr.length !== 2) {
        callback('Invalid CIDR (subnet) notation');
        return;
      }
      addr = cidr[0];


      ip6 = new ipv6.Address(addr);
      ipVersion = (ip6.is4() ? 4 : (ip6.valid ? 6 : 0));
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
      if (!check.isEmail(value)) {
        callback('Invalid email');
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
      if (!check.isURL(value)) {
        callback('Invalid URL');
        return;
      }
      callback(null, value);
    },
    help: 'URL'
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data is a
 * valid-looking URL.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isHttpUrl = function() {
  this._pushValidator({
    name: 'isUrl',
    func: function(value, baton, callback) {
      if (!check.isURL(value)) {
        callback('Invalid URL');
        return;
      } else if (!check.isURL(value, { protocols: ['http', 'https'], require_protocol: true })) {
        callback('Invalid URL.  URL must begin with http:// or https://.');
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
        ip6 = new ipv6.Address(ip);
        // not valid as ipv4 and not valid as ipv6
        if (!ip6.is4() && !ip6.valid) {
          throw new Error('Invalid IP');
        }
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
      var ip,
          ip6;
      if (!value || value === '' || typeof(value) !== 'string') {
        callback('IP address is not a string');
        return;
      }
      try {
        ip6 = new ipv6.Address(value);
        // not valid as ipv4 and not valid as ipv6
        if (!ip6.is4() && !ip6.valid) {
          throw new Error('Invalid IP');
        }
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
      var normalized,
        ip4 = new ipv4.Address(value),
        valid = ip4.valid;

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
      var ip6 = new ipv6.Address(value),
        valid = ip6.valid,
        normalized;

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
 * Adds a validator to the chain to ensure that the validated data is a
 * valid hostname or IPv4 / IPv6.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isHostnameOrIp = function() {
  this._pushValidator({
    name: 'isHostnameOrIp',
    func: function(value, baton, callback) {
      if (validators.isHostname(value) ||  value === 'localhost') {
        callback(null, value);
        return;
      }

      var ip = new ipv6.Address(value);
      if (ip.valid || ip.is4()) {
        callback(null, value);
        return;
      }

      callback('Not a valid hostname, IPv4 or IPv6 address');
    },
    help: 'Valid hostname, IPv4 or IPv6 address'
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data is a
 * non-blacklisted FQDN or an IPv4 / IPv6 address.
 * @param {?Array} blacklist An optional list of forbidden domains. For example,
 *                           if 'example.com' is provided, then 'foo.com' would
 *                           be allowed, but 'foo.example.com' and 'example.com'
 *                           would not be. Don't use a trailing dot in blacklist
 *                           values.
 */
Chain.prototype.isAllowedFQDNOrIP = function(blacklist) {
  var reserved = ['test', 'example', 'invalid', 'localhost', 'example.com', 'example.net', 'example.org'],
      blacklist = blacklist || [];

  this._pushValidator({
    name: 'isAllowedFQDNOrIp',
    func: function(value, baton, callback) {
      var normalized, i, ip;

      if (validators.isHostname(value)) {
        normalized = value.replace(/\.$/, '');

        if (normalized.indexOf('.') === -1) {
          callback('Domain name is not fully qualified.');
          return;
        }

        for (i = 0; i < reserved.length; i++) {
          if (normalized === reserved[i] || endsWith(normalized, '.' + reserved[i])) {
            callback('Reserved top level domain name');
            return;
          }
        }

        for (i = 0; i < blacklist.length; i++) {
          if (normalized === blacklist[i] || endsWith(normalized, '.' + blacklist[i])) {
            callback('Forbidden domain name');
            return;
          }
        }

        callback(null, value);
        return;
      }

      ip = new ipv6.Address(value);
      if (ip.valid || ip.is4()) {
        callback(null, value);
        return;
      }

      callback('Not a valid hostname, IPv4 or IPv6 address');
    },
    help: 'Valid FQDN, IPv4 or IPv6 address'
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data is a
 * valid hostname.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isHostname = function() {
  this._pushValidator({
    name: 'isHostname',
    func: function(value, baton, callback) {
      if (!validators.isHostname(value) && value !== 'localhost') {
        callback('Invalid hostname');
        return;
      }

      callback(null, value);
    },
    help: 'Valid hostname'
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
      if (!check.isAlpha(value)) {
        callback('Invalid characters');
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
      if(!check.isAlphanumeric(value)) {
        callback('Invalid characters');
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
      if(!check.isNumeric(value)) {
        callback('Invalid number');
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
      if (!check.isInt(value)) {
        callback('Invalid integer');
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
      if(!check.isLowercase(value)) {
        callback('Invalid characters');
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
      if(!check.isUppercase(value)) {
        callback('Invalid characters');
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
      if (!check.isFloat(value)) {
        callback('Invalid decimal');
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
      if(!check.isFloat(value)) {
        callback('Invalid decimal');
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
      if(check.isNull(value)) {
        callback('Invalid characters');
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
      if (check.isNull(value)) {
        callback(null, value);
      } else {
        callback('Invalid characters');
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
  this._pushValidator({
    name: 'notEmpty',
    func: function(value, baton, callback) {
      var regex = /^[\s\t\r\n]*$/;
      if (regex.test(value)) {
        callback('String is empty');
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
      if (!check.equals(value, arg)) {
        callback('Not equal');
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
      if(!check.contains(value, arg)) {
        callback('Invalid characters');
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
      if(value.indexOf(arg) >= 0) {
        callback('Invalid characters');
        return;
      }
      callback(null, value);
    },
    help: "String not containing the substring '" + arg + "'"
  });
  return this;
};


/**
 * Adds a validator to the chain to ensure that the validated data is not
 * located in the blacklisted values array. If a value passed to the validator
 * is an object it checks that the keys are not blacklisted.
 *
 * @param {Array} values Blacklisted values.
 * @param {Boolean} caseSensitive True if the check should be case sensitive.
 * Defaults to true.
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.notIn = function(values, caseSensitive) {
  if (caseSensitive === undefined) {
    caseSensitive = true;
  }

  this._pushValidator({
    name: 'notIn',
    func: function(value, baton, callback) {
      var type = utils.typeOf(value), keys, key, i;

      if (type === 'string' || type === 'number') {
        keys = [value];
      }
      else if (type === 'object') {
        keys = Object.keys(value);
      }
      else if (type === 'array') {
        keys = value;
      }
      else {
        keys = [value];
      }

      for (i = 0; i < keys.length; i++) {
        key = keys[i];

        if (!caseSensitive) {
          key = key.toLowerCase();
        }

        if (values.indexOf(key) !== -1) {
          callback('Value ' + key+ ' is blacklisted');
          return;
        }
      }

      callback(null, value);
    },

    help: 'A value which is not one of: ' + values.join(', ')
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
      if (!pattern) {
        throw new Error('No pattern provided');
      }
      if (typeof(pattern) === 'string') {
        pattern = new RegExp(pattern);
      }
      if (!pattern.test(value, modifiers)) {
        callback('Invalid characters');
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
      if(pattern.test(value, modifiers)) {
        callback('Invalid characters');
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
 * Adds a validator to the chain to ensure that the ength of the validated
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
    if(!check.isLength(value, min, max)) {
      callback('String is not in range' + ' (' + min + '..' + max + ')');
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

  if (this._numItemsValidator) {
    throw new Error('Chain can only have a single numItems validator');
  }

  this._numItemsValidator = {
    'min': min,
    'max': max
  }

  v.func = function(value, baton, callback) {
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
      callback(null, check.toFloat(value));
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
      callback(null, check.toInt(value));
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
      callback(null, check.toBoolean(value));
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
      callback(null, check.toBoolean(value, true));
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
      callback(null, decode(value));
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
    name: 'entityEncode',
    func: function(value, baton, callback) {
      callback(null, encode(value));
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
      callback(null, check.trim(value, chars));
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
      callback(null, check.ltrim(value, chars));
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
      callback(null, check.rtrim(value, chars));
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
      if (!value || value === '') {
        callback(null, replace);
      } else {
        callback(null, value);
      }
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
      if (utils.typeOf(value) !== 'string') {
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
Chain.prototype.isV1UUID = function() {
  this._pushValidator({
    name: 'isV1UUID',
    func: function(value, baton, callback) {
      try {
        value = validators.isV1UUID(value);
      } catch (e) {
        callback(e.message);
        return;
      }

      callback(null, value);
    },
    help: 'Version 1 UUID'
  });
  return this;
};


/**
 * Adds a validator to the chain that checks for valid v4 UUIDs.
 *
 * @return {Chain} The validator chain to which the validator was added.
 */
Chain.prototype.isV4UUID = function() {
  this._pushValidator({
    name: 'isV4UUID',
    func: function(value, baton, callback) {
      try {
        value = validators.isV4UUID(value);
      } catch (e) {
        callback(e.message);
        return;
      }

      callback(null, value);
    },
    help: 'Version 4 UUID'
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
      if (utils.typeOf(value) !== 'array') {
        callback('Not an array');
        return;
      }

      try {
        self._validateNumItems(value);
      }
      catch (e) {
        callback(e.message);
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

      if (utils.typeOf(value) !== 'object') {
        callback('Not a hash');
        return;
      }

      try {
        self._validateNumItems(value);
      }
      catch (e) {
        callback(e.message);
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

Chain.prototype._validateNumItems = function(value) {
  if (!this._numItemsValidator) {
    return;
  }

  validators.numItems(value, this._numItemsValidator.min,
                      this._numItemsValidator.max);
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
    if (chain.isOptional && obj[key] === null) {
      cleanedObj[key] = null;
      reduceCallback(null, cleanedObj);
    }
    else if (obj.hasOwnProperty(key)) {
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
    return new Valve(schema, baton);
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
 * @param {Object} _obj The object to be tested/converted.
 * @param {?Object} Options object with the following keys:
 * - strict - if true error will be passed to a callback
 * @param {Function(err, result)} callback The callback that will be invoked
 *  with the "cleaned" (tested/converted) object.
 */
Valve.prototype.check = function(_obj, options, callback) {
  // keep finalValidator in scope
  var finalValidator = this.finalValidator,
      objKeys,
      obj = _obj || {};

  // For backward compatibility, remove in next major release
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  else {
    options = options || {};
  }

  if (!this.schema) {
    callback('no schema specified');
    return;
  }

  if (options.strict) {
    for (key in obj) {
      if (obj.hasOwnProperty(key) && !this.schema.hasOwnProperty(key)) {
        callback({'key': key, 'message': 'This key is not allowed'});
        return;
      }
    }
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
    }
    else {
      callback(err, cleaned);
    }
  });
};


/**
 * Tests/converts ("cleans") an object against its schema.  Similar to
 * check() but is less strict: keys missing from the object will not
 * cause an error to be returned in the callback.
 *
 * @param {Object} _obj The object to be tested/converted.
 * @param {Function(err, result)} callback The callback that will be invoked
 *  with the "cleaned" (tested/converted) object.
 */
Valve.prototype.checkPartial = function(_obj, callback) {
  var obj = _obj || {};

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
        validity[group][name].rename(field.src);
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
