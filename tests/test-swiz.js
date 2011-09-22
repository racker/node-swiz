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

var async = require('async');
var util = require('util');
var assert = require('assert');

var swiz = require('swiz');
var O = swiz.struct.Obj;
var F = swiz.struct.Field;
var trim = require('./../lib/util').trim;


assert.trimEqual = function(actual, expected, message) {
  actual = trim(actual);
  expected = trim(expected);
  assert.equal(actual, expected, message);
};


// Mock set of serialization defs
var def = [
  O('Node',
    {
      'fields': [
        F('id', {'src': 'hash_id', 'desc': 'hash ID for the node', 'attribute': true}),
        F('is_active', {'src': 'active', 'desc': 'is the node active?', 'coerceTo': 'boolean'}),
        F('name', {'src' : 'get_name', 'desc' : 'name', 'attribute': true}),
        F('agent_name'),
        F('ipaddress' , {'src' : 'get_public_address'}),
        F('public_ips', {'singular': 'ip', 'filterFrom': ['public']}),
        F('state', {'enumerated' : {inactive: 0, active: 1, full_no_new_checks: 2},
                     'filterFrom': ['public', 'test1']}),
        F('opts', {'src': 'options'}),
        F('data')
        ],
      'plural': 'nodes'
    }),

  O('NodeOpts',
    {
      'fields': [
        F('option1', {'src': 'opt1'}),
        F('option2', {'src': 'opt2'}),
        F('option3', {'src': 'opt3'}),
      ],

      'singular': 'nodeOpts'
    }),
];

/** Completely mock node object.
* @constructor
*/
function Node() {
  this.hash_id = '15245';
  this.active = true;
  this.agent_name = 'gl<ah';
  this.public_ips = ['123.45.55.44', '122.123.32.2'];
  this.public_address = '123.33.22.1';
  this.state = 1;
  this.options = {
    'opt1': 'defaultval',
    'opt2': 'defaultval',
    'opt3': function(callback) {
      callback(null, 'something');
    }
  };

  this.options.getSerializerType = function() {
    return 'NodeOpts';
  };

  this.data = {
    'foo': 'thingone',
    'bar': 'thingtwo'
  };
}


/**
 * Dummy funct
 * @param {function(*,*)} callback junk.
 */
Node.prototype.get_name = function(callback) {
  callback(null, 'gggggg');
};


/**
 * Dummy funct
 * @param {function(*,*)} callback junk.
*/
Node.prototype.get_public_address = function(callback) {
  callback(null, this.public_address);
};


/**
 * Dummy funct
 * @return {string} junk.
*/
Node.prototype.getSerializerType = function() {return 'Node';};


exports['test_build_object'] = function(test, assert) {
  var blahnode = new Node();
  var sw = new swiz.Swiz(def);
  sw.buildObject(blahnode, function(err, result) {
    assert.ifError(err);
    assert.deepEqual(result, {
      id: 15245,
      is_active: true,
      name: 'gggggg',
      agent_name: 'gl<ah',
      ipaddress: '123.33.22.1',
      public_ips: ['123.45.55.44', '122.123.32.2'],
      opts: {
        option1: 'defaultval',
        option2: 'defaultval',
        option3: 'something'
      },
      data: {
        foo: 'thingone',
        bar: 'thingtwo'
      },
      state: 'active'
    });
    test.finish();
  });
};


exports['test_serial_xml'] = function(test, assert) {
  var blahnode = new Node();
  blahnode.active = false;
  var sw = new swiz.Swiz(def, { stripNulls: true });
  sw.serialize(swiz.SERIALIZATION.SERIALIZATION_XML, 1, blahnode,
      function(err, results)
      {
        // need to make an appointemnt with a DOM for this one.
        assert.trimEqual(results, '<?xml version=\'1.0\' encoding=\'utf-8\'?>\n' +
            '<node id="15245" name="gggggg"><is_active>false</' +
            'is_active><agent_name>gl&lt;ah</' +
            'agent_name><ipaddress>123.33.22.1</ipaddress>' +
            '<public_ips><ip>123.45.55.44</ip><ip>122.123.32.2</ip></public_ips>' +
            '<state>active</state>' +
            '<opts><nodeOpts>' +
            '<option1>defaultval</option1>' +
            '<option2>defaultval</option2>' +
            '<option3>something</option3>' +
            '</nodeOpts></opts>' +
            '<data><foo>thingone</foo><bar>thingtwo</bar></data></node>');

        test.finish();
      }
  );
};


