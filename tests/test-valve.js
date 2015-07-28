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

// Useful utilities for oft-repeated inner functions in various checks.

function invalidIpFailMsgAsserter(assert, msg) {
  return function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid IP', msg);
  }
}

function equalAsserter(assert, expected, msg) {
  return function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, expected, msg);
  }
}

// Mock set of serialization defs
var def = [
  O('Node',
    {
      'fields': [
        F('id', {'src': 'hash_id', 'desc': 'hash ID for the node', 'attribute': true,
                 'val' : C().isString()}),
        F('label' , {'src' : 'name', 'val' : C().isString().optional()}),
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
  var v1, v2, v3, thrown = false;

  v1 = new V({
    a: C().isArray(C().isInt()).numItems(1, 5)
  });

  v2 = new V({
    a: C().isHash(C().isString(), C().notEmpty()).numItems(1, 5)
  });

  v3 = new V({
    a: C().isArray(C().isInt()).numItems(2)
  });

  try {
    new V({
      a: C().isArray(C().isInt()).numItems(2).numItems(2)
    });
  }
  catch (e) {
    thrown = true;
    assert.match(e.message, /single numItems validator/i);
  }

  if (!thrown) {
    assert.fail('numItems added multiple times, but exception wasnt thrown');
  }

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


exports['test_check_strict_mode'] = function(test, assert) {
  var v = new V({
    a: C().isInt()
  });

  async.series([
    function pos1(callback) {
      var obj = {'a': 5};
      v.check(obj, {'strict': true}, function(err, cleaned) {
        assert.ifError(err);
        callback();
      });
    },

    function neg1(callback) {
      var obj = {'a': 5, 'b': 5};
      v.check(obj, {'strict': true}, function(err, cleaned) {
        assert.ok(err);
        assert.equal(err.key, 'b');
        assert.match(err.message, /This key is not allowed/);
        callback();
      });
    }
  ],

  function(err) {
    test.finish();
  });
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

  // ftp test
  var ftp_url = { a: "ftp://rackspace.com" };
  v.check(ftp_url, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, ftp_url, 'FTP URL test');
  });

  // no protocol test
  var no_proto = { a: "rackspace.com" };
  v.check(no_proto, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, no_proto, "URL test with no protocol specified");
  });

  // negative case
  var neg = { a: 'invalid/' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid URL', 'URL test (negative case)');
  });
  test.finish();
};

exports['test_validate_http_url'] = function(test, assert) {
  var v = new V({
    a: C().isHttpUrl()
  });

  // positive case
  var obj = { a: 'http://www.cloudkick.com' };
  var obj_ext = { a: 'http://www.cloudkick.com', b: 2 };
  v.check(obj_ext, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, obj, 'URL test');
  });

  // ftp test
  var ftp_url = { a: 'ftp://rackspace.com' };
  v.check(ftp_url, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid URL.  URL must begin with http:// or https://.', 'HTTP URL test with FTP URL');
  });

  // no protocol test
  var no_proto = { a: 'rackspace.com' };
  v.check(no_proto, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid URL.  URL must begin with http:// or https://.', 'HTTP URL test with no protocol specified');
  });

  // negative case
  var neg = { a: 'invalid/' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'Invalid URL', 'HTTP URL test (negative case)');
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

