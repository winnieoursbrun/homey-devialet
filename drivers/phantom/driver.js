'use strict';

const DevialetBaseDriver = require('../../lib/base-driver');

module.exports = class DevialetPhantomDriver extends DevialetBaseDriver {

  /**
   * Get the device model type
   */
  getDeviceModel() {
    return 'Phantom';
  }

  /**
   * Get the model name to check against
   */
  getModelCheckName() {
    return 'phantom';
  }

  /**
   * Get the default device name
   */
  getDefaultDeviceName() {
    return 'Devialet Phantom';
  }

};