exports['test_serial_xml_filterFrom'] = function(test, assert) {
  var blahnode = new Node();
  blahnode.active = false;
  var sw = new swiz.Swiz(def, { stripNulls: true, for: 'public' });
  sw.serialize(swiz.SERIALIZATION.SERIALIZATION_XML, 1, blahnode,
      function(err, results)
      {
        // need to make an appointemnt with a DOM for this one.
        assert.trimEqual(results, '<?xml version=\'1.0\' encoding=\'utf-8\'?>\n' +
            '<node id="15245" name="gggggg"><is_active>false</' +
            'is_active><agent_name>gl&lt;ah</' +
            'agent_name><ipaddress>123.33.22.1</ipaddress>' +
            '<opts><nodeOpts>' +
            '<option1>defaultval</option1>' +
            '<option2>defaultval</option2>' +
            '<option3>something</option3>' +
            '</nodeOpts></opts>' +
            '<data><foo>thingone</foo><bar>thingtwo</bar></data></node>');

        test.finish();
      }
  );
};

exports['test_serial_xml_stripNulls'] = function(test, assert) {
  var blahnode = new Node();
  blahnode.active = null;
  var sw = new swiz.Swiz(def, { stripNulls: true });
  sw.serialize(swiz.SERIALIZATION.SERIALIZATION_XML, 1, blahnode,
      function(err, results)
      {
        // need to make an appointemnt with a DOM for this one.
        assert.trimEqual(results, '<?xml version=\'1.0\' encoding=\'utf-8\'?>\n' +
            '<node id="15245" name="gggggg"><agent_name>gl&lt;ah</' +
            'agent_name><ipaddress>123.33.22.1</ipaddress>' +
            '<public_ips><ip>123.45.55.44</ip><ip>122.123.32.2</ip></public_ips>' +
            '<state>active</state>' +
            '<opts><nodeOpts>' +
            '<option1>defaultval</option1>' +
            '<option2>defaultval</option2>' +
            '<option3>something</option3>' +
            '</nodeOpts></opts>' +
            '<data><foo>thingone</foo><bar>thingtwo</bar></data></node>');

        test.finish();
      }
  );
};

exports['test_serial_json'] = function(test, assert) {
  var blahnode = new Node();
  blahnode.active = false;
  var sw = new swiz.Swiz(def, { stripNulls: true });
  sw.serialize(swiz.SERIALIZATION.SERIALIZATION_JSON, 1, blahnode,
      function(err, results)
      {
        var rep = JSON.parse(results);
        assert.deepEqual(rep.id, 15245);
        assert.deepEqual(rep.is_active, false);
        assert.deepEqual(rep.name, 'gggggg');
        assert.deepEqual(rep.agent_name, 'gl<ah');
        assert.deepEqual(rep.ipaddress, '123.33.22.1');
        assert.deepEqual(rep.public_ips, ['123.45.55.44', '122.123.32.2']);
        assert.deepEqual(rep.opts, {
          option1: 'defaultval',
          option2: 'defaultval',
          option3: 'something'
        });
        assert.deepEqual(rep.data, {
          foo: 'thingone',
          bar: 'thingtwo'
        });
        assert.deepEqual(rep.state, 'active');
        test.finish();
      }
  );
};

exports['test_serial_json_filterFrom'] = function(test, assert) {
  var blahnode = new Node();
  blahnode.active = false;
  var sw = new swiz.Swiz(def, { stripNulls: true, for: 'public' });
  sw.serialize(swiz.SERIALIZATION.SERIALIZATION_JSON, 1, blahnode,
      function(err, results)
      {
        var rep = JSON.parse(results);
        assert.deepEqual(rep.id, 15245);
        assert.deepEqual(rep.is_active, false);
        assert.deepEqual(rep.name, 'gggggg');
        assert.deepEqual(rep.agent_name, 'gl<ah');
        assert.deepEqual(rep.ipaddress, '123.33.22.1');
        assert.ok(!rep.hasOwnProperty('public_ips'));
        assert.deepEqual(rep.opts, {
          option1: 'defaultval',
          option2: 'defaultval',
          option3: 'something'
        });
        assert.deepEqual(rep.data, {
          foo: 'thingone',
          bar: 'thingtwo'
        });
        assert.ok(!rep.hasOwnProperty('state'));
        test.finish();
      }
  );
};

