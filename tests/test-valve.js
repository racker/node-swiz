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

var swiz = require('../lib/swiz');
var async = require('async');
var V = swiz.Valve;
var C = swiz.Chain;
var O = swiz.struct.Obj;
var F = swiz.struct.Field;

// Mock set of serialization defs
var def = [
  O('Node',
    {
      'fields': [
        F('id', {'src': 'hash_id', 'desc': 'hash ID for the node', 'attribute': true,
                 'val' : C().isString()}),
        F('is_active', {'src': 'active', 'desc': 'is the node active?',
                        'val' : C().toBoolean(), 'coerceTo' : 'boolean'}),
        F('name', {'src' : 'get_name', 'desc' : 'name', 'attribute': true,
                   'val' : C().isString()}),
        F('agent_name', {'val' : C().isString().notEmpty()}),
        F('ipaddress' , {'src' : 'get_public_address', 'val' : C().isIP()})
      ],
      'plural': 'nodes'
    }),

    O('Node2',
    {
      'fields': [
        F('id', {'src': 'hash_id', 'desc': 'hash ID for the node', 'attribute': true,
                 'val' : C().isString()}),
        F('is_active', {'src': 'active', 'desc': 'is the node active?',
                        'val' : C().toBoolean(), 'coerceTo' : 'boolean'}),
        F('name', {'src' : 'get_name', 'desc' : 'name', 'attribute': true,
                   'val' : C().isString()}),
        F('agent_name', {'val' : C().isString().notEmpty()}),
        F('state', {'enumerated' : {inactive: 0, active: 1, full_no_new_checks: 2}}),
        F('ipaddress' , {'src' : 'get_public_address', 'val' : C().isIP()})
      ],
      'plural': 'nodes'
    }),


  O('NodeOpts',
    {
      'fields': [
        F('option1', {'src': 'opt1', 'val' : C().isString()}),
        F('option2', {'src': 'opt2', 'val' : C().isString()}),
        F('option3', {'src': 'opt3', 'val' : C().isString()}),
      ]
    }),
];

var exampleNode = {
  'id' : 'xkCD366',
  'is_active' : true,
  'name' : 'exmample',
  'agent_name' : 'your mom',
  'ipaddress' : '42.24.42.24'
};

var exampleNode2 = {
  'id' : 'xkCD366',
  'is_active' : true,
  'name' : 'exmample',
  'agent_name' : 'your mom',
  'state': 'active',
  'ipaddress' : '42.24.42.24'
};

var compNode = {
  'hash_id' : 'xkCD366',
  'active' : true,
  'get_name' : 'exmample',
  'agent_name' : 'your mom',
  'get_public_address' : '42.24.42.24'
};

var badExampleNode = {
  'id' : 'xkCD366',
  'is_active' : true,
  'name' : 'exmample',
  'agent_name' : 'your mom',
  'ipaddress' : '42'
};

var badExampleNode1 = {
  'id' : 'xkCD366',
  'is_active' : true,
  'name' : 'exmample',
  'ipaddress' : '42.24.42.24'
};


exports['test_validate_numItems'] = function(test, assert) {
  var v1, v2, v3;

  v1 = new V({
    a: C().isArray(C().isInt()).numItems(1, 5)
  });

  v2 = new V({
    a: C().isHash(C().isString(), C().notEmpty()).numItems(1, 5)
  });

  v3 = new V({
    a: C().isArray(C().isInt()).numItems(2)
  });

  // Negative test cases (array)
  v1.check({'a': [1]}, function(err, cleaned) {
    assert.ifError(err);
  });

  v1.check({'a': [1, 2, 3, 4, 5]}, function(err, cleaned) {
    assert.ifError(err);
  });

  v3.check({'a': [1, 2]}, function(err, cleaned) {
    assert.ifError(err);
  });

  // Positive case (array)
  v3.check({'a': [1]}, function(err, cleaned) {
    assert.ok(err);
    assert.match(err.message, /Object needs to have between 2 and Infinity items/);
  });

  // Positive test cases (array)
  v1.check({'a': []}, function(err, cleaned) {
    assert.ok(err);
    assert.match(err.message, /Object needs to have between 1 and 5 items/);
  });

  v1.check({'a': [1, 2, 3, 4, 5, 6]}, function(err, cleaned) {
    assert.ok(err);
    assert.match(err.message, /Object needs to have between 1 and 5 items/);
  });

  // Negative test cases (object)
  v2.check({'a': {'a': 1}}, function(err, cleaned) {
    assert.ifError(err);
  });

  v2.check({'a': {'a': 1, 'b': 2, 'c': 3, 'd': 4, 'f': 5}}, function(err, cleaned) {
    assert.ifError(err);
  });

  // Positive test cases (object)
 v2.check({'a': {}}, function(err, cleaned) {
    assert.ok(err);
    assert.match(err.message, /Object needs to have between 1 and 5 items/);
  });

  v2.check({'a': {'a': 1, 'b': 2, 'c': 3, 'd': 4, 'f': 5, 'g': 6}}, function(err, cleaned) {
    assert.ok(err);
    assert.match(err.message, /Object needs to have between 1 and 5 items/);
  });

  test.finish();
};


exports['test_validate_int'] = function(test, assert) {
  var v = new V({
    a: C().isInt()
  });

  // positive case
  var obj = { a: 1 };
  var obj_ext = { a: 1, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'integer test');
  });

  obj = { a: '1' };
  obj_ext = { a: '1', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'integer test 2');
  });

  obj = { a: -17 };
  obj_ext = { a: -17, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'integer test 3');
  });

  // negative case
  var neg = { a: 'test' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid integer', 'integer test (negative case)');
  });

  test.finish();
};


