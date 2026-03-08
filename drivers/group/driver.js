'use strict';

const Homey = require('homey');

module.exports = class DevialetGroupDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('Devialet Group Driver has been initialized');
  }

  /**
   * onPairListDevices is called when a user starts pairing.
   */
  async onPairListDevices() {
    this.log('Listing available Devialet groups');
    
    // Get all Devialet devices from the app
    const devialetDevices = this.homey.drivers.getDrivers();
    const allDevices = [];
    
    for (const driverId in devialetDevices) {
      if (driverId === 'group') continue; // Skip group driver itself
      
      const driver = devialetDevices[driverId];
      const devices = driver.getDevices();
      allDevices.push(...devices);
    }
    
    // Group devices by groupId
    const groupMap = new Map();
    
    for (const device of allDevices) {
      const groupId = device.getGroupId && device.getGroupId();
      if (!groupId) continue;
      
      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, {
          groupId: groupId,
          devices: []
        });
      }
      
      groupMap.get(groupId).devices.push(device);
    }
    
    // Create list of groups for pairing
    const groupsList = [];
    
    for (const [groupId, groupData] of groupMap.entries()) {
      // Only show groups with multiple devices or at least one device
      if (groupData.devices.length === 0) continue;
      
      const deviceNames = groupData.devices.map(d => d.getName()).join(', ');
      const groupName = `Group: ${deviceNames}`;
      
      groupsList.push({
        name: groupName,
        data: {
          id: groupId
        },
        store: {
          memberDeviceIds: groupData.devices.map(d => d.getData().id)
        }
      });
    }
    
    this.log(`Found ${groupsList.length} groups`);
    return groupsList;
  }

};
