'use strict';

const Homey = require('homey');

module.exports = class DevialetSpeakerDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('Devialet Speaker Driver has been initialized');
  }

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    this.log('Discovering Devialet devices via mDNS...');
    
    const discoveryStrategy = this.getDiscoveryStrategy();
    const discoveryResults = discoveryStrategy.getDiscoveryResults();

    this.log('mDNS discoveryStrategy:', discoveryStrategy);
    this.log('mDNS discovery results:', discoveryResults);
    
    const devices = [];

    for (const discoveryResult of Object.values(discoveryResults)) {
      try {
        this.log('Discovered device:', discoveryResult);
        const device = await this.parseDiscoveryResult(discoveryResult);
        if (device) {
          devices.push(device);
        }
      } catch (error) {
        this.error('Error parsing discovery result:', error);
      }
    }

    this.log(`Found ${devices.length} Devialet device(s) via mDNS`);
    return devices;
  }

  /**
   * Parse mDNS discovery result and create device object
   */
  async parseDiscoveryResult(discoveryResult) {
    const { address, port, txt } = discoveryResult;
    
    this.log('Parsing discovery result:', { address, port, txt });
    
    const devicePort = port || 80;
    const path = txt?.path || '/ipcontrol/v1';
    const baseUrl = `http://${address}:${devicePort}${path}`;
    
    try {
      // Get device information from Devialet API
      const deviceInfo = await this.getDeviceInfo(baseUrl);
      
      return {
        name: deviceInfo.deviceName || deviceInfo.model || 'Devialet Speaker',
        data: {
          id: deviceInfo.deviceId,
          systemId: deviceInfo.systemId,
          groupId: deviceInfo.groupId,
          discoveryId: discoveryResult.id,
        },
        store: {
          address: address,
          port: devicePort,
          path: path,
          baseUrl: baseUrl,
          model: deviceInfo.model,
          serial: deviceInfo.serial,
          role: deviceInfo.role,
        },
        settings: {
          ip_address: address,
        },
      };
    } catch (error) {
      this.error(`Failed to get device info from ${address}:`, error.message);
      throw error;
    }
  }

  /**
   * Get device information from Devialet API
   */
  async getDeviceInfo(baseUrl, timeout = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(`${baseUrl}/devices/current`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

};
