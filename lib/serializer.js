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

/* @fileOverview swiz is the serialization framework, built on Lucy's
 *   awesome python-esque version of things.... but for node.js
 *
 *  Major design goals are:
 *  * Allow us to support multiple formats (e.g. JSON & XML)
 *  * Be node.js-esque.
 *  * Not block especially frequently.
 *
 * Writing without a XML generator pimpy thingie because most of them
 * looked to be too much of a pain in the ass.
 *
 * Things that it doesn't presently do:
 * * Prevent you from using clearly-illegal names for things.
 * * Caching
 * * Pagination (this is regarded as a feature, not a bug)
 * * It doesn't try to remap returned arrays or hashes
 * * Probably some other things...
 */

// Required libs:
var async = require('async');
var et = require('elementtree');
var sprintf = require('sprintf').sprintf;

var merge = require('./util').merge;
var coerce = require('./struct').coerce;

var struct = require('./struct');
var O = struct.Obj;
var F = struct.Field;

/**
 * The constructor for the swiz class
 * @constructor
 *
 * Notes about the data def.
 *
 * It's first a set of object type definitions.
 *
 * Each object type definition is a list of slots, which is a pair
 * of name and an object containing the metainformation.
 *
 * The metainformation is free-form.  In a DRY fashion, it'll assume
 * that the name is the name of the object's variable.  If it isn't, you
 * can use 'src' to retrieve something else.
 *
 * 'type' is the type (I use thrift's format), 'desc' means the description.
 * These are for making things self-describing down the road.
 *
 * @param {!Object} defs data def.
 * @param {!Object} options options for serialization.
 */

function Swiz(defs, options) {
  if (! (this instanceof Swiz)) {
    return new Swiz(defs, options);
  }

  var defaultOptions = {
    'stripNulls': true,
    // if there are serializerType markers in objects, they will be removed from serialized versions.
    'stripSerializerType': true,
    'for': null
  }, i, o;

  this._defs = {};
  for (i = 0; i < defs.length; i++) {
    o = defs[i];
    this._defs[o.name] = o;
  }

  this._options = merge(defaultOptions, options);
}


/** Controls if you want to use JSON or XML (or, for that matter, any other
  * weird serialization format people might invent to torment you with)
  *
  * @enum {number}
  */
exports.SERIALIZATION = {
  SERIALIZATION_JSON: 0,
  SERIALIZATION_XML: 1
};


/**
 * Given a datastructure supported by Swiz, convert it into an Object that
 * can be serialized directly to JSON, or to XML using Swiz's serializeXml
 * method.
 *
 * @param {Object} obj The datastructure to be converted.
 * @param {function} callback A callback fired with (err, result).
 */
Swiz.prototype.buildObject = function(obj, callback) {
  this._buildObject(null, obj, callback);
};


Swiz.prototype._buildObject = function(parent, obj, callback) {
  var self = this;
  var stype, def, result, keys;

  if (obj instanceof Function) {
    // Call the function and recurse on the value passed to the callback
    obj.call(parent, function(err, value) {
      if (err) {
        callback(err);
      } else {
        self._buildObject(null, value, callback);
      }
    });
  }
  else if (obj instanceof Array) {
    // Recurse onto every element of an array
    function iterArr(item, callback) {
      self._buildObject(null, item, callback);
    }

    async.map(obj, iterArr, callback);
  }
  else if (obj instanceof Object && obj.getSerializerType) {
    // Recurse onto each property named in the definition
    stype = obj.getSerializerType();
    def = this._defs[stype];
    result = {};

    Object.defineProperty(result, 'serializerType', {
      value: stype,
      enumerable: false
    });

    if (!def) {
      callback(new Error('No definition for this type; no way to serialize ' + stype));
      return;
    }

    function iterObj(field, callback) {
      var k;
      var dst = field.name;
      var src = field.src || dst;

      if (self._options.for && (field.filterFrom.length > 0) &&
          (field.filterFrom.indexOf(self._options.for) !== -1)) {
        callback();
        return;
      }

      if (field.enumerated) {
        for (k in field.enumerated) {
          if (field.enumerated[k] === obj[src]) {
            result[dst] = k;
            callback();
            return;
          }
        }
      }

      self._buildObject(obj, obj[src], function(err, value) {
        result[dst] = value;
        callback(err);
      });
    }

    async.forEach(def.fields, iterObj, function(err) {
      callback(err, result);
    });
  }
  else if (obj instanceof Object) {
    // Treat it as a map, recurse onto each property
    keys = Object.keys(obj);
    result = {};

    function iterMap(key, callback) {
      if (!obj.hasOwnProperty(key)) {
        callback();
        return;
      }

      self._buildObject(obj, obj[key], function(err, value) {
        result[key] = value;
        callback(err);
      });
    }

    async.forEach(keys, iterMap, function(err) {
      callback(err, result);
    });
  }
  else {
    // Simple value, pass it back
    callback(null, obj);
  }
};

