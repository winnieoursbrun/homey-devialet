'use strict';

const DevialetBaseDevice = require('../../lib/base-device');

module.exports = class DevialetManiaDevice extends DevialetBaseDevice {

  /**
   * Get the device model type
   */
  getDeviceModel() {
    return 'Mania';
  }

  /**
   * Get the track field name for metadata (Mania uses 'track')
   */
  getTrackField() {
    return 'track';
  }

};