exports['test_transformation_validator'] = function(test, assert) {
  var v = new V({
    a: C().isInt().toInt().optional()
  });

  var obj = { a: '10' };

  v.check(obj, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, {'a': 10});
    test.finish();
  });
};


exports['test_isUnique'] = function(test, assert) {
   var v = new V({
    a: C().isUnique()
  });

  // positive case
  var obj1 = { a: [1, 2, 3, 4, 5] };
  var obj2 = { a: [9, 2, 3, 4, 5] };

  v.check(obj1, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj1);
  });

  v.check(obj2, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj2);
  });

  // negative case
  var obj1Neg = { a: {} };
  var obj2Neg = { a: [2, 2, 3, 4, 5] };

  v.check(obj1Neg, function(err, cleaned) {
    assert.ok(err);
  });

  v.check(obj2Neg, function(err, cleaned) {
    assert.ok(err);
  });

  test.finish();
};


exports['test_toUnique'] = function(test, assert) {
   var v = new V({
    a: C().toUnique()
  });

  var failed = false;

  // positive case
  var obj1 = { a: [1, 2, 3, 4, 5] };
  var obj2 = { a: [9, 2, 3, 4, 5] };

  v.check(obj1, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj1);
  });

  v.check(obj2, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj2);
  });

  // negative case
  var obj1Neg = { a: {} };
  var obj2Neg = { a: [2, 2, 3, 3, 3, 3, 4, 5] };

  v.check(obj1Neg, function(err, cleaned) {
    assert.ok(err);
  });

  v.check(obj2Neg, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, {a: [2, 3, 4, 5]});
  });

  test.finish();
};


exports['test_validate_email'] = function(test, assert) {
  var v = new V({
    a: C().isEmail()
  });

  // positive case
  var obj = { a: 'test@cloudkick.com' };
  var obj_ext = { a: 'test@cloudkick.com', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'email test');
  });

  // negative case
  var neg = { a: 'invalidemail@' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid email', 'integer test (negative case)');
  });
  test.finish();
};

exports['test_validate_url'] = function(test, assert) {
  var v = new V({
    a: C().isUrl()
  });

  // positive case
  var obj = { a: 'http://www.cloudkick.com' };
  var obj_ext = { a: 'http://www.cloudkick.com', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'URL test');
  });

  // negative case
  var neg = { a: 'invalid/' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid URL', 'URL test (negative case)');
  });
  test.finish();
};

exports['test_validate_ipv6'] = function(test, assert) {
  var v = new V({
    a: C().isIPv6()
  });

  // positive case
  var obj = { a: '2001:0db8:0000:0000:0001:0000:0000:0001' };
  var obj_ext = { a: '2001:0db8:0000:0000:0001:0000:0000:0001', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'IPv6 test');
  });

  // negative case
  var neg = { a: '127.0.0.2' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid IPv6', 'IPv6 test (negative case)');
  });

  neg = {a: '12345' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid IPv6', 'IPv6 test (negative case 2)');
  });

  test.finish();
};
exports['test_validate_ipv4'] = function(test, assert) {
  var v = new V({
    a: C().isIPv4()
  });

  // positive case
  var obj = { a: '192.168.0.1' };
  var obj_ext = { a: '192.168.0.1', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'IP test');
  });

  // negative case
  var neg = { a: '2001:0db8:0000:0000:0001:0000:0000:0001' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid IPv4', 'IPv4 test (negative case)');
  });

  neg = {a: '12345' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid IPv4', 'IPv4 test (negative case 2)');
  });

  test.finish();
};

exports['test_validate_isAddressPair'] = function(test, assert) {
  var v = new V({
    a: C().isAddressPair()
  });
  var obj, obj_ext;

  // positive case 1
  obj = { a: '192.168.0.1:1111' };
  obj_ext = { a: '192.168.0.1:1111' };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'isAddressPair test');
  });

  // positive case 2
  obj = { a: '0000:0000:0000:0000:0000:0000:0000:0001:22222' };
  obj_ext = { a: '::1:22222' };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'isAddressPair test');
  });

  // negative case 1
  obj_ext = { a: '127.0.0.1' };
  v.check(obj_ext, function(err, cleaned) {
    assert.match(err.message, /Missing semicolon/);
  });

  // negative case 2
  obj_ext = { a: 'a.b:4444' };
  v.check(obj_ext, function(err, cleaned) {
    assert.match(err.message, /IP address in the address pair is not valid/);
  });

  // negative case 3
  obj_ext = { a: '127.0.0.1:444444' };
  v.check(obj_ext, function(err, cleaned) {
    assert.match(err.message, /Port in the address pair is out of range/);
  });

  test.finish();

// positive case 2
};

exports['test_validate_ip'] = function(test, assert) {
  var v = new V({
    a: C().isIP()
  });

  // positive case
  var obj = { a: '192.168.0.1' };
  var obj_ext = { a: '192.168.0.1', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'IP test');
  });

  // negative case
  var neg = { a: 'invalid/' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid IP', 'IP test (negative case)');
  });

  neg = {a: '12345' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid IP', 'IP test (negative case 2)');
  });

  // IPv6 normalization
  obj = { a: '2001:0db8:0000:0000:0001:0000:0000:0001' };
  obj_ext = { a: '2001:db8::1:0:0:1'};
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'IPv6 test and normalization');
  });
  test.finish();
};

exports['test_validate_ip_blacklist'] = function(test, assert) {
  var v = new V({
    a: C().isIP().notIPBlacklisted()
  });

  // positive case
  var obj_ext = { a: '173.45.245.32', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err, 'IP blacklist test');
  });

  // negative case
  var neg = { a: 'invalid/' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid IP', 'IP test (negative case 2)');
  });

  neg = { a: '192.168.0.1' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'IP is blacklisted', 'IP test (negative case 2)');
  });

  // IPv6
  obj_ext = { a: '2001:db8::1:0:0:1'};
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err, 'IPv6 blacklist test');
  });

  neg = {a: 'fc00:1:0:0:1' };
  v.check(neg, function(err, cleaned) {
    assert.match(err.message, /Incorrect number of groups found/, 'IP test (negative case 2)');
  });


  test.finish();
};


