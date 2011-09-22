/**
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


function Obj(name, options) {
  this.name = name;
  options = options ? options : {};
  this.singular = options.singular ? options.singular : name.toLowerCase();
  this.plural = options.plural ? options.plural : name.toLowerCase();
  this.fields = options.fields ? options.fields : [];
}

function Field(name, options) {
  this.name = name;
  options = options ? options : {};
  this.src =  options.src ? options.src : null;
  this.singular = options.singular ? options.singular : name.toLowerCase();
  this.plural = options.plural ? options.plural : name.toLowerCase();
  this.desc = options.desc;
  this.val = options.val;
  this.attribute = options.attribute || false;
  this.enumerated = options.enumerated || false;
  this.ignorePublic = options.ignorePublic || false;
  this.filterFrom = options.filterFrom || [];
  this.coerceTo = options.coerceTo || false;
}


/**
 * This function deals with converting enumerated types from their string
 * versions to the right actual value, hiding some of the complexity of fields.
 * obj is a real object, not the cleaned up simple object with no methods.
 */
Field.prototype.valueForObj = function(obj) {
  var k, src = this.src;

  if (this.enumerated) {
    for (k in this.enumerated) {
      if (this.enumerated[k] === obj[src]) {
        return k;
      }
    }
  }
};



/** 
 * allows you to coerce a value to a native value. this is handy when your numbers and booleans get converted to
 * strings outside of your control.
 */
Field.prototype.coerce = function(value) {
  if (!this.coerceTo) {
    return value;
  } else if (this.coerceTo === 'boolean') {
    return value.toString().toLowerCase() !== 'false';
  } else if (this.coerceTo === 'number') {
    return new Number(value).valueOf();
  } else {
    // log this;
    return value;
  }
}

exports.Obj = function(name, options) {
  return new Obj(name, options);
};

exports.Field = function(name, options) {
  return new Field(name, options);
};
