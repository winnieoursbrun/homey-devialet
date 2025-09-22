'use strict';

const Homey = require('homey');

module.exports = class DevialetBaseDevice extends Homey.Device {

  /**
   * Get the device model type (should be overridden by child classes)
   */
  getDeviceModel() {
    throw new Error('getDeviceModel() must be implemented by child classes');
  }

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log(`Devialet ${this.getDeviceModel()} Device has been initialized`);
    
    // Get device configuration
    this.baseUrl = this.getStoreValue('baseUrl');
    this.deviceId = this.getData().id;
    this.systemId = this.getData().systemId;
    this.groupId = this.getData().groupId;
    
    // Set up capability listeners
    this.registerCapabilityListener('volume_set', this.onCapabilityVolumeSet.bind(this));
    this.registerCapabilityListener('volume_up', this.onCapabilityVolumeUp.bind(this));
    this.registerCapabilityListener('volume_down', this.onCapabilityVolumeDown.bind(this));
    this.registerCapabilityListener('volume_mute', this.onCapabilityVolumeMute.bind(this));
    this.registerCapabilityListener('speaker_playing', this.onCapabilitySpeakerPlaying.bind(this));
    this.registerCapabilityListener('speaker_next', this.onCapabilitySpeakerNext.bind(this));
    this.registerCapabilityListener('speaker_prev', this.onCapabilitySpeakerPrev.bind(this));
    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
    
    // Initial state update
    await this.updateDeviceState();
    
    // Sync night mode setting with device state on startup
    try {
      const currentNightMode = this.getSetting('night_mode');
      if (currentNightMode !== undefined) {
        await this.setNightMode(currentNightMode);
      }
    } catch (error) {
      this.log('Failed to sync night mode on init:', error.message);
    }

    // Sync equalizer preset setting with device state on startup
    try {
      const currentEqualizer = this.getSetting('equalizer_preset');
      if (currentEqualizer !== undefined) {
        await this.setEqualizerPreset(currentEqualizer);
      }
    } catch (error) {
      this.log('Failed to sync equalizer preset on init:', error.message);
    }
    
    // Set up periodic state updates
    this.stateUpdateInterval = setInterval(() => {
      this.updateDeviceState().catch(err => {
        this.error('Failed to update device state:', err);
      });
    }, 30000); // Update every 30 seconds
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  onAdded() {
    this.log(`Devialet ${this.getDeviceModel()} Device has been added`);
  }

  /**
   * onSettings is called when the user updates the device's settings.
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log(`Devialet ${this.getDeviceModel()} Device settings changed`);
    
    if (changedKeys.includes('ip_address')) {
      // Update base URL if IP address changed
      const port = this.getStoreValue('port') || 80;
      const path = this.getStoreValue('path') || '/ipcontrol/v1';
      this.baseUrl = `http://${newSettings.ip_address}:${port}${path}`;
      await this.setStoreValue('baseUrl', this.baseUrl);
    }

    if (changedKeys.includes('night_mode')) {
      // Update night mode setting on the device
      try {
        await this.setNightMode(newSettings.night_mode);
        this.log(`Night mode ${newSettings.night_mode ? 'enabled' : 'disabled'}`);
      } catch (error) {
        this.error('Failed to set night mode:', error);
        throw new Error(`Failed to set night mode: ${error.message}`);
      }
    }

    if (changedKeys.includes('equalizer_preset')) {
      // Update equalizer preset on the device
      try {
        await this.setEqualizerPreset(newSettings.equalizer_preset);
        this.log(`Equalizer preset changed to: ${newSettings.equalizer_preset}`);
      } catch (error) {
        this.error('Failed to set equalizer preset:', error);
        throw new Error(`Failed to set equalizer preset: ${error.message}`);
      }
    }
  }

  /**
   * onRenamed is called when the user updates the device's name.
   */
  onRenamed(name) {
    this.log(`Devialet ${this.getDeviceModel()} Device was renamed to:`, name);
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  onDeleted() {
    this.log(`Devialet ${this.getDeviceModel()} Device has been deleted`);
    
    // Clean up intervals
    if (this.stateUpdateInterval) {
      clearInterval(this.stateUpdateInterval);
    }
  }

  /**
   * Update device address (called when mDNS discovery finds address change)
   */
  async updateAddress(address, port) {
    this.log('Updating device address:', address, port || 80);
    
    const path = this.getStoreValue('path') || '/ipcontrol/v1';
    const newPort = port || 80;
    this.baseUrl = `http://${address}:${newPort}${path}`;
    
    await this.setStoreValue('baseUrl', this.baseUrl);
    await this.setStoreValue('address', address);
    await this.setStoreValue('port', newPort);
    await this.setSettings({ ip_address: address });
    
    this.log('Device address updated successfully');
  }

  /**
   * Called when a discovery result matches this device
   */
  onDiscoveryResult(discoveryResult) {
    // Return true if this discovery result matches our device
    return discoveryResult.id === this.getData().discoveryId;
  }

  /**
   * Called when the device has been found via discovery
   */
  onDiscoveryAvailable(discoveryResult) {
    this.log('Device discovered and available:', discoveryResult.address);
    
    // Update the device address if it has changed
    const currentAddress = this.getStoreValue('address');
    if (currentAddress !== discoveryResult.address) {
      this.updateAddress(discoveryResult.address, discoveryResult.port).catch(this.error);
    }
    
    // Update device state
    this.updateDeviceState().catch(this.error);
  }

  /**
   * Called when the device address has changed
   */
  onDiscoveryAddressChanged(discoveryResult) {
    this.log('Device address changed:', discoveryResult.address);
    this.updateAddress(discoveryResult.address, discoveryResult.port).catch(this.error);
  }

  /**
   * Called when the device was last seen (for offline detection)
   */
  onDiscoveryLastSeenChanged(discoveryResult) {
    this.log('Device last seen changed:', new Date(discoveryResult.lastSeen));
    
    // Try to reconnect if the device has been offline
    this.updateDeviceState().catch(err => {
      this.error('Failed to update device state after last seen change:', err);
    });
  }

  /**
   * Make HTTP request to Devialet API
   */
  async makeRequest(endpoint, method = 'GET', body = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    };
    
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }
    
    try {
      this.log(`Making ${method} request to: ${url}`);
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (response.headers.get('content-type')?.includes('application/json')) {
        return response.json();
      }
      
      return null;
    } catch (error) {
      this.error(`Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Update device state from API
   */
  async updateDeviceState() {
    try {
      await this.updateVolumeState();
      await this.updatePlaybackState();
      await this.updateNightModeState();
      await this.updateEqualizerState();
      
      // Device is considered "on" if it's reachable
      await this.setCapabilityValue('onoff', true);
      
    } catch (error) {
      this.error('Failed to update device state:', error);
      // Mark device as offline if we can't reach it
      await this.setCapabilityValue('onoff', false);
    }
  }

  /**
   * Update volume state from API
   */
  async updateVolumeState() {
    if (!this.systemId) return;
    
    const volumeData = await this.makeRequest(`/systems/current/sources/current/soundControl/volume`);
    if (volumeData?.volume !== undefined) {
      await this.setCapabilityValue('volume_set', volumeData.volume / 100);
    }
  }

  /**
   * Update playback state from API
   */
  async updatePlaybackState() {
    if (!this.groupId) return;
    
    const playbackData = await this.makeRequest(`/groups/current/sources/current`);
    if (!playbackData) return;
    
    const isPlaying = playbackData.playingState === 'playing';
    await this.setCapabilityValue('speaker_playing', isPlaying);
    
    // Update metadata if available
    await this.updateMetadata(playbackData.metadata);
  }

  /**
   * Update night mode state from API
   */
  async updateNightModeState() {
    if (!this.systemId) return;
    
    try {
      const nightModeData = await this.makeRequest(`/systems/current/settings/audio/nightMode`);
      if (nightModeData?.nightMode !== undefined) {
        const isNightModeOn = nightModeData.nightMode === 'on';
        const currentSetting = this.getSetting('night_mode');
        
        // Update setting if it differs from device state
        if (currentSetting !== isNightModeOn) {
          await this.setSettings({ night_mode: isNightModeOn });
        }
      }
    } catch (error) {
      // Night mode might not be supported on this device
      this.log('Night mode not supported or failed to retrieve state:', error.message);
    }
  }

  /**
   * Set night mode on/off
   */
  async setNightMode(enabled) {
    if (!this.systemId) return;
    
    const nightModeValue = enabled ? 'on' : 'off';
    await this.makeRequest(`/systems/current/settings/audio/nightMode`, 'POST', { 
      nightMode: nightModeValue 
    });
  }

  /**
   * Update equalizer state from API
   */
  async updateEqualizerState() {
    if (!this.systemId) return;
    
    try {
      const equalizerData = await this.makeRequest(`/systems/current/settings/audio/equalizer`);
      if (equalizerData?.preset !== undefined) {
        const currentSetting = this.getSetting('equalizer_preset');
        
        // Update setting if it differs from device state
        if (currentSetting !== equalizerData.preset) {
          await this.setSettings({ equalizer_preset: equalizerData.preset });
        }
      }
    } catch (error) {
      // Equalizer might not be supported on this device
      this.log('Equalizer not supported or failed to retrieve state:', error.message);
    }
  }

  /**
   * Set equalizer preset
   */
  async setEqualizerPreset(preset) {
    if (!this.systemId) return;
    
    // Validate preset value
    const validPresets = ['flat', 'voice', 'custom'];
    if (!validPresets.includes(preset)) {
      throw new Error(`Invalid equalizer preset: ${preset}. Valid presets are: ${validPresets.join(', ')}`);
    }
    
    await this.makeRequest(`/systems/current/settings/audio/equalizer`, 'POST', { 
      preset: preset 
    });
  }

  /**
   * Update metadata from playback data
   * Override this method in child classes if needed for device-specific metadata handling
   */
  async updateMetadata(metadata) {
    if (!metadata) return;
    
    if (metadata.artist) {
      await this.setCapabilityValue('speaker_artist', metadata.artist);
    }
    if (metadata.album) {
      await this.setCapabilityValue('speaker_album', metadata.album);
    }
    
    // Handle title/track field - default to 'title', can be overridden
    const trackField = this.getTrackField();
    if (metadata[trackField]) {
      await this.setCapabilityValue('speaker_track', metadata[trackField]);
    }

    // Set album art if available
    if (metadata.coverArtUrl && this.currentCoverArtUrl !== metadata.coverArtUrl) {
      try {
        this.currentCoverArtUrl = metadata.coverArtUrl;
        const albumArtImage = await this.homey.images.createImage('jpg');
        albumArtImage.setUrl(metadata.coverArtUrl);
        await this.setAlbumArtImage(albumArtImage);
      } catch (error) {
        this.error('Failed to set album art:', error);
      }
    }
  }

  /**
   * Get the track field name for metadata
   * Override this method in child classes if the field name is different
   */
  getTrackField() {
    return 'title';
  }

  /**
   * Volume Set Capability
   */
  async onCapabilityVolumeSet(value) {
    const volume = Math.round(value * 100);
    await this.makeRequest(`/systems/current/sources/current/soundControl/volume`, 'POST', { volume });
    return true;
  }

  /**
   * Volume Up Capability
   */
  async onCapabilityVolumeUp() {
    await this.makeRequest(`/systems/current/sources/current/soundControl/volumeUp`, 'POST', {});
    return true;
  }

  /**
   * Volume Down Capability
   */
  async onCapabilityVolumeDown() {
    await this.makeRequest(`/systems/current/sources/current/soundControl/volumeDown`, 'POST', {});
    return true;
  }

  /**
   * Volume Mute Capability
   */
  async onCapabilityVolumeMute(value) {
    const endpoint = value ? 'mute' : 'unmute';
    await this.makeRequest(`/groups/current/sources/current/playback/${endpoint}`, 'POST', {});
    return true;
  }

  /**
   * Speaker Playing Capability
   */
  async onCapabilitySpeakerPlaying(value) {
    const endpoint = value ? 'play' : 'pause';
    await this.makeRequest(`/groups/current/sources/current/playback/${endpoint}`, 'POST', {});
    return true;
  }

  /**
   * Speaker Next Capability
   */
  async onCapabilitySpeakerNext() {
    await this.makeRequest(`/groups/current/sources/current/playback/next`, 'POST', {});
    return true;
  }

  /**
   * Speaker Previous Capability
   */
  async onCapabilitySpeakerPrev() {
    await this.makeRequest(`/groups/current/sources/current/playback/previous`, 'POST', {});
    return true;
  }

  /**
   * On/Off Capability
   */
  async onCapabilityOnoff(value) {
    if (!value) {
      // Power off the system
      await this.makeRequest(`/systems/current/powerOff`, 'POST', {});
    }
    // Note: Turning on is only possible by pressing physical button according to API docs
    return true;
  }

};