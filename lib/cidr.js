/*
 *  Copyright 2011 Rackspace
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

var Buffer = require('buffer').Buffer;

var Address4 = require('ip-address').Address4;
var Address6 = require('ip-address').Address6;

var BitBuffer = require('./bitbuffer').BitBuffer;


var generateCidrMask = function(b, slash) {
  var i, big = new BitBuffer(b);
  for (i = 0; i <= slash; i += 1) {
    big.setBit(i, big);
  }
  big.not();
  return big;
};

var generatePrefix = function(addr, mask) {
  var buf = new BitBuffer(addr);
  buf.and(mask);
  return buf;
};

var bigIntToByteArray = function(v, size) {
  var buf = new BitBuffer(size * 8), buf2 = new Buffer(v.toByteArray()),
      st, en;
  st = size - buf2.length;
  en = buf2.length - size;
  if (st < 0) {
    st = 0;
  }
  if (en < 0) {
    en = 0;
  }
  buf2.copy(buf.buf, st, en);
  return buf;

};

var makeAddr = function(ad, ver) {
  if (ver === 6) {
    var adr = new Address6(ad);

    if (adr.error) {
      throw new Error('Invalid IPv6: ' + ad);
    }

    return bigIntToByteArray(adr.bigInteger(), 16);
  } else {
    return new Buffer(ad.split('.'));
  }
};



/** The constructor for a CIDR class
 * @constructor
 *
 * Takes a string containing an IP and a slash... or both seperated
 * into two separate paramaters
 * @param {*} x first paramater.
 * @param {*} y second paramater.
 */
var CIDR = function(x, y) {
  var ip,
    bits,
    arr,
    ip4,
    ip6;
  if (y === undefined) { // handed a string
    arr = x.split('/');
    this.subnet = arr[1];
    ip = arr[0];
  } else {
    this.subnet = y;
    ip = x;
  }


  ip4 = (ip instanceof Address4 ? ip : new Address4(ip));
  ip6 = (ip instanceof Address6 ? ip : new Address6(ip));

  this.v = (ip4.valid ? 4 : (ip6.valid ? 6 : 0));

  if (this.v === 6) {
    bits = 128;
  } else {
    bits = 32;
  }
  ip = makeAddr(ip, this.v);

  this.mask = generateCidrMask(bits, bits - this.subnet - 1);
  this.prefix = generatePrefix(ip, this.mask);
};


/**
 * Is an IP address in a CIDR
 * @param {Object} x the IP to check against the CIDR.
 * @return {bool} if the address is within the CIDR.
 */
CIDR.prototype.isInCIDR = function(x) {
  var ver,
    buf1,
    ip4,
    ip6;

  ip4 = new Address4(x);
  ip6 = new Address6(x);
  ver = (ip4.valid ? 4 : (ip6.valid ? 6 : 0));

  if (ver !== this.v) {
    return false;
  }

  buf1 = new BitBuffer(makeAddr(x, this.v));
  buf1 = generatePrefix(buf1, this.mask);
  return buf1.cmp(this.prefix);
};


/**
 * The CIDR class
 */
exports.CIDR = CIDR;
