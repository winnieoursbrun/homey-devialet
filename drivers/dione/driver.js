'use strict';

const DevialetDioneBaseDriver = require('../../lib/dione-base-driver');

module.exports = class DevialetDioneDriver extends DevialetDioneBaseDriver {

  /**
   * Get the device model type
   */
  getDeviceModel() {
    return 'Dione';
  }

  /**
   * Get the model name to check against
   */
  getModelCheckName() {
    return 'dione';
  }

  /**
   * Get the default device name
   */
  getDefaultDeviceName() {
    return 'Devialet Dione';
  }

};
