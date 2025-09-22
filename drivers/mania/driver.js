'use strict';

const DevialetBaseDriver = require('../../lib/base-driver');

module.exports = class DevialetManiaDriver extends DevialetBaseDriver {

  /**
   * Get the device model type
   */
  getDeviceModel() {
    return 'Mania';
  }

  /**
   * Get the model name to check against
   */
  getModelCheckName() {
    return 'mania';
  }

  /**
   * Get the default device name
   */
  getDefaultDeviceName() {
    return 'Devialet Mania';
  }

};
