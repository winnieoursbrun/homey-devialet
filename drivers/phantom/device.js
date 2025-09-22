'use strict';

const DevialetBaseDevice = require('../../lib/base-device');

module.exports = class DevialetPhantomDevice extends DevialetBaseDevice {

  /**
   * Get the device model type
   */
  getDeviceModel() {
    return 'Phantom';
  }

  /**
   * Get the track field name for metadata (Phantom uses 'title')
   */
  getTrackField() {
    return 'title';
  }

};