exports['test_validate_cidr'] = function(test, assert) {
  var v = new V({
    a: C().isCIDR()
  });

  // positive case
  var obj = { a: '192.168.0.1/2' };
  var obj_ext = { a: '192.168.0.1/2', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'CIDR test');
  });

  // negative case
  var neg = { a: 'invalid/' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid IP', 'CIDR test (negative case)');
  });

  neg = { a: '192.168.0.1/128' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid subnet length', 'CIDR test (negative case 2)');
  });

  // IPv6 normalization
  obj_ext = { a: '2001:db8::1:0:0:1/3'};
  obj = { a: '2001:0db8:0000:0000:0001:0000:0000:0001/3' };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'IPv6 CIDR test');
  });

  neg = { a: '2001:db8::1:0:0:1/194' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid subnet length', 'IPv6 CIDR test (negative case)');
  });

  test.finish();
};


exports['test_validate_alpha'] = function(test, assert) {
  var v = new V({
    a: C().isAlpha()
  });

  // positive case
  var obj = { a: 'ABC' };
  var obj_ext = { a: 'ABC', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'alpha test');
  });

  // negative case
  var neg = { a: 'invalid/' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid characters', 'alpha test (negative case)');
  });

  test.finish();
};


exports['test_validate_alphanumeric'] = function(test, assert) {
  var v = new V({
    a: C().isAlphanumeric()
  });

  // positive case
  var obj = { a: 'ABC123' };
  var obj_ext = { a: 'ABC123', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'alphanumeric test');
  });

  // negative case
  var neg = { a: 'invalid/' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid characters', 'alphanumeric test (negative case)');
  });

  test.finish();
};


exports['test_validate_numeric'] = function(test, assert) {
  var v = new V({
    a: C().isNumeric()
  });

  // positive case
  var obj = { a: '123' };
  var obj_ext = { a: 123, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'numeric test');
  });

  obj_ext = { a: '123', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'numeric test 2');
  });

  // negative case
  var neg = { a: '/' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid number', 'numeric test (negative case)');
  });
  neg = { a: 123.4 };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid number', 'numeric test (negative case 2)');
  });

  test.finish();
};


exports['test_validate_lowercase'] = function(test, assert) {
  var v = new V({
    a: C().isLowercase()
  });

  // positive case
  var obj = { a: 'abc' };
  var obj_ext = { a: 'abc', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'lowercase test');
  });

  // negative case
  var neg = { a: 'ABCabc' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid characters', 'lowercase test (negative case)');
  });

  test.finish();
};


exports['test_validate_uppercase'] = function(test, assert) {
  var v = new V({
    a: C().isUppercase()
  });

  // positive case
  var obj = { a: 'ABC' };
  var obj_ext = { a: 'ABC', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'uppercase test');
  });

  // negative case
  var neg = { a: 'ABCabc' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid characters', 'uppercase test (negative case)');
  });

  test.finish();
};


exports['test_validate_decimal'] = function(test, assert) {
  var v = new V({
    a: C().isDecimal()
  });

  // positive case
  var obj = { a: '123.123' };
  var obj_ext = { a: 123.123, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'decimal test');
  });

  obj = { a: '123.123' };
  obj_ext = { a: '123.123', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'decimal test 2');
  });

  obj = { a: '-123.123' };
  obj_ext = { a: -123.123, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'decimal test 3');
  });

  // negative case
  var neg = { a: 'ABCabc' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid decimal', 'decimal test (negative case)');
  });

  test.finish();
};


exports['test_validate_float'] = function(test, assert) {
  var v = new V({
    a: C().isFloat()
  });

  // positive case
  var obj = { a: 123.123 };
  var obj_ext = { a: 123.123, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'float test');
  });

  obj = { a: 123.123 };
  obj_ext = { a: '123.123', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'float test 2');
  });

  obj = { a: -123.123 };
  obj_ext = { a: '-123.123', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'float test 3');
  });

  // negative case
  var neg = { a: 'ABCabc' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid decimal', 'float test (negative case)');
  });

  test.finish();
};


exports['test_validate_notnull'] = function(test, assert) {
  var v = new V({
    a: C().notNull()
  });

  // positive case
  var obj = { a: '1' };
  var obj_ext = { a: '1', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'notNull test');
  });

  // negative case
  var neg = { a: '' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid characters', 'notNull test (negative case)');
  });

  test.finish();
};


exports['test_validate_notempty'] = function(test, assert) {
  var v = new V({
    a: C().notEmpty()
  });

  // positive case
  var obj = { a: '1' };
  var obj_ext = { a: '1', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'notEmpty test');
  });

  // negative case
  var neg = { a: '  ' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'String is empty', 'notEmpty test (negative case)');
  });

  test.finish();
};


exports['test_validate_regex'] = function(test, assert) {
  var v = new V({
    a: C().regex('^a$')
  });

  // positive case
  var obj = { a: 'a' };
  var obj_ext = { a: 'a', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'regex test');
  });

  // negative case
  var neg = { a: 'b' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid characters', 'regex test (negative case)');
  });

  test.finish();
};


exports['test_validate_notregex'] = function(test, assert) {
  var v = new V({
    a: C().notRegex(/e/)
  });

  // positive case
  var obj = { a: 'foobar' };
  var obj_ext = { a: 'foobar', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'notRegex test');
  });

  // negative case
  var neg = { a: 'cheese' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid characters', 'notRegex test (negative case)');
  });

  test.finish();
};