exports['test_validate_hostname'] = function(test, assert) {
  var v = new V({
    a: C().isHostname()
  });

  // positive case
  var obj1 = { a: 'foo1-bar-2-ck.com' };
  var obj2 = { a: 'rackspace.com' };
  var obj3 = { a: 'www.osakeäly.fi' };
  var obj4 = { a: 'xn--kxae4bafwg.xn--pxaix.gr' };
  var obj5 = { a: 'localhost' };

  //negative case
  var nobj1 = { a: 'hostname.' };
  var nobj2 = { a: '-hostname.com' };
  var nobj3 = { a: 'www.labels-should-not-be-longer-than-63-characters-this-one-is-64-ch.ars-long.fail' };
  var nobj4 = { a: 'hostnames-should-also-never-be-longer.than-255-chars.even-if.each-one-of-their-labels' +
                    '-is.shorter-than-64-chars.this-is-going-to-be-a-long-long-string.so-long-that-it-may' +
                    'be-longer-than-the-golden-gate-bridge.let-me-count-this-again-to-make.sure.it-is256.yay' };
  var nobj5 = { a: ''};
  var nobj6 = { a: 'www..example.com'};
  var nobj7 = { a: 'ಠ_ಠ.net' };

  async.series([
    function pos1(callback) {
      v.check(obj1, function(err, cleaned) {
        assert.ifError(err);
        callback();
      });
    },

    function pos2(callback) {
      v.check(obj2, function(err, cleaned) {
        assert.ifError(err);
        callback();
      });
    },

    function pos3(callback) {
      v.check(obj3, function(err, cleaned) {
        assert.ifError(err);
        callback();
      });
    },

    function pos4(callback) {
      v.check(obj4, function(err, cleaned) {
        assert.ifError(err);
        callback();
      });
    },

    function pos5(callback) {
      v.check(obj5, function(err, cleaned) {
        assert.ifError(err);
        callback();
      });
    },

    function neg1(callback) {
      v.check(nobj1, function(err, cleaned) {
        assert.ok(err);
        callback();
      });
    },

    function neg2(callback) {
      v.check(nobj2, function(err, cleaned) {
        assert.ok(err);
        callback();
      });
    },

    function neg3(callback) {
      v.check(nobj3, function(err, cleaned) {
        assert.ok(err);
        callback();
      });
    },

    function neg4(callback) {
      v.check(nobj4, function(err, cleaned) {
        assert.ok(err);
        callback();
      });
    },

    function neg5(callback) {
      v.check(nobj5, function(err, cleaned) {
        assert.ok(err);
        callback();
      });
    },

    function neg6(callback) {
      v.check(nobj6, function(err, cleaned) {
        assert.ok(err);
        callback();
      });
    },

    function neg7(callback) {
      v.check(nobj7, function(err, cleaned) {
        assert.ok(err);
        callback();
      });
    }
  ],

  function(err) {
    test.finish();
  });
};

exports['test_isHostnameOrIp'] = function(test, assert) {
  var v = new V({
    a: C().isHostnameOrIp()
  });

  async.series([
    function pos1(callback) {
      var obj = { 'a': '127.0.0.1' };
      v.check(obj, function(err, cleaned) {
        assert.ifError(err);
        callback();
      });
    },

    function pos2(callback) {
      var obj = { 'a': '2001:0db8:0000:0000:0001:0000:0000:0001' };
      v.check(obj, function(err, cleaned) {
        assert.ifError(err);
        callback();
      });
    },

    function pos4(callback) {
      var obj = { 'a': 'github.com' };
      v.check(obj, function(err, cleaned) {
        assert.ifError(err);
        callback();
      });
    },

    function pos5(callback) {
      var obj = { 'a': 'localhost' };
      v.check(obj, function(err, cleaned) {
        assert.ifError(err);
        callback();
      });
    },

    function neg1(callback) {
      var neg = { a: 'hostname.' };
      v.check(neg, function(err, cleaned) {
        assert.ok(err);
        callback();
      });
    }
  ],

  function(err) {
    test.finish();
  });
};

