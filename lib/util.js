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

/**
 * Remove leading and trailing whitespace.
 * @param {String} str string to trim.
 * @return {String} Trimmed string.
 */
function trim(str) {
  return str.replace(/^\s+|\s+$/g,"");
}


function merge(a, b) {
  var c = {}, attrname;

  for (attrname in a) {
    if (a.hasOwnProperty(attrname)) {
      c[attrname] = a[attrname];
    }
  }
  for (attrname in b) {
    if (b.hasOwnProperty(attrname)) {
      c[attrname] = b[attrname];
    }
  }
  return c;
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


exports.trim = trim;
exports.merge = merge;
exports.typeOf = typeOf;