exports['test_validate_len'] = function(test, assert) {
  var v = new V({
    a: C().len(1, 2)
  });

  // positive case
  var obj = { a: '1' };
  var obj_ext = { a: '1', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'len test');
  });

  // negative case
  var neg = { a: '' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'String is too small', 'len test (negative case)');
  });

  neg = { a: 'abc' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'String is too large', 'len test (negative case 2)');
  });

  test.finish();
};


exports['test_validate_null'] = function(test, assert) {
  var v = new V({
    a: C().isNull()
  });

  // positive case
  var obj = { a: null };
  var obj_ext = { a: null, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'null test');
  });
  obj = { a: '' };
  obj_ext = { a: '', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'null test 2');
  });

  // negative case
  var neg = { a: 'not null' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid characters', 'null test (negative case)');
  });

  test.finish();
};


exports['test_validate_equals'] = function(test, assert) {
  var v = new V({
    a: C().equals(123)
  });

  // positive case
  var obj = { a: 123 };
  var obj_ext = { a: 123, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'equals test');
  });
  obj_ext = { a: '123' };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'equals test 2');
  });

  // negative case
  var neg = { a: 'not 123' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Not equal', 'equals test (negative case)');
  });

  test.finish();
};


exports['test_validate_notEmpty'] = function(test, assert) {
  var v = new V({
    a: C().notEmpty()
  });

  // positive case
  var obj = { a: 123 };
  var obj_ext = { a: 123, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'notEmpty test');
  });

  // negative case
  var neg = { a: '', b: 2 };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'String is empty', 'notEmpty test (negative case)');
  });

  test.finish();
};


exports['test_validate_missingKey'] = function(test, assert) {
  var v = new V({
    a: C().notEmpty()
  });

  // positive case
  var obj = { a: 123 };
  var obj_ext = { a: 123, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'missingKey test');
  });

  // negative case
  var neg = { b: 2 };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Missing required key (a)', 'missingKey test (negative case)');
  });

  test.finish();
};


exports['test_validate_contains'] = function(test, assert) {
  var v = new V({
    a: C().contains('abc')
  });

  // positive case
  var obj = { a: '0abc1'};
  var obj_ext = { a: '0abc1', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'contains test');
  });

  // negative case
  var neg = { a: '123' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid characters', 'contains test (negative case)');
  });

  test.finish();
};


exports['test_validate_not_contains'] = function(test, assert) {
  var v = new V({
    a: C().notContains('abc')
  });

  // positive case
  var obj = { a: '123'};
  var obj_ext = { a: '123', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'notContains test');
  });

  // negative case
  var neg = { a: 'abc' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid characters', 'notContains test (negative case)');
  });
  test.finish();
};


exports['test_validate_chain'] = function(test, assert) {
  var v = new V({
    a: C().len(1).isNumeric()
  });

  // positive case
  var obj = { a: '1' };
  var obj_ext = { a: '1', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'chained validator test');
  });

  // negative case
  var neg = { a: '' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'String is too small', 'notContains test (negative case)');
  });

  // negative case
  neg = { a: 'A' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid number', 'notContains test (negative case)');
  });

  test.finish();
};


exports['test_array_toInt'] = function(test, assert) {
  var v = new V({
    a: C().toInt()
  });

  // positive case
  var obj = { a: 1 };
  var obj_ext = { a: '1', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'array test');
  });

  obj = { a: NaN };
  obj_ext = { a: 'abc', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.ok(isNaN(cleaned.a), 'array test 2');
  });

  obj = { a: 1 };
  obj_ext = { a: '1.23', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'array test 3');
  });

  test.finish();
};


exports['test_array_tofloat'] = function(test, assert) {
  var v = new V({
    a: C().isArray(C().isFloat().toFloat())
  });

  // positive case
  var obj = { a: [3.145] };
  var obj_ext = { a: ['3.145'], b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'array toFloat test');
  });

  // negative case
  var neg = { a: 'abc' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Not an array', 'array toFloat test (negative case)');
  });

  // negative case
  neg = { a: ['abc', 'def'] };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid decimal', 'array toFloat test (negative case 2)');
  });

  test.finish();
};


exports['test_validate_string'] = function(test, assert) {
  var v = new V({
    a: C().isString()
  });

  // positive case
  var obj = { a: 'test' };
  var obj_ext = { a: 'test', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'string test');
  });

  // negative case
  var neg = { a: 123, b: 2 };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Not a string', 'string test (negative case)');
  });

  test.finish();
};

exports['test_validate_toBoolean'] = function(test, assert) {
  var v = new V({
    a: C().toBoolean()
  });

  // positive case
  var obj = { a: true };
  var obj_ext = { a: 'test', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'toBoolean test');
  });

  obj = { a: true };
  obj_ext = { a: true, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'toBoolean test 2');
  });

  obj = { a: true };
  obj_ext = { a: 1, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'toBoolean test 3');
  });

  obj = { a: false };
  obj_ext = { a: 'false', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'toBoolean test 4');
  });

  obj = { a: false };
  obj_ext = { a: 0, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'toBoolean test 5');
  });

  obj = { a: false };
  obj_ext = { a: '', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'toBoolean test 6');
  });

  obj = { a: false };
  obj_ext = { a: false, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'toBoolean test 7');
  });

  obj = { a: false };
  obj_ext = { a: null, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'toBoolean test 8');
  });

  test.finish();
};

