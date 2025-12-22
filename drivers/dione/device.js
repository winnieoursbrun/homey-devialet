'use strict';

const DevialetDioneBaseDevice = require('../../lib/dione-base-device');

module.exports = class DevialetDioneDevice extends DevialetDioneBaseDevice {

  /**
   * Get the device model type
   */
  getDeviceModel() {
    return 'Dione';
  }

  /**
   * Get the track field name for metadata (Dione uses 'title')
   */
  getTrackField() {
    return 'title';
  }

};
