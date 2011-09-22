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

var swiz = require('swiz');
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
        F('ipaddress' , {'src' : 'get_public_address', 'val' : C().isIP()}),
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
    assert.deepEqual(err.message, 'Invalid IP', 'IP test (negative case 2)');
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
    a: C().enumerated({inactive: 0, active: 1, full_no_new_checks: 2})
  });

  // positive case
  var obj = { a: 2 };
  var obj_ext = { a: 'full_no_new_checks', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'enum test');
  });

  // negative case
  var neg = { a: 'bogus_key' };
  v.check(neg, function(err, cleaned) {
    assert.match(err.message, /Invalid value 'bogus_key'/, 'enum test (negative case)');
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

  var obj = { a: 'foo', b: 1 };
  var obj_ext = { a: 'foo', b: 1 };
  v.checkPartial(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'checkPartial test');
  });

  var obj = { a: 'foo' };
  var obj_ext = { a: 'foo' };
  v.checkPartial(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'checkPartial test 2');
  });

  test.finish();
};

exports['test_partial_update_required'] = function(test, assert) {
  var v = new V({
    a: C().isString(),
    b: C().updateRequired().isInt()
  });

  var neg = { a: 'foo' };
  v.checkPartial(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Missing required key (b)', 'partial update required');
  });

  test.finish();
};

exports['test_partial_immutable'] = function(test, assert) {
  var v = new V({
    a: C().isString(),
    b: C().immutable().isInt()
  });

  var neg = { a: 'foo', b: 1234 };
  v.checkPartial(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Attempted to mutate immutable key', 'partial immutable');
  });

  test.finish();
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
      callback('At least one of v4 or v6 must be specified');
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

exports['test_getValidatorPos_and_hasValidator'] = function(test, assert) {
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

  test.finish();
};