exports['test_validate_toBooleanStrict'] = function(test, assert) {
  var v = new V({
    a: C().toBooleanStrict()
  });

  // positive case
  var obj = { a: false };
  var obj_ext = { a: 'test', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'toBooleanStrict test');
  });

  obj = { a: true };
  obj_ext = { a: true, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'toBooleanStrict test 2');
  });

  obj = { a: true };
  obj_ext = { a: 1, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'toBooleanStrict test 3');
  });

  obj = { a: true };
  obj_ext = { a: 'true', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'toBooleanStrict test 4');
  });

  obj = { a: false };
  obj_ext = { a: 'false', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'toBooleanStrict test 5');
  });

  obj = { a: false };
  obj_ext = { a: 0, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'toBooleanStrict test 6');
  });

  obj = { a: false };
  obj_ext = { a: '', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'toBooleanStrict test 7');
  });

  obj = { a: false };
  obj_ext = { a: false, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'toBooleanStrict test 8');
  });

  obj = { a: false };
  obj_ext = { a: null, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'toBooleanStrict test 9');
  });

  test.finish();
};

exports['test_validate_entityDecode'] = function(test, assert) {
  var v = new V({
    a: C().entityDecode()
  });

  // positive case
  var obj = { a: 'Smith & Wesson' };
  var obj_ext = { a: 'Smith &amp; Wesson', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'entityDecode test');
  });

  test.finish();
};

exports['test_validate_entityEncode'] = function(test, assert) {
  var v = new V({
    a: C().entityEncode()
  });

  // positive case
  var obj = { a: 'Smith &amp; Wesson' };
  var obj_ext = { a: 'Smith & Wesson', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'entityEncode test');
  });

  test.finish();
};

exports['test_validate_trim'] = function(test, assert) {
  var v = new V({
    a: C().trim()
  });

  // positive case
  var obj = { a: 'cheese' };
  var obj_ext = { a: ' cheese ', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'trim test');
  });

  v = new V({
    a: C().trim('QV')
  });

  obj = { a: 'cheese' };
  obj_ext = { a: 'VQQcheeseQQV', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'trim test 2');
  });

  obj = { a: 'AcheeseA' };
  obj_ext = { a: 'AcheeseA', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'trim test 2');
  });

  test.finish();
};


exports['test_validate_ltrim'] = function(test, assert) {
  var v = new V({
    a: C().ltrim()
  });

  // positive case
  var obj = { a: 'cheese ' };
  var obj_ext = { a: 'cheese ', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'ltrim test');
  });

  v = new V({
    a: C().ltrim('QV')
  });

  obj = { a: 'cheeseQQV' };
  obj_ext = { a: 'VQQcheeseQQV', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'ltrim test 2');
  });

  obj = { a: 'AcheeseA' };
  obj_ext = { a: 'AcheeseA', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'ltrim test 2');
  });

  test.finish();
};

exports['test_validate_rtrim'] = function(test, assert) {
  var v = new V({
    a: C().rtrim()
  });

  // positive case
  var obj = { a: ' cheese' };
  var obj_ext = { a: ' cheese ', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'rtrim test');
  });

  v = new V({
    a: C().rtrim('QV')
  });

  obj = { a: 'VQQcheese' };
  obj_ext = { a: 'VQQcheeseVQQ', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'rtrim test 2');
  });

  obj = { a: 'AcheeseA' };
  obj_ext = { a: 'AcheeseA', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'rtrim test 2');
  });

  test.finish();
};


exports['test_validate_ifNull'] = function(test, assert) {
  var v = new V({
    a: C().ifNull('foo')
  });

  // positive case
  var obj = { a: 'foo' };
  var obj_ext = { a: null, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'ifNull test');
  });
  test.finish();
};


exports['test_validate_nested_array'] = function(test, assert) {
  var v = new V({
    a: C().isArray(C().isString())
  });

  // positive case
  var obj = { a: ['test'] };
  var obj_ext = { a: ['test'], b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'array-of-strings test');
  });

  // negative case
  var neg = { a: 'abc' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Not an array', 'array-of-strings test (negative case)');
  });

  // negative case
  neg = { a: [1, 2] };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Not a string', 'array-of-strings test (negative case 2)');
  });

  test.finish();
};


exports['test_validate_nested_hash'] = function(test, assert) {
  var v = new V({
    a: C().isHash(C().isString(), C().isString())
  });

  // positive case
  var obj = { a: {'test' : 'test'} };
  var obj_ext = { a: {'test' : 'test'}, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'hash test');
  });

  // negative case
  var neg = { a: { 'test' : 123 } };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, "Value for key 'test': Not a string", 'hash test (negative case)');
  });

  test.finish();
};


exports['test_validate_enum'] = function(test, assert) {
  var v = new V({
        a: C().enumerated({inactive: 0, active: 1, full_no_new_checks: 2}).optional()
      }),
      obj = { a: 2 },
      obj_ext = { a: 'full_no_new_checks', b: 2 },
      neg = { a: 0 },
      obj2 = { };



  async.parallel([
    function pos1(callback) {
      // positive case
      v.check(obj_ext, function(err, cleaned) {
        assert.ifError(err);
        assert.deepEqual(cleaned, obj, 'enum test');
        callback();
      });
    },
    function neg1(callback) {
      // negative case 1
      v.check(neg, function(err, cleaned) {
        assert.match(err.message, /Invalid value '0'/, 'enum test (negative case 2)');
        callback();
      });
    },
    function pos2(callback) {
      // negative case 1
      v.check(obj2, function(err, cleaned) {
        assert.ifError(err);
        assert.deepEqual(cleaned, obj2);
        callback();
      });
    }
  ], function (err) {
    test.finish();
  });
};