exports['test_isAllowedFQDNOrIP'] = function(test, assert) {
  var v = new V({
    a: C().isAllowedFQDNOrIP(['not-allowed.com', 'not-allowed.org'])
  });

  async.series([
    function pos1(callback) {
      var obj = { 'a': '127.0.0.1' };
      v.check(obj, function(err, cleaned) {
        assert.ifError(err);
        callback();
      });
    },

    function pos2(callback) {
      var obj = { 'a': '2001:0db8:0000:0000:0001:0000:0000:0001' };
      v.check(obj, function(err, cleaned) {
        assert.ifError(err);
        callback();
      });
    },

    function pos4(callback) {
      var obj = { 'a': 'github.com' };
      v.check(obj, function(err, cleaned) {
        assert.ifError(err);
        callback();
      });
    },

    function pos5(callback) {
      // not-allowed.net _is_ allowed
      var obj = { 'a': 'not-allowed.net' };
      v.check(obj, function(err, cleaned) {
        assert.ifError(err);
        callback();
      });
    },

    function pos6(callback) {
      // this-is-not-allowed.com is also allowed
      var obj = { 'a': 'not-allowed.net' };
      v.check(obj, function(err, cleaned) {
        assert.ifError(err);
        callback();
      });
    },

    function neg1(callback) {
      var neg = { a: 'hostname.' };
      v.check(neg, function(err, cleaned) {
        assert.ok(err);
        callback();
      });
    },

    function neg2(callback) {
      var neg = { a: 'hostname' };
      v.check(neg, function(err, cleaned) {
        assert.ok(err);
        callback();
      });
    },

    function neg3(callback) {
      var neg = { a: 'not-allowed.com' };
      v.check(neg, function(err, cleaned) {
        assert.ok(err);
        callback();
      });
    },

    function neg4(callback) {
      var neg = { a: 'not-allowed.org' };
      v.check(neg, function(err, cleaned) {
        assert.ok(err);
        callback();
      });
    },

    function neg5(callback) {
      var neg = { a: 'foo.not-allowed.org' };
      v.check(neg, function(err, cleaned) {
        assert.ok(err);
        callback();
      });
    },

    function neg6(callback) {
      var neg = { a: 'example.org' };
      v.check(neg, function(err, cleaned) {
        assert.ok(err);
        callback();
      });
    },

    function neg7(callback) {
      var neg = { a: 'foo.example.org' };
      v.check(neg, function(err, cleaned) {
        assert.ok(err);
        callback();
      });
    },

    function neg8(callback) {
      var neg = { a: 'foo.test' };
      v.check(neg, function(err, cleaned) {
        assert.ok(err);
        callback();
      });
    },

    function neg9(callback) {
      var neg = { a: 'localhost' };
      v.check(neg, function(err, cleaned) {
        assert.ok(err);
        callback();
      });
    }
  ],

  function(err) {
    test.finish();
  });
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
  var invalidIpFailMsg = invalidIpFailMsgAsserter.bind(null, assert);
  var shouldEqual = equalAsserter.bind(null, assert);
  var v = new V({
    a: C().isIP()
  });

  // positive test cases
  v.check({a: '192.168.0.1', b: 2},
      shouldEqual({a: '192.168.0.1'}, 'isIP should accept dotted-quad syntax for IPv4 addresses'));

  var expected = { a: '2001:0db8:0000:0000:0001:0000:0000:0001' };

  v.check({a: '2001:0db8:0000:0000:0001:0000:0000:0001', b: 2},
      shouldEqual(expected , 'isIP should accept a coloned-octet syntax for IPv6 addresses'));

  v.check({a: '2001:0db8::0001:0000:0000:0001', b: 2},
      shouldEqual(expected, 'isIP should accept a shortened syntax for IPv6 addresses'));

  v.check({a: '2001:0db8:0000:0000:0001::0001', b: 2},
      shouldEqual(expected, 'isIP should accept a shortened syntax for IPv6 addresses'));

  v.check({a: '2001:db8:0:0:1:0:0:1', b: 2},
      shouldEqual(expected, 'isIP should accept a coloned-octet with leading zeros blanked for IPv6 addresses'));

  v.check({a: '2001:db8::1:0:0:1', b: 2},
      shouldEqual(expected, 'isIP should accept a shortened IPv6 address with leading zeros blanked.'));

  expected = { a: '0000:0000:0000:0000:0000:0000:7f00:0001' };

  v.check({a: '::7F00:0001', b: 2},
      shouldEqual(expected, 'isIP should accept an IPv6 address with capital letters'));

  v.check({a: '::127.0.0.1', b: 2},
      shouldEqual(expected, 'isIP should accept an embedded IPv4 address'));

  v.check({a: '1234::', b: 2},
      shouldEqual({a: '1234:0000:0000:0000:0000:0000:0000:0000'},
        'isIP should accept a tail-truncated address for IPv6 addresses'));

  v.check({a: '::1234', b: 2},
      shouldEqual({a: '0000:0000:0000:0000:0000:0000:0000:1234'},
        'isIP should accept a head-truncated address for IPv6 addresses'));

  v.check({a: '::', b: 2},
      shouldEqual({a: '0000:0000:0000:0000:0000:0000:0000:0000'},
        'isIP should accept a nil IPv6 address'));

  // negative test cases
  v.check({a: 'invalid/'}, invalidIpFailMsg('IP addresses cannot be strings'));
  v.check({a: '12345'}, invalidIpFailMsg('IP addresses cannot be single integers'));
  v.check({a: '2001:0db8::1::1'}, invalidIpFailMsg('IPv6 can only have at most one "::" symbol in it.'));
  v.check({a: '2001:0db8:0000:0000:0001:0000:0000'}, invalidIpFailMsg('IPv6 coloned-octet notation requires eight hex words.'));
  v.check({a: '2001:0db8::1:0:0:00001'}, invalidIpFailMsg('IPv6 hex groups can be at most 4 characters long.'));

  v.check({a: {b: null}}, function(err, unused) {
    assert.deepEqual(err.message, 'IP address is not a string', 'IP addresses cannot be null or JSON objects');
  });

  v.check({a: '2001:0db8:0:0:1:0:0:127.0.0.1'}, function(err, unused) {
   assert.deepEqual(err.message, 'Incorrect number of groups found', 'Malformed IPv6 address w/ embedded IPv4 address');
  });

  var stack_attack = "";
  var possible = "0123456789.:";
  for(var i=0; i < 1048576; i++) {
    stack_attack += possible.charAt(Math.floor(Math.random()*possible.length));
  }
  stack_attack = '1'+stack_attack;	// Make sure it starts with a digit
  ifFailed = invalidIpFailMsgAsserter.bind(null, assert, 'Stack overflow attacks, to 1MB, should be rejected out of hand.');

  v.check({a: stack_attack}, ifFailed);
  v.check({a: '2001:0db8:0:0:1:0:0:'+stack_attack}, ifFailed);
  v.check({a: '192.168.0.'+stack_attack}, ifFailed);
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
    assert.match(err.message, /Invalid IP/, 'IP test (negative case 2)');
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


exports['test_validate_badregex'] = function(test, assert) {
  var badValues = new Array('', null, undefined),
    throwExceptions = 0;

  for (i = 0; i < badValues.length; i++) {
    var v = new V({
      a: C().regex(badValues[i])
    });

    var obj = { a: 'sd@#$34f' };

    try {
      v.check(obj, function(err, cleaned) {});
    } catch (x) {
      throwExceptions++;
      assert.deepEqual(x.message, 'No pattern provided', 'badregex test');
    }
  }

  assert.equal(throwExceptions, badValues.length, 'badregex test');

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
    assert.deepEqual(err.message, 'String is not in range (1..2)', 'len test (negative case)');
  });

  neg = { a: 'abc' };
  v.check(neg, function(err, cleaned) {
    assert.deepEqual(err.message, 'String is not in range (1..2)', 'len test (negative case 2)');
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


exports['test_validate_notIn'] = function(test, assert) {
  var v = new V({
    a: C().notIn(['foo', 'bar'])
  });

  async.series([
    function positiveCaseString(callback) {
      var obj = { a: 'ponies'};
      v.check(obj, function(err, cleaned) {
        assert.ifError(err);
        assert.deepEqual(cleaned, obj);
        callback();
      });
    },

    function positiveCaseArray(callback) {
      var obj = { a: ['ponies']};
      v.check(obj, function(err, cleaned) {
        assert.ifError(err);
        assert.deepEqual(cleaned, obj);
        callback();
      });
    },

    function positiveCaseObject(callback) {
      var obj = { a: {'key': 'ponies'}};
      v.check(obj, function(err, cleaned) {
        assert.ifError(err);
        assert.deepEqual(cleaned, obj);
        callback();
      });
    },

    function negativeCaseString1(callback) {
      var obj = { a: 'foo'};

      v.check(obj, function(err, cleaned) {
        assert.match(err.message, /Value foo is blacklisted/);
        callback();
      });
    },

    function negativeCaseString2(callback) {
      var obj = { a: 'bar'};

      v.check(obj, function(err, cleaned) {
        assert.match(err.message, /Value bar is blacklisted/);
        callback();
      });
    },

    function negativeCaseArray(callback) {
      var obj = { a: ['ponies', 'foo', 'unicorns']};

      v.check(obj, function(err, cleaned) {
        assert.match(err.message, /Value foo is blacklisted/);
        callback();
      });
    },

    function negativeCaseObject(callback) {
      var obj = { a: {'key1': 'value1', 'key2': 'value2', 'ponies': 'ponies', 'foo': 'bar'}};

      v.check(obj, function(err, cleaned) {
        assert.match(err.message, /Value foo is blacklisted/);
        callback();
      });
    }
  ], test.finish);
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
    assert.deepEqual(err.message, 'String is not in range (1..Infinity)', 'notContains test (negative case)');
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


exports['test_validate_null_hash'] = function(test, assert) {
  var v = new V({
    a: C().isHash(C().isString(), C().isString())
  });

  //partial validation, should succeed
  var obj = null;
  v.checkPartial(obj, function(err, cleaned) {
    assert.ifError(err);
    assert.deepEqual(cleaned, {});
  });

  //loose mode - swiz should complain because 'a' is missing
  var obj = null;
  v.check(obj, function(err, cleaned) {
    assert.deepEqual(err.message, "Missing required key (a)");
  });

  //strict mode - swiz should complain because 'a' is missing
  var obj = null;
  v.check(obj, {strict: true}, function(err, cleaned) {
    assert.deepEqual(err.message, "Missing required key (a)");
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

exports['test_V4UUID'] = function(test, assert) {
  var v = new V({
    a: new C().isV4UUID()
  });

  async.series([
    function(callback) {
      // positive case
      var pos = { a: '4b299c10-ab5a-41e1-9f6f-1c8b12469d15' };
      v.check(pos, function(err, cleaned) {
        assert.ifError(err);
        assert.deepEqual(cleaned, pos, 'isV4UUID test');
        callback();
      });

    },

    function(callback) {
      // negative case 0
      var neg0 = { a: 'b299c10-ab5a-11e1-9f6f-1c8b12469d15' };
      v.check(neg0, function(err, cleaned) {
        assert.deepEqual(err.message, "Invalid UUID", 'isV4UUID test');
        callback();
      });
    },

    function(callback) {
      // negative case 1
      var neg1 = { a: '4@299c10-ab5a-11e1-9f6f-1c8b12469d15' };
      v.check(neg1, function(err, cleaned) {
        assert.deepEqual(err.message, "Invalid UUID", 'isV4UUID test');
        callback();
      });
    },

    function(callback) {
      //negative case 2
      var neg2 = { a : '4b299c10-ab5a-11e1-4f6f-1c8b12469d15' };
      v.check(neg2, function(err, cleaned) {
        assert.deepEqual(err.message, "Unsupported UUID variant", 'isV4UUID test');
        callback();
      });
    },

    function(callback) {
      //negative case 3
      var neg3 = { a : '4b299c10-ab5a-21e1-9f6f-1c8b12469d15' };
      v.check(neg3, function(err, cleaned) {
        assert.deepEqual(err.message, "UUID is not version 4", 'isV4UUID test');
        callback();
      });
    }
  ],

  function(err) {
    test.finish();
  });
};

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

exports['test_optional_string'] = function(test, assert) {
  var v = new V({
    a: new C().optional().isString().len(1, 5)
  });

  async.series([
    function check1(callback) {
      var pos1 = {a: 'abc'};
      v.check(pos1, function(err, cleaned) {
        assert.ifError(err);
        assert.deepEqual(cleaned, pos1);
        callback();
      });
    },

    function checknull(callback) {
      var pos2 = {a: null};

      v.check(pos2, function(err, cleaned) {
        assert.ifError(err);
        assert.deepEqual(cleaned, pos2);
        callback();
      });
    }
  ],
  function(err) {
     test.finish();
  });
};


exports['test_non_optional_and_optional_with_src_field_attribute'] = function(test, assert) {
  var validity = swiz.defToValve(def),
      v = new V(validity.Node), node1, node2, node3;

  node1 = {
    'is_active' : true,
    'name' : 'exmample',
    'agent_name' : 'your mom',
    'ipaddress' : '42.24.42.24'
  };

  node2 = {
    'hash_id' : 'xkCD366',
    'is_active' : true,
    'name' : 'exmample',
    'agent_name' : 'your mom',
    'ipaddress' : '42.24.42.24'
  }

  node3 = {
    'id' : 'xkCD366',
    'label' : 'node3',
    'is_active' : true,
    'name' : 'exmample',
    'agent_name' : 'your mom',
    'ipaddress' : '42.24.42.24'
  }

  async.series([
    function test1(callback) {
      v.check(node1, function(err, cleaned) {
        assert.ok(err)
        assert.equal(err.message, 'Missing required key (id)');
        callback();
      });
    },

    function test2(callback) {
      v.check(node2, function(err, cleaned) {
        assert.ok(err)
        assert.equal(err.message, 'Missing required key (id)');
        callback();
      });
    },

    function test2(callback) {
      v.check(node3, function(err, cleaned) {
        assert.ifError(err);
        assert.equal(cleaned.name, 'node3');
        callback();
      });
    }
  ],

  function(err) {
    assert.ifError(err);
    test.finish();
  })
};