exports['test_serial_json_stripNulls'] = function(test, assert) {
  var blahnode = new Node();
  blahnode.active = null;
  var sw = new swiz.Swiz(def, { stripNulls: true });
  sw.serialize(swiz.SERIALIZATION.SERIALIZATION_JSON, 1, blahnode,
      function(err, results)
      {
        var rep = JSON.parse(results);
        assert.deepEqual(rep.id, 15245);
        assert.ok(!rep.hasOwnProperty('is_active'));
        assert.deepEqual(rep.name, 'gggggg');
        assert.deepEqual(rep.agent_name, 'gl<ah');
        assert.deepEqual(rep.ipaddress, '123.33.22.1');
        assert.deepEqual(rep.public_ips, ['123.45.55.44', '122.123.32.2']);
        assert.deepEqual(rep.opts, {
          option1: 'defaultval',
          option2: 'defaultval',
          option3: 'something'
        });
        assert.deepEqual(rep.data, {
          foo: 'thingone',
          bar: 'thingtwo'
        });
        assert.deepEqual(rep.state, 'active');
        test.finish();
      }
  );
};

exports['test_serial_array_xml'] = function(test, assert) {
  var blahnode = new Node();
  var blahnode2 = new Node();
  blahnode2.hash_id = '444';
  blahnode2.agent_name = 'your mom';
  var blaharr = [blahnode, blahnode2];
  var sw = new swiz.Swiz(def);
  sw.serialize(swiz.SERIALIZATION.SERIALIZATION_XML, 1, blaharr,
      function(err, results)
      {
        assert.trimEqual(results, '<?xml version=\'1.0\' encoding=\'utf-8\'?>\n' +
            '<nodes><node id="15245" name="gggggg"><is_active>true</' +
            'is_active><agent_name>gl&lt;ah</' +
            'agent_name><ipaddress>123.33.22.1</ipaddress>' +
            '<public_ips><ip>123.45.55.44</ip><ip>122.123.32.2</ip></public_ips>' +
            '<state>active</state>' +
            '<opts><nodeOpts>' +
            '<option1>defaultval</option1><option2>defaultval</option2>' +
            '<option3>something</option3></nodeOpts></opts>' +
            '<data><foo>thingone</foo><bar>thingtwo</bar></data></node>' +
            '<node id="444" name="gggggg"><is_active>true</' +
            'is_active><agent_name>your mom</' +
            'agent_name><ipaddress>123.33.22.1</ipaddress>' +
            '<public_ips><ip>123.45.55.44</ip><ip>122.123.32.2</ip></public_ips>' +
            '<state>active</state>' +
            '<opts><nodeOpts>' +
            '<option1>defaultval</option1><option2>defaultval</option2>' +
            '<option3>something</option3></nodeOpts></opts>' +
            '<data><foo>thingone</foo><bar>thingtwo</bar></data></node>' +
            '</nodes>');

        test.finish();
      }
  );
};

exports['test_error_type'] = function(test, assert) {
  var blah = { };
  var sw = new swiz.Swiz(def);
  blah.getSerializerType = function() {return 'monito';};
  sw.serialize(swiz.SERIALIZATION.SERIALIZATION_JSON, 1, blah,
      function(err, results)
      {
        assert.ok(err instanceof Error);

        test.finish();
      }
  );
};


exports['test_serial_array_json'] = function(test, assert) {
  var blahnode = new Node();
  var blahnode2 = new Node();
  blahnode2.hash_id = '444';
  blahnode2.agent_name = 'your mom';
  var blaharr = [blahnode, blahnode2];
  var sw = new swiz.Swiz(def);
  sw.serialize(swiz.SERIALIZATION.SERIALIZATION_JSON, 1, blaharr,
      function(err, results)
      {
        var rep = JSON.parse(results);
        assert.deepEqual(rep[0].id, 15245);
        assert.deepEqual(rep[0].is_active, true);
        assert.deepEqual(rep[0].name, 'gggggg');
        assert.deepEqual(rep[0].agent_name, 'gl<ah');
        assert.deepEqual(rep[0].ipaddress, '123.33.22.1');
        assert.deepEqual(rep[0].public_ips,
            ['123.45.55.44', '122.123.32.2']);
        assert.deepEqual(rep[0].opts, {
          option1: 'defaultval',
          option2: 'defaultval',
          option3: 'something'
        });
        assert.deepEqual(rep[0].data, {
          foo: 'thingone',
          bar: 'thingtwo'
        });
        assert.deepEqual(rep[0].state, 'active');
        assert.deepEqual(rep[1].id, 444);
        assert.deepEqual(rep[1].is_active, true);
        assert.deepEqual(rep[1].name, 'gggggg');
        assert.deepEqual(rep[1].agent_name, 'your mom');
        assert.deepEqual(rep[1].ipaddress, '123.33.22.1');
        assert.deepEqual(rep[1].public_ips,
            ['123.45.55.44', '122.123.32.2']);
        assert.deepEqual(rep[1].opts, {
          option1: 'defaultval',
          option2: 'defaultval',
          option3: 'something'
        });
        assert.deepEqual(rep[1].data, {
          foo: 'thingone',
          bar: 'thingtwo'
        });
        assert.deepEqual(rep[1].state, 'active');
        test.finish();
      }
  );
};