exports['test_validate_enum_optional'] = function(test, assert) {
  var v = new V({
    a: C().enumerated({inactive: 0, active: 1, full_no_new_checks: 2})
  });

  // positive case
  var obj = { a: 2 };
  var obj_ext = { a: 'full_no_new_checks', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'enum test');
  });

  // negative case 1
  var neg = { a: 'bogus_key' };
  v.check(neg, function(err, cleaned) {
    assert.match(err.message, /Invalid value 'bogus_key'/, 'enum test (negative case 1)');
  });

  // negative case 2
  var neg = { a: 0 };
  v.check(neg, function(err, cleaned) {
    assert.match(err.message, /Invalid value '0'/, 'enum test (negative case 2)');
  });


  test.finish();
};


exports['test_validate_range'] = function(test, assert) {
  var v = new V({
    a: C().range(1, 65535)
  });

  // positive case
  var obj = { a: 500 };
  var obj_ext = { a: 500, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'range test (number)');
  });

  // negative case
  var neg = { a: 65536 };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, "Value out of range (1..65535)", 'range test (negative case)');
  });

  v = new V({
    a: C().range('a', 'c')
  });

  // positive case
  var obj = { a: 'b' };
  var obj_ext = { a: 'b', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'range test (string)');
  });
  test.finish();
};


exports['test_optional_fields'] = function(test, assert) {
  var v = new V({
    a: C().optional().range(1, 65535)
  });

  // positive case
  var obj = { a: 500 };
  var obj_ext = { a: 500, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'optional fields test');
  });

  // positive case
  obj = { };
  obj_ext = { b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'optional fields test (missing)');
  });

  // negative case
  var neg = { a: 65536 };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, "Value out of range (1..65535)", 'optional fields test (negative case)');
  });

  test.finish();
};


exports['test_nested_schemas'] = function(test, assert) {
  var v = new V({
    a: { b: C().optional().range(1, 65535) }
  });

  // positive case
  var obj = { a: { b: 500 } };
  var obj_ext = { a: { b: 500}, b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'nested schema test');
  });

  // negative case
  var neg = { a: { b: 65536} };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, "Value out of range (1..65535)", 'nested schema test (negative case)');
    assert.deepEqual(err.parentKeys, ['a'], 'nested schema test (negative case)');
  });

  test.finish();
};


exports['test_partial'] = function(test, assert) {
  var v = new V({
    a: C().isString(),
    b: C().isInt()
  });

  async.parallel([
    function(callback) {
      var obj = { a: 'foo', b: 1 };
      var obj_ext = { a: 'foo', b: 1 };
      v.checkPartial(obj_ext, function(err, cleaned) {
        assert.ifError(err);
        assert.deepEqual(cleaned, obj, 'checkPartial test');
        callback();
      });
    },

    function(callback) {
      var obj = { a: 'foo' };
      var obj_ext = { a: 'foo' };
      v.checkPartial(obj_ext, function(err, cleaned) {
        assert.ifError(err);
        assert.deepEqual(cleaned, obj, 'checkPartial test 2');
        callback();
      });
    }
  ],

  function(err) {
    assert.ifError(err);
    test.finish();
  });
};

exports['test_partial_update_required'] = function(test, assert) {
  var v = new V({
    a: C().isString(),
    b: C().updateRequired().isInt()
  });

  var neg = { a: 'foo' };
  v.checkPartial(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Missing required key (b)', 'partial update required');
    test.finish();
  });
};

exports['test_partial_immutable'] = function(test, assert) {
  var v = new V({
    a: C().isString(),
    b: C().immutable().isInt()
  });

  var neg = { a: 'bar', b: 1234 };
  v.checkPartial(neg, function(err, cleaned) {
    assert.ifError(err);

    var existing = { a: 'foo', b: 1233, c: 'hello world' };
    v.checkUpdate(existing, neg, function(err, cleaned) {
      assert.ok(err);
      assert.deepEqual(err.message, 'Attempted to mutate immutable field');
      assert.equal(err.key, 'b');
      assert.deepEqual(existing, {a: 'foo', b: 1233, c: 'hello world'});
      test.finish();
    });
  });
};


exports['test_partial_immutable_unchanged'] = function(test, assert) {
  var v = new V({
    a: C().isString(),
    b: C().immutable().isInt(),
    c: C().isString()
  });

  var neg = { a: 'bar', b: 1234 };
  v.checkPartial(neg, function(err, cleaned) {
    assert.ifError(err);

    var existing = { a: 'foo', b: 1234, c: 'hello world' };
    v.checkUpdate(existing, neg, function(err, cleaned) {
      assert.ok(!err);
      assert.deepEqual(cleaned, {
        a: 'bar',
        b: 1234,
        c: 'hello world'
      });
      assert.deepEqual(existing, {
        a: 'foo',
        b: 1234,
        c: 'hello world'
      });
      test.finish();
    });
  });
};


exports['test_custom'] = function(test, assert) {
  var description = 'Is the meaning of life';
  V.addChainValidator('isMeaningOfLife',
                 description,
                 function(value, baton, callback) {
                   assert.deepEqual(baton, 'aBaton');
                   if (value == 42) {
                     callback(null, 'forty-two');
                   } else {
                     callback('incorrect value');
                   }
                 });

  var v = new V({
    a: C().custom('isMeaningOfLife')
  });
  var obj = { a: 'forty-two' };
  var obj_ext = { a: 42, b: 'foo' };

  assert.deepEqual(v.help().a[0], description, 'custom help');

  v.baton = 'aBaton';
  v.check(obj_ext, function(err, cleaned) {
      assert.ifError(err);
      assert.deepEqual(cleaned, obj, 'custom test');
  });

  var neg = { a: 43 };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'incorrect value', 'custom test (negative case)');
  });

  assert.throws(function() {
                  var v = new V({
                    a: C().custom('bogus')
                  });
                },
                /Unknown validator name/,
                'custom test (unknown validator)');

  assert.throws(function() {
                  var v = new V({
                    a: C().custom()
                  });
                },
                /Missing/,
                'custom test (missing validator)');

  test.finish();
};