/**
 * Given a datastructure supported by Swiz, convert it into an Object that
 * can be serialized directly to JSON, or to XML using Swiz's serializeXml
 * method. This method may be called synchronously.
 *
 * Note: Currently, calling functions in swiz definitions is not supported
 *       for this method. If you require this, use Swiz.buildObject()
 *
 * @param {Object} obj The datastructure to be converted.
 * @returns {Object} The Swiz representation of the object.
 */
Swiz.prototype.buildObjectSync = function(obj) {
  var result, self = this,
      buildObjectSync = this.buildObjectSync.bind(this);

  if (obj instanceof Function) {
    // this feature is not supported in buildObjectSync yet
    return;
  }
  else if (obj instanceof Array) {
    // Recurse onto every element of an array
    return obj.map(buildObjectSync);
  }
  else if (obj instanceof Object && obj.getSerializerType) {
    // Recurse onto each property named in the definition
    stype = obj.getSerializerType();
    def = this._defs[stype];
    result = {};

    Object.defineProperty(result, 'serializerType', {
      value: stype,
      enumerable: false
    });

    if (!def) {
      throw(new Error('No definition for this type; no way to serialize ' + stype));
    }

    def.fields.forEach(function(field, callback) {
      var dst = field.name;
      var src = field.src || dst;
      var k;

      if (self._options.for && (field.filterFrom.length > 0) &&
          (field.filterFrom.indexOf(self._options.for) !== -1)) {
        return;
      }

      if (field.enumerated) {
        for (k in field.enumerated) {
          if (field.enumerated[k] === obj[src]) {
            result[dst] = k;
            return;
          }
        }
      }

      result[dst] = buildObjectSync(obj[src]);
    });
    return result;
  }
  else if (obj instanceof Object) {
    // Treat it as a map, recurse onto each property
    keys = Object.keys(obj);
    result = {};

    keys.forEach(function(key) {
      if (!obj.hasOwnProperty(key)) {
        return;
      }
      result[key] = buildObjectSync(obj[key]);
    });
    return result;
  }
  else {
    // Simple value, pass it back
    return obj;
  }
};

// transforms object prior to being fed through JSON.parse()
function jsonTransform(options) {
  return function(key, value) {
    var ret = value;
    if (options.stripNulls && (value === null || value === undefined)) {
      // prune nulls
      ret = undefined;
    } else if (options.stripSerializerType && key === 'serializerType') {
      // prune serializerType
      ret = undefined;
    }
    return ret;
  };
}

function stripSerializerTypes(obj) {
  var ret;
  if (obj instanceof Array) {
    ret = [];
    obj.forEach(function(child) {
      ret.push(stripSerializerTypes(child));
    });
    return ret;
  } else if (obj instanceof Object) {
    ret = {};
    Object.keys(obj).forEach(function(key) {
      if (obj.hasOwnProperty(key) && key !== 'serializerType') {
        ret[key] = stripSerializerTypes(obj[key]);
      }
    });
    return ret;
  } else {
    return obj;
  }
}

/**
 * Convert an "object" constructed by buildObject to JSON. Currently this
 * simply calls JSON.stringify() on the object.
 */
Swiz.prototype.serializeJson = function(obj) {
  return JSON.stringify(obj, jsonTransform(this._options), 4);
};

/**
 * Convert an "object" constructed by buildObject to XML. If the object is an
 * Array it will be placed within <group>...</group> tags.
 *
 * @param {object|array} obj The object to be serialized.
 * @returns {string}
 */
Swiz.prototype.serializeXml = function(obj) {
  var stype, def, elem = null, etree, xml;

  if ((obj instanceof Array)) {
    stype = obj[0].serializerType;
    def = this._defs[stype];

    if (stype) {
      // We assume that all the items in the array are of a same type
      elem = new et.Element(def.plural);
    }
    else {
      elem = new et.Element('group');
    }
  }

  elem = this._serializeXml(null, elem, obj, (obj instanceof Array), null);
  etree = new et.ElementTree(elem);
  xml = etree.write();
  return xml;
};

