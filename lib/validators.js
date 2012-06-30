var check = require('validator').check;

exports.isPort = function(value, baton) {
  value = parseInt(value, 10);

  if (value < 1 || value > 65535) {
    throw new Error('Value out of range [1,65535]');
  }

  return value;
};


exports.isV1UUID = function(str) {
  if (!str.match(/^[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$/)) {
    throw new Error('Invalid UUID');
  } else if ((parseInt(str.charAt(19), 16) & 12) !== 8) {
    throw new Error('Unsupported UUID variant');
  } else if (str.charAt(14) !== '1') {
    throw new Error('UUID is not version 1');
  }

  return str;
};

exports.isHostname = function(value) {
  var pattern = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;
  try {
    check(value).regex(pattern);
  }
  catch (e) {
    return false;
  }

  return true;
};