exports['test_custom_array_with_baton'] = function(test, assert) {
  var description = 'Is the meaning of life';
  V.addChainValidator('isMeaningOfLife',
                 description,
                 function(value, baton, callback) {
                   assert.deepEqual(baton, 'aBaton');
                   if (value == 42) {
                     callback(null, 'forty-two');
                   } else {
                     callback('incorrect value');
                   }
                 });

  var v = new V({
    a: C().optional().isArray(C().custom('isMeaningOfLife'))
  });
  var obj = { a: ['forty-two'] };
  var obj_ext = { a: [42], b: 'foo' };

  var neg = { a: [43] };
  v.baton = 'aBaton';
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'incorrect value', 'custom test (negative case)');
  });

  assert.throws(function() {
                  var v = new V({
                    a: C().custom('bogus')
                  });
                },
                /Unknown validator name/,
                'custom test (unknown validator)');

  assert.throws(function() {
                  var v = new V({
                    a: C().custom()
                  });
                },
                /Missing/,
                'custom test (missing validator)');

  test.finish();
};

exports['test_final'] = function(test, assert) {
  var v,
      finalValidator;

  v = new V({
    v4: C().optional(),
    v6: C().optional()
  });

  finalValidator = function(obj, callback) {
    if ((! obj.v4) && (! obj.v6)) {
      callback({
        key: 'v4',
        parentKeys: null,
        message: 'At least one of v4 or v6 must be specified'
      });
    } else
      callback(null, obj);
  };

  v.addFinalValidator(finalValidator);

  var obj = { v4: '1.2.3.4' };
  var obj_ext = { v4: '1.2.3.4', b: 'foo' };

  v.check(obj_ext, function(err, cleaned) {
      assert.ifError(err);
      assert.deepEqual(cleaned, obj, 'final validator test 1');
  });

  obj = { v6: '1.2.3.4' };
  obj_ext = { v6: '1.2.3.4', b: 'foo' };

  v.check(obj_ext, function(err, cleaned) {
      assert.ifError(err);
      assert.deepEqual(cleaned, obj, 'final validator test 2');
  });

  obj = { v4: '1.2.3.4', v6: '1.2.3.4' };
  obj_ext = { v4: '1.2.3.4', v6: '1.2.3.4', b: 'foo' };

  v.check(obj_ext, function(err, cleaned) {
      assert.ifError(err);
      assert.deepEqual(cleaned, obj, 'final validator test 3');
  });

  var neg = { b: 'foo' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message,
                     'At least one of v4 or v6 must be specified',
                     'final validator test (negative case)');
  });

  test.finish();
};

exports['test_schema_translation_1'] = function(test, assert) {
  var validity = swiz.defToValve(def),
      v = new V(validity.Node);
  assert.isDefined(validity.Node);
  assert.isDefined(validity.NodeOpts);

  v.check(exampleNode, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, compNode, 'schema translation');
    v.check(badExampleNode, function(err, cleaned) {

      assert.deepEqual(err.message, 'Invalid IP',
        'schama translation failure');
      test.finish();
    });
  });
};

exports['test_schema_translation_2'] = function(test, assert) {
  var validity = swiz.defToValve(def),
      v = new V(validity.Node);
  assert.isDefined(validity.Node);
  assert.isDefined(validity.NodeOpts);

  v.check(badExampleNode1, function(err, cleaned) {
    assert.deepEqual(err.message, 'Missing required key (agent_name)',
      'schama translation failure (missing agent_key)');
    test.finish();
  });
};

exports['test_schema_translation_enumerated'] = function(test, assert) {
  var validity = swiz.defToValve(def),
      v = new V(validity.Node2);

  v.check(exampleNode2, function(err, cleaned) {
    assert.ifError(err);
    assert.equal(cleaned.state, 1);
    test.finish();
  });
};


exports['test_roundtrip_json_swiz_valve'] = function(test, assert) {
  var validity = swiz.defToValve(def),
      v = new V(validity.Node),
      obj, sw = new swiz.Swiz(def);

  v.check(exampleNode, function(err, cleaned) {
    assert.ifError(err);
    obj = cleaned;
    obj.getSerializerType = function() {return 'Node';};
    sw.serialize(swiz.SERIALIZATION.SERIALIZATION_JSON, 1, obj,
      function(err, results) {
        assert.ifError(err);
        sw.deserialize(swiz.SERIALIZATION.SERIALIZATION_JSON, 1, results, function(err, newObj) {
          assert.deepEqual(newObj, exampleNode, 'Round trip json swiz/valve test');
          assert.ifError(err);
          test.finish();
        });
    });
  });
};



exports['test_roundtrip_xml_swiz_valve'] = function(test, assert) {
  var validity = swiz.defToValve(def),
      v = new V(validity.Node),
      obj, sw = new swiz.Swiz(def);

  v.check(exampleNode, function(err, cleaned) {
    assert.ifError(err);
    obj = cleaned;
    obj.getSerializerType = function() {return 'Node';};
    sw.serialize(swiz.SERIALIZATION.SERIALIZATION_XML, 1, obj,
      function(err, xml) {
        assert.ifError(err);
        sw.deserialize(swiz.SERIALIZATION.SERIALIZATION_XML, 1, xml, function(err, newObj) {
          assert.deepEqual(newObj, exampleNode, 'Round trip json swiz/valve test');
          assert.ifError(err);
          test.finish();
        });
    });
  });
};

