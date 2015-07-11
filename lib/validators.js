var check = require('validator');

var utils = require('./util');

exports.isPort = function(value, baton) {
  value = parseInt(value, 10);

  if (value < 1 || value > 65535) {
    throw new Error('Value out of range [1,65535]');
  }

  return value;
};


exports.isV1UUID = function(str) {
  this.isUUID(str);

  if (str.charAt(14) !== '1') {
    throw new Error('UUID is not version 1');
  }

  return str;
};


exports.isV4UUID = function(str) {
  this.isUUID(str);

  if (str.charAt(14) !== '4') {
    throw new Error('UUID is not version 4');
  }

  return str;
};


exports.isUUID = function(str) {
  if (!str.match(/^[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$/)) {
    throw new Error('Invalid UUID');
  } else if ((parseInt(str.charAt(19), 16) & 12) !== 8) {
    throw new Error('Unsupported UUID variant');
  }

  return str;
};

exports.isHostname = function(value) {
  var labels;

  if (!check.isFQDN(value)) {
    return false;
  }

  if (value.length > 255) {
    return false;
  }

  labels = value.split('.');

  for (i=0; i < labels.length; i++) {
    if (labels[i].length > 63) {
      return false;
    }
  }

  return true;
};

/**
 * Verify that the provided array or object has between min and max number of
 * elements.
 * @param {Object} value Object or array to validate.
 * @param {Number} min Minimum number of elements.
 * @param {Number} max Maximum number of elements.
 */
exports.numItems = function(value, min, max) {
  var len, type = utils.typeOf(value);

  if (type === 'array') {
    len = value.length;
  }
  else if (type === 'object') {
    len = Object.keys(value).length;
  }
  else {
    throw new Error('value must either be a array or an object');
  }

  if (len < min || len > max) {
    throw new Error('Object needs to have between ' + min + ' and ' + max + ' items');
  }

  return value;
};
