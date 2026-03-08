'use strict';

const Homey = require('homey');

module.exports = class DevialetGroupDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('Devialet Group Device has been initialized');
    
    // Get group configuration
    this.groupId = this.getData().id;
    this.memberDeviceIds = this.getStoreValue('memberDeviceIds') || [];
    this.volumeOffsets = {}; // Store relative volume offsets for each member
    
    // Set up capability listeners
    this.registerCapabilityListener('volume_set', this.onCapabilityVolumeSet.bind(this));
    this.registerCapabilityListener('volume_up', this.onCapabilityVolumeUp.bind(this));
    this.registerCapabilityListener('volume_down', this.onCapabilityVolumeDown.bind(this));
    this.registerCapabilityListener('volume_mute', this.onCapabilityVolumeMute.bind(this));
    this.registerCapabilityListener('speaker_playing', this.onCapabilitySpeakerPlaying.bind(this));
    this.registerCapabilityListener('speaker_next', this.onCapabilitySpeakerNext.bind(this));
    this.registerCapabilityListener('speaker_prev', this.onCapabilitySpeakerPrev.bind(this));
    
    // Initialize volume offsets from current member volumes
    await this.initializeVolumeOffsets();
    
    // Set up listeners for member device changes
    this.setupMemberListeners();
    
    // Initial state update
    await this.updateGroupState();
    
    // Set up periodic state updates
    this.stateUpdateInterval = setInterval(() => {
      this.updateGroupState().catch(err => {
        this.error('Failed to update group state:', err);
      });
    }, 30000); // Update every 30 seconds
  }

  /**
   * onAdded is called when the user adds the device.
   */
  onAdded() {
    this.log('Devialet Group Device has been added');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  onDeleted() {
    this.log('Devialet Group Device has been deleted');
    
    // Clean up intervals
    if (this.stateUpdateInterval) {
      clearInterval(this.stateUpdateInterval);
    }
    
    // Remove listeners
    this.removeMemberListeners();
  }

  /**
   * Get all member devices
   */
  getMemberDevices() {
    const allDevices = [];
    const drivers = this.homey.drivers.getDrivers();
    
    for (const driverId in drivers) {
      if (driverId === 'group') continue;
      const driver = drivers[driverId];
      allDevices.push(...driver.getDevices());
    }
    
    return allDevices.filter(device => {
      const deviceId = device.getDeviceId && device.getDeviceId();
      return this.memberDeviceIds.includes(deviceId);
    });
  }

  /**
   * Initialize volume offsets based on current member volumes
   * This preserves the relative volume differences between speakers
   */
  async initializeVolumeOffsets() {
    const members = this.getMemberDevices();
    if (members.length === 0) return;
    
    let maxVolume = 0;
    const volumes = {};
    
    // Get current volume from each member
    for (const member of members) {
      try {
        const volume = member.getCapabilityValue('volume_set');
        if (volume !== null && volume !== undefined) {
          volumes[member.getDeviceId()] = volume;
          maxVolume = Math.max(maxVolume, volume);
        }
      } catch (error) {
        this.error(`Failed to get volume for member ${member.getName()}:`, error);
      }
    }
    
    // Calculate offsets relative to max volume
    // offset = memberVolume / maxVolume (ratio to preserve)
    for (const deviceId in volumes) {
      if (maxVolume > 0) {
        this.volumeOffsets[deviceId] = volumes[deviceId] / maxVolume;
      } else {
        this.volumeOffsets[deviceId] = 1.0; // Equal volumes if all at zero
      }
    }
    
    // Set group volume to the max volume
    await this.setCapabilityValue('volume_set', maxVolume).catch(this.error);
    
    this.log('Initialized volume offsets:', this.volumeOffsets);
  }

  /**
   * Set up listeners for member device changes
   */
  setupMemberListeners() {
    const members = this.getMemberDevices();
    
    for (const member of members) {
      member.on('volumeChanged', this.onMemberVolumeChanged.bind(this));
    }
  }

  /**
   * Remove listeners for member device changes
   */
  removeMemberListeners() {
    const members = this.getMemberDevices();
    
    for (const member of members) {
      member.removeListener('volumeChanged', this.onMemberVolumeChanged.bind(this));
    }
  }

  /**
   * Handle volume changes from member devices
   */
  async onMemberVolumeChanged(data) {
    // Update group volume based on member change
    // This allows individual devices to still control the group
    const members = this.getMemberDevices();
    if (members.length === 0) return;
    
    // Recalculate group volume as the maximum of all member volumes
    let maxVolume = 0;
    for (const member of members) {
      try {
        const volume = member.getCapabilityValue('volume_set');
        if (volume !== null && volume !== undefined) {
          maxVolume = Math.max(maxVolume, volume);
        }
      } catch (error) {
        this.error(`Failed to get volume for member:`, error);
      }
    }
    
    await this.setCapabilityValue('volume_set', maxVolume).catch(this.error);
  }

  /**
   * Update group state from member devices
   */
  async updateGroupState() {
    const members = this.getMemberDevices();
    if (members.length === 0) {
      this.log('No member devices found');
      return;
    }
    
    // Update playback state from first available member
    const firstMember = members.find(m => m.getAvailable && m.getAvailable());
    if (!firstMember) return;
    
    try {
      const isPlaying = firstMember.getCapabilityValue('speaker_playing');
      await this.setCapabilityValue('speaker_playing', isPlaying);
      
      // Update metadata
      const artist = firstMember.getCapabilityValue('speaker_artist');
      const album = firstMember.getCapabilityValue('speaker_album');
      const track = firstMember.getCapabilityValue('speaker_track');
      
      if (artist) await this.setCapabilityValue('speaker_artist', artist);
      if (album) await this.setCapabilityValue('speaker_album', album);
      if (track) await this.setCapabilityValue('speaker_track', track);
      
    } catch (error) {
      this.error('Failed to update group state:', error);
    }
  }

  /**
   * Volume Set Capability - with proportional distribution
   */
  async onCapabilityVolumeSet(value) {
    this.log(`Setting group volume to: ${value}`);
    
    const members = this.getMemberDevices();
    if (members.length === 0) {
      throw new Error('No member devices available');
    }
    
    // Apply proportional volume to each member based on their offset
    const promises = members.map(async (member) => {
      try {
        const deviceId = member.getDeviceId();
        const offset = this.volumeOffsets[deviceId] || 1.0;
        const memberVolume = Math.min(1.0, value * offset);
        
        this.log(`Setting member ${member.getName()} volume to: ${memberVolume} (offset: ${offset})`);
        await member.setCapabilityValue('volume_set', memberVolume);
      } catch (error) {
        this.error(`Failed to set volume for member ${member.getName()}:`, error);
      }
    });
    
    await Promise.all(promises);
    return true;
  }

  /**
   * Volume Up Capability
   */
  async onCapabilityVolumeUp() {
    const currentVolume = this.getCapabilityValue('volume_set') || 0;
    const newVolume = Math.min(1.0, currentVolume + 0.05);
    await this.onCapabilityVolumeSet(newVolume);
    return true;
  }

  /**
   * Volume Down Capability
   */
  async onCapabilityVolumeDown() {
    const currentVolume = this.getCapabilityValue('volume_set') || 0;
    const newVolume = Math.max(0, currentVolume - 0.05);
    await this.onCapabilityVolumeSet(newVolume);
    return true;
  }

  /**
   * Volume Mute Capability
   */
  async onCapabilityVolumeMute(value) {
    this.log(`${value ? 'Muting' : 'Unmuting'} group`);
    
    const members = this.getMemberDevices();
    const promises = members.map(async (member) => {
      try {
        await member.setCapabilityValue('volume_mute', value);
      } catch (error) {
        this.error(`Failed to mute member ${member.getName()}:`, error);
      }
    });
    
    await Promise.all(promises);
    return true;
  }

  /**
   * Speaker Playing Capability
   */
  async onCapabilitySpeakerPlaying(value) {
    this.log(`${value ? 'Playing' : 'Pausing'} group`);
    
    const members = this.getMemberDevices();
    const promises = members.map(async (member) => {
      try {
        await member.setCapabilityValue('speaker_playing', value);
      } catch (error) {
        this.error(`Failed to control playback for member ${member.getName()}:`, error);
      }
    });
    
    await Promise.all(promises);
    return true;
  }

  /**
   * Speaker Next Capability
   */
  async onCapabilitySpeakerNext() {
    this.log('Next track for group');
    
    const members = this.getMemberDevices();
    // Only trigger on first member to avoid duplicate commands
    if (members.length > 0) {
      await members[0].triggerCapabilityListener('speaker_next');
    }
    return true;
  }

  /**
   * Speaker Previous Capability
   */
  async onCapabilitySpeakerPrev() {
    this.log('Previous track for group');
    
    const members = this.getMemberDevices();
    // Only trigger on first member to avoid duplicate commands
    if (members.length > 0) {
      await members[0].triggerCapabilityListener('speaker_prev');
    }
    return true;
  }

};