exports['test_xml_with_whitespace'] = function(test, assert) {
  var validity = swiz.defToValve(def),
      v = new V(validity.Node),
      testxml,
      obj, sw = new swiz.Swiz(def);

  testxml = sw.deserializeXml('<?xml version="1.0" encoding="utf-8"?><node id="xkCD366" name="exmample"> <is_active>true</is_active><agent_name>your mom</agent_name><ipaddress>42.24.42.24</ipaddress></node>');
  v.check(testxml, function(err, cleaned) {
    assert.ifError(err);
    obj = cleaned;
    obj.getSerializerType = function() {return 'Node';};
    sw.serialize(swiz.SERIALIZATION.SERIALIZATION_XML, 1, obj,
      function(err, xml) {
        assert.ifError(err);
        sw.deserialize(swiz.SERIALIZATION.SERIALIZATION_XML, 1, xml, function(err, newObj) {
          assert.deepEqual(newObj, exampleNode, 'Round trip json swiz/valve test');
          assert.ifError(err);
          test.finish();
        });
    });
  });
};


exports['test_boolean'] = function(test, assert) {
  var v = new V({
    a: C().isBoolean()
  });

  // positive case
  var obj = { a: true };
  var obj_ext = { a: 1 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'boolean test');
  });

  // negative case
  var neg = { a: 'notFalse' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, "Not a boolean", 'boolean test');
  });

  test.finish();
};

exports['test_inArray'] = function(test, assert) {
  var v = new V({
    a: new C().inArray([1, 2, 3, 4, 5])
  });

  // positive case
  var pos = { a: 1 };
  v.check(pos, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, pos, 'isArray test');
  });

  // negative case
  var neg = { a: -1 };
  v.check(neg, function(err, cleaned) {
    assert.match(err.message, /Invalid value '-1'. Should be one of/, 'inArray test');
  });

  test.finish();
};

exports['test_port'] = function(test, assert) {
  var v = new V({
    a: new C().isPort()
  });

  // positive case
  var pos = { a: 1 };
  v.check(pos, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, pos, 'isPort test');
  });

  // negative case
  var neg = { a: -1 };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, "Value out of range [1,65535]", 'isPort test');
  });

  test.finish();
};


exports['test_V1UUID'] = function(test, assert) {
  var v = new V({
    a: new C().isV1UUID()
  });
  
  async.series([
    function(callback) {
      // positive case
      var pos = { a: '4b299c10-ab5a-11e1-9f6f-1c8b12469d15' };
      v.check(pos, function(err, cleaned) {
        assert.ifError(err);
        assert.deepEqual(cleaned, pos, 'isV1UUID test');
        callback();
      });
      
    },

    function(callback) {
      // negative case 0
      var neg0 = { a: 'b299c10-ab5a-11e1-9f6f-1c8b12469d15' };
      v.check(neg0, function(err, cleaned) {
        assert.deepEqual(err.message, "Invalid UUID", 'isV1UUID test');
        callback();
      });
    },

    function(callback) {
      // negative case 1
      var neg1 = { a: '4@299c10-ab5a-11e1-9f6f-1c8b12469d15' };
      v.check(neg1, function(err, cleaned) {
        assert.deepEqual(err.message, "Invalid UUID", 'isV1UUID test');
        callback();
      });
    },
    
    function(callback) {
      //negative case 2
      var neg2 = { a : '4b299c10-ab5a-11e1-4f6f-1c8b12469d15' };
      v.check(neg2, function(err, cleaned) {
        assert.deepEqual(err.message, "Unsupported UUID variant", 'isV1UUID test');
        callback();
      });
    },

    function(callback) {
      //negative case 3
      var neg3 = { a : '4b299c10-ab5a-21e1-9f6f-1c8b12469d15' };
      v.check(neg3, function(err, cleaned) {
        assert.deepEqual(err.message, "UUID is not version 1", 'isV1UUID test');
        callback();
      });
    }
  ], 
  function(err) {
    test.finish();
  });  
};

/*
exports['test_UUID'] = function(test, assert) {
  var v = new V({
      a: new C().isUUID()
  });
  
  //positive case
  var pos = { a: 'abcde012-Ab34-1D56-8FabC7892345' };
  v.check(pos, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, pos, 'isUUID test');
  });

  //negative case 1
  var neg1 = { a : 'ab@de012-Ab34-1D56-8FabC7892345' };
  v.check(neg1, function(err, cleaned) {
    assert.deepEqual(err.message, "Invalid UUID", 'isUUID test');
  });

  //negative case 2
  var neg2 = { a : 'abcde012-Ab34-1D56-4FabC7892345' };
  v.check(neg2, function(err, cleaned) {
    assert.deepEqual(err.message, "Unsupported UUID variant", 'isUUID test');
  });
  
  //negative case 3
  var neg3 = { a : 'abcde012-Ab34-2D56-8FabC7892345' };
  v.check(neg3, function(err, cleaned) {
    assert.deepEqual(err.message, "UUID is not version 1", 'isUUID test');
  });
  
  test.finish();
};
*/

exports['test_getValidatorPos_hasValidator_and_getValidatorAtPos'] = function(test, assert) {
  var v = new V({
    a: C().len(1).isNumeric(),
    b: C().len(1).isNumeric().optional()
  });

  assert.equal(v.schema.a.getValidatorPos('len'), 0);
  assert.equal(v.schema.a.getValidatorPos('isNumeric'), 1);
  assert.equal(v.schema.a.getValidatorPos('inArray'), -1);

  assert.ok(v.schema.a.hasValidator('len'));
  assert.ok(v.schema.a.hasValidator('isNumeric'));
  assert.ok(!v.schema.a.hasValidator('inArray'));

  assert.equal(v.schema.b.getValidatorPos('optional'), 2);
  assert.ok(v.schema.b.hasValidator('optional'));

  assert.equal(v.schema.b.getValidatorAtPos(2).name, 'optional');
  assert.equal(v.schema.b.getValidatorAtPos(6), null);

  test.finish();
};