Swiz.prototype._defFor = function(tag) {
  if (this._defs[tag]) {
    return this._defs[tag];
  } else {
    var keys = Object.keys(this._defs);
    for (var i = 0; i < keys.length; i++) {
      if (this._defs[keys[i]].plural === tag) {
        return this._defs[keys[i]];
      } else if (this._defs[keys[i]].singular === tag) {
        return this._defs[keys[i]];
      }
    }
    return null;
  }
}

function findField(name, fields) {
  return fields.reduce(function(a, b) { return b.name === name ? b : a; }, null);
}



/**
 * convert an xml element into a javascript object.
 * @param {ElementTree} elem element to convert.
 * @param {Obj} def object definition to use for convesion.
 */
Swiz.prototype._emitFromDef = function(elem, def) {
  var obj = {};
  var self = this;

  // attributes are easy:
  Object.keys(elem.attrib).forEach(function(attr) {
    var field = findField(attr, def.fields);
    obj[attr] = field.coerce(elem.attrib[attr]);
  });

  // if there is text, there should be no children.
  if (elem.text.length > 0 && elem.text.trim().length > 0) {
    var field = findField(elem.tag, def.fields);
    if (field) {
      obj[elem.tag] = field.coerce(elem.text);
    } else {
      obj[elem.tag] = coerce(elem.text);
    }
  } else if (elem._children.length === 0) {
    // no text, no children. this is a null.
    obj[elem.tag] = null;
  } else {
    // children are trickier.
    elem._children.forEach(function(child) {
      // no child objects are easy.
      if (Object.keys(child._children).length == 0) {
        var field = findField(child.tag, def.fields);
        if (child.text === '' && child._children.length == 0) {
          // this is what a stripNulls null looks like.
          if (!field.coerceTo) {
            obj[child.tag] = null;
          }
          else {
            obj[child.tag] = field.coerce(child.text);
          }
        } else if (field) {
          obj[child.tag] = field.coerce(child.text);
        } else {
          obj[child.tag] = coerce(child.text);
        }
      } else {
        var field = findField(child.tag, def.fields);
        if (field) {
          if (child._children.length === 1 && self._defFor(child._children[0].tag)) {
            // if there is only one child and that child has its own def, assume that it is a complex object that has
            // been serialized (as opposed to a simple hash)
            obj[child.tag] = self._deserializeXml(child._children[0]);
          } else {
            // determine hash or list
            if (child.tag === field.plural && field.plural !== field.singular) {
              obj[child.tag] = [];
              child._children.forEach(function(grandChild) {
                if (grandChild.text.length > 0) {
                  obj[child.tag].push(field.coerce(grandChild.text));
                } else {
                  obj[child.tag].push(self._emitFromDef(grandChild, def));
                }
              });
            } else {
              obj[child.tag] = {};
              child._children.forEach(function(grandChild) {
                if (grandChild.text.length > 0) {
                  obj[child.tag][grandChild.tag] = field.coerce(grandChild.text);
                } else if(grandChild.text.length === 0 && grandChild._children.length === 0){
                  // if grandchild has no text and no children then grandchild is an empty node. set value to null.
                  obj[child.tag][grandChild.tag] = null;
                } else {
                  obj[child.tag][grandChild.tag] = self._emitFromDef(grandChild, def);
                }
              });
            }
          }
        } else {
          throw new Error('no field for ' + child.tag);
        }
      }
    });
  }
  return obj;
}


/**
 * deserialize an xml element into a javascript object or array.
 * @param {ElementTree} elem element to convert.
 */
Swiz.prototype._deserializeXml = function(elem) {
  var self = this, children, obj,
      def = self._defFor(elem.tag);

  if (elem.tag !== 'container' && !def) {
    throw new Error('No definition for this type; unable to deserialize ' + elem.tag);
  }

  if (elem.tag === 'container') {
    obj = {
      values: [],
      metadata: {}
    };

    // iterate over values.
    elem._children[0]._children.forEach(function(e) {
      obj.values.push(self._deserializeXml(e));
    });

    obj.metadata = {};
    children = elem.findall('metadata/*');
    children.forEach(function(e) {
      var name, value;
      name = e.tag;
      value = e.text || null;

      obj.metadata[name] = value;
    });
  }
  else {
    if (def.plural === elem.tag) {
      // we'll be emitting a list.
      obj = [];
      // iterate over children, emitting objects that conform to def.
      elem._children.forEach(function(child) {
        // todo: assert elem has no attributes.
        obj.push(self._emitFromDef(child, def));
      });
    } else {
      // we'll be emitting an object that conforms to def.
      obj = self._emitFromDef(elem, def);
    }
  }

  return obj;
}


