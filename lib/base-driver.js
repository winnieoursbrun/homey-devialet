'use strict';

const Homey = require('homey');

module.exports = class DevialetBaseDriver extends Homey.Driver {

  /**
   * Get the device model type (should be overridden by child classes)
   */
  getDeviceModel() {
    throw new Error('getDeviceModel() must be implemented by child classes');
  }

  /**
   * Get the model name to check against (should be overridden by child classes)
   */
  getModelCheckName() {
    throw new Error('getModelCheckName() must be implemented by child classes');
  }

  /**
   * Get the default device name (should be overridden by child classes)
   */
  getDefaultDeviceName() {
    throw new Error('getDefaultDeviceName() must be implemented by child classes');
  }

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log(`Devialet ${this.getDeviceModel()} Driver has been initialized`);
  }

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    this.log(`Discovering Devialet ${this.getDeviceModel()} devices via mDNS...`);
    
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

    this.log(`Found ${devices.length} Devialet ${this.getDeviceModel()} device(s) via mDNS`);
    return devices;
  }

  /**
   * Parse mDNS discovery result and create device object
   */
  async parseDiscoveryResult(discoveryResult) {
    const { address, port, txt } = discoveryResult;
    
    this.log('Parsing discovery result:', { address, port, txt });
    
    const modelCheckName = this.getModelCheckName().toLowerCase();
    
    // Check if the device model contains the expected model name (case insensitive)
    if (txt?.model && !txt.model.toLowerCase().includes(modelCheckName)) {
      this.log(`Skipping device ${address} - model "${txt.model}" is not a ${this.getDeviceModel()} device`);
      return null;
    }
    
    const devicePort = port || 80;
    const path = txt?.path || '/ipcontrol/v1';
    const baseUrl = `http://${address}:${devicePort}${path}`;
    
    try {
      // Get device information from Devialet API
      const deviceInfo = await this.getDeviceInfo(baseUrl);
      
      // Double-check the model from the API response
      if (deviceInfo.model && !deviceInfo.model.toLowerCase().includes(modelCheckName)) {
        this.log(`Skipping device ${address} - API model "${deviceInfo.model}" is not a ${this.getDeviceModel()} device`);
        return null;
      }
      
      return {
        name: deviceInfo.deviceName || deviceInfo.model || this.getDefaultDeviceName(),
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