exports['test_serial_edge_cases_xml'] = function(test, assert) {
  var blahnode = new Node();
  blahnode.active = false;
  blahnode.public_ips = [];
  blahnode.options = {};
  var sw = new swiz.Swiz(def, { stripNulls: true });
  sw.serialize(swiz.SERIALIZATION.SERIALIZATION_XML, 1, blahnode,
      function(err, results)
      {
        // need to make an appointemnt with a DOM for this one.
        assert.trimEqual(results, '<?xml version=\'1.0\' encoding=\'utf-8\'?>\n' +
            '<node id="15245" name="gggggg"><is_active>false</' +
            'is_active><agent_name>gl&lt;ah</' +
            'agent_name><ipaddress>123.33.22.1</ipaddress>' +
            '<state>active</state>' +
            '<opts />' +
            '<data><foo>thingone</foo><bar>thingtwo</bar></data></node>');

        test.finish();
      }
  );
};

exports['test_serial_invalid_serializer_type_xml'] = function(test, assert) {
  var blahnode = new Node();
  blahnode.getSerializerType = function() {
    return 'foobar';
  };
  var sw = new swiz.Swiz(def, { stripNulls: true });
  sw.serialize(swiz.SERIALIZATION.SERIALIZATION_XML, 1, blahnode,
      function(err, results)
      {
        assert.ok(err);
        assert.ok(!results);
        test.finish();
      }
  );
};

exports['test_simple_xml_deserialization'] = function(test, assert) {
  var node1 = new Node();
  var sw = new swiz.Swiz(def);
  
  var node1Built;
  var node1Xml;
  async.waterfall([
    function(callback) {
      sw.buildObject(node1, function(err, obj) {
        node1Built = obj;
        callback(err);
      });
    },
    function(callback) {
      sw.serialize(swiz.SERIALIZATION.SERIALIZATION_XML, 1, node1, function(err, xml) {
        node1Xml = xml;
        callback(err);
      });
    },
    function(callback) {
      sw.deserialize(swiz.SERIALIZATION.SERIALIZATION_XML, 1, node1Xml, function(err, jsObj) {
        assert.deepEqual(jsObj, node1Built);
        callback(err);
      });
    }
  ], function(err) {
    assert.ifError(err);
    test.finish();
  });
}

exports['test_array_xml_deserialization'] = function(test, assert) {
  var node1 = new Node();
  var node2 = new Node();
  node2.hash_id = '444';
  node2.agent_name = 'your mom';
  var arr = [node1, node2];
  
  var node1Obj;
  var node2Obj;
  
  var sw = new swiz.Swiz(def);
  async.waterfall([
    function(callback) {
      sw.buildObject(node1, function(err, obj) {
        node1Obj = obj;
        callback(err);
      });
    },
    function(callback) {
      sw.buildObject(node2, function(err, obj) {
        node2Obj = obj;
        callback(err);
      });
    },
    function(callback) {
      sw.serialize(swiz.SERIALIZATION.SERIALIZATION_XML, 1, arr, function(err, xml) {
        callback(err, xml);
      });
    },
    function(xml, callback) {
      sw.deserialize(swiz.SERIALIZATION.SERIALIZATION_XML, 1, xml, function(err, arr) {
        // should be an array in this case.
        assert.deepEqual([node1Obj, node2Obj], arr);
        callback();
      });
    }
  ], function(err) {
    assert.ifError(err);
    test.finish();
  });
}