/**
 * deserialize xml into a cleaned javascript object.
 * @param {String} xml data to deserialize.
 */
Swiz.prototype.deserializeXml = function(xml) {
  return this._deserializeXml(et.XML(xml));
}

/**
 * @param {String} stype Serializer type which is in use for current
 * key.
 * @param {?et.Element|et.SubElement} elem Optional parent element.
 * @param {Object} obj Object to serialize.
 * @param {Boolean} arrayItem true if an array item is currently being
 * serialized.
 * @param {String} key object key.
 * @return {et.Element|et.SubElement} elementtree element.
 */
Swiz.prototype._serializeXml = function(stype, elem, obj, arrayItem, key) {
  elem = elem || null;
  var i, def, fields, field, keys, item, singular, src, value, selem, attribute;

  if (obj instanceof Array) {
    if (stype) {
      field = this.getFieldDefinition(stype, key);

      if (!field.singular) {
        throw new Error(sprintf('Field "%s" is an array, but it is missing "singular" option',
                                key));
      }

      selem = et.SubElement(elem, field.plural);
      key = field.singular;
    }
    else {
      selem = elem;
    }

    // Treat each member of an array as a separate property with the same key
    for (i = 0; i < obj.length; i++) {
      this._serializeXml(stype, selem, obj[i], true, key);
    }

    return selem;
  }
  else if (obj instanceof Object && obj.serializerType) {
    // Look up object definitions, serialize each defined property
    stype = obj.serializerType;
    def = this._defs[stype];

    if (!def) {
      throw new Error('No definition for this type; unable to serialize');
    }

    fields = def.fields;

    if (key) {
      if (arrayItem && (obj instanceof Object)) {
        elem = this._addElement(elem, def.singular);
        selem = elem;
      }
      else {
        elem = this._addElement(elem, key);

        // Only add sub-element if current key and singular field name are not the
        // same.
        //
        // For example:
        //
        // 1. No sub-element
        // {'entity': {entityObj}}
        //
        // 2. Sub-element
        // opts: {
        // option1: 'defaultval',
        // option2: 'defaultval',
        // option3: 'something'

        if (key !== def.singular) {
          selem = et.SubElement(elem, def.singular);
        }
        else {
          selem = elem;
        }
      }
    }
    else {
      elem = selem = this._addElement(elem, def.singular);
    }

    for (i = 0; i < fields.length; i++) {
      field = fields[i];
      src = field.name;
      this._serializeXml(stype, selem, obj[src], false, src);
    }

    return elem;
  }
  else if (obj instanceof Object) {
    // Use all defined keys
    keys = Object.keys(obj);

    elem = this._addElement(elem, key);

    for (i = 0; i < keys.length; i++) {
      if (obj.hasOwnProperty(keys[i])) {
        src = keys[i];
        this._serializeXml(null, elem, obj[keys[i]], false, src);
      }
    }

    return elem;
  }
  else {
    // Serialize individual values
    if (obj === null) {
      // add empty item to elem.
      if (!this._options.stripNulls) {
        selem = et.SubElement(elem, key);
      }
      return null;
    } else if (obj !== undefined) {
      value = obj.toString();
      field = (stype) ? this.getFieldDefinition(stype, key) : null;
      attribute = (field) ? field.attribute : false;

      if (attribute) {
        // Key will be used as an attribute
        if (!elem) {
          throw new Error(sprintf('%s should be used as an attribute, but it doesn\'t ' +
                                  'have a parent element', key));
        }

        elem.set(key, value);
        return elem;
      }
      else {
        return this._addElement(elem, key, null, value);
      }
    }
  }
};


/**
 * Adds a new element to the tree. If a parent element is specified, provided
 * element is added as a SubElement otherwise it is added as a parent.
 * @param {?et.Element|et.SubElement} parent Optional parent.
 * @param {String} tag new element tag.
 * @param {?Object} tag new element attributes.
 * @param {?String} tag new element text.
 */
Swiz.prototype._addElement = function(parent, tag, attributes, text) {
  var e;

  if (parent) {
    e = et.SubElement(parent, tag, attributes);
  }
  else {
    e = new et.Element(tag, attributes, text);
  }

  if (text) {
    e.text = text;
  }

  return e;
};


/** Serialize function
  *
  * This is your primary API.  It will look through your pre-set
  * definition structure and try to "do the right thing" as necessary.
  *
  * Your object needs to have a getSerializerType() method so
  * it can know how to serialize it (so that any number of "node"
  * objects can be serialized as a Node).
  *
  * The individual slots (functions or variables) can be node-style
  * callbacks, single objects, arrays, or objects.  It will try to
  * "do the right thing"
  *
  * Version numbers are presently ignored.
  *
  * @param {enum} mode The mode of serialization.
  * @param {number} version The version number.
  * @param {Object|Array} obj The object to be serialized.
  * @param {function} callback The callback to use.
  */
Swiz.prototype.serialize = function(mode, version, obj, callback) {
  var self = this, serializeFor;

  this.buildObject(obj, function(err, result) {
    if (err) {
      callback(err);
      return;
    }

    if (mode === exports.SERIALIZATION.SERIALIZATION_XML) {
      callback(null, self.serializeXml(result));
    } else if (mode === exports.SERIALIZATION.SERIALIZATION_JSON) {
      callback(null, self.serializeJson(result));
    } else {
      callback(new Error('Unrecognized serialization mode: ' + mode));
    }
  });
};


/**
 * Serialize an array and wrap it inside a container which includes meta
 * information which are needed for the pagination.
 *
 * @param {enum} mode The mode of serialization.
 * @param {Array} array Array to be serialized.
 * @param {Object} metadata Pagination meta data.
 * @param {function} callback The callback to use.
 */
Swiz.prototype.serializeForPagination = function(mode, array, metadata, callback) {
  var self = this, def, containerObj, serializedObj;
  def = O('Container',
    {
      'fields': [
        F('values', {'plural': 'values', 'singular': 'value'}),
        F('metadata', {})
      ]
    });

  if (!(array instanceof Array)) {
    throw new Error('obj must be an array');
  }

  if ([exports.SERIALIZATION.SERIALIZATION_XML, exports.SERIALIZATION.SERIALIZATION_JSON].indexOf(mode) === -1) {
    callback(new Error('Unrecognized serialization mode: ' + mode));
    return;
  }

  this._defs['_paginationContainer'] = def;
  containerObj = {
    'values': array,
    'metadata': metadata
  };

  containerObj.getSerializerType = function() {
    return '_paginationContainer';
  };

  self.buildObject(containerObj, function(err, result) {
    if (err) {
      callback(err);
      return;
    }

    if (mode === exports.SERIALIZATION.SERIALIZATION_XML) {
      serializedObj = self.serializeXml(result);
    }
    else if (mode === exports.SERIALIZATION.SERIALIZATION_JSON) {
      serializedObj = self.serializeJson(result);
    }

    callback(null, serializedObj);
  });
};


/**
 * Deserialize function. Does the opposite of serialize, except that it returns a pure JS object
 * instead of the instance-specific object you would submit to serialize.
 *
 * @param {enum} mode The mode of deserialization
 * @param {number} version Currently pinned at 1.
 * @param {String} raw serialized object.
 * @param {Function} callback expects(err, obj).
 */
Swiz.prototype.deserialize = function(mode, version, raw, callback) {
  var self = this, deserialized;
  if (mode === exports.SERIALIZATION.SERIALIZATION_XML) {
    callback(null, self.deserializeXml(raw));
  } else if (mode === exports.SERIALIZATION.SERIALIZATION_JSON) {
    try {
      deserialized = JSON.parse(raw);
    }
    catch (e) {
      callback(e);
      return;
    }

    callback(null, deserialized);
  } else {
    callback(new Error('Unrecognized serialization mode: ' + mode));
  }
}


/**
 * Return definition for the provided field.
 *
 * @param {String} stype Serializer type.
 * @param {String} name field name.
 * @return {Object} definition for the provided name.
 */
Swiz.prototype.getFieldDefinition = function(stype, name) {
  var defs = this._defs[stype], fields = defs.fields, i, len, field;

  if (!defs) {
    throw new Error(sprintf('No definition for type "%s"', stype));
  }

  for (i = 0, len = fields.length; i < len; i++) {
    field = fields[i];
    if (field.name === name) {
      return field;
    }
  }

  return null;
};


/**
 * The swiz class
 */
exports.Swiz = Swiz;


exports.stripSerializerTypes = stripSerializerTypes;
