'use strict';

const Homey = require('homey');

/**
 * Devialet Dione Base Device Class
 *
 * The Dione soundbar uses different API endpoints compared to Phantom/Mania speakers.
 * This base class implements the Dione-specific API structure while maintaining
 * compatibility with the Homey app architecture.
 *
 * Key differences from Phantom/Mania:
 * - Uses /groups/current/ instead of /systems/current/ for most operations
 * - System info endpoint is /systems/current (not /devices/current)
 * - Some features like mute and night mode may have different or unavailable endpoints
 */
module.exports = class DevialetDioneBaseDevice extends Homey.Device {

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
   * Make HTTP request to Devialet Dione API
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
   * Dione uses /groups/current/ instead of /systems/current/
   */
  async updateVolumeState() {
    if (!this.groupId) return;

    try {
      const volumeData = await this.makeRequest(`/groups/current/sources/current/soundControl/volume`);
      if (volumeData?.volume !== undefined) {
        await this.setCapabilityValue('volume_set', volumeData.volume / 100);
      }
    } catch (error) {
      this.log('Failed to update volume state:', error.message);
    }
  }

  /**
   * Update playback state from API
   * Dione uses /groups/current/sources/current endpoint
   */
  async updatePlaybackState() {
    if (!this.groupId) return;

    try {
      const playbackData = await this.makeRequest(`/groups/current/sources/current`);
      if (!playbackData) return;

      const isPlaying = playbackData.playingState === 'playing';
      await this.setCapabilityValue('speaker_playing', isPlaying);

      // Update mute state from the API response
      if (playbackData.muteState !== undefined) {
        const isMuted = playbackData.muteState === 'muted';
        await this.setCapabilityValue('volume_mute', isMuted);
      }

      // Update metadata if available
      await this.updateMetadata(playbackData.metadata);
    } catch (error) {
      this.log('Failed to update playback state:', error.message);
    }
  }

  /**
   * Update metadata from playback data
   */
  async updateMetadata(metadata) {
    if (!metadata) return;

    if (metadata.artist) {
      await this.setCapabilityValue('speaker_artist', metadata.artist);
    }
    if (metadata.album) {
      await this.setCapabilityValue('speaker_album', metadata.album);
    }

    // Dione uses 'title' field for track name
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
   * Dione uses 'title' field
   */
  getTrackField() {
    return 'title';
  }

  /**
   * Volume Set Capability
   * Dione uses /groups/current/ path
   */
  async onCapabilityVolumeSet(value) {
    const volume = Math.round(value * 100);
    await this.makeRequest(`/groups/current/sources/current/soundControl/volume`, 'POST', { volume });
    return true;
  }

  /**
   * Volume Up Capability
   * Note: Volume up/down may not be supported on Dione, falling back to increment/decrement
   */
  async onCapabilityVolumeUp() {
    try {
      // Try the direct volumeUp endpoint first
      await this.makeRequest(`/groups/current/sources/current/soundControl/volumeUp`, 'POST', {});
    } catch (error) {
      // If not supported, get current volume and increase by 5
      this.log('volumeUp endpoint not available, using manual increment');
      const currentVolume = this.getCapabilityValue('volume_set');
      const newVolume = Math.min(1.0, currentVolume + 0.05);
      await this.onCapabilityVolumeSet(newVolume);
    }
    return true;
  }

  /**
   * Volume Down Capability
   */
  async onCapabilityVolumeDown() {
    try {
      // Try the direct volumeDown endpoint first
      await this.makeRequest(`/groups/current/sources/current/soundControl/volumeDown`, 'POST', {});
    } catch (error) {
      // If not supported, get current volume and decrease by 5
      this.log('volumeDown endpoint not available, using manual decrement');
      const currentVolume = this.getCapabilityValue('volume_set');
      const newVolume = Math.max(0.0, currentVolume - 0.05);
      await this.onCapabilityVolumeSet(newVolume);
    }
    return true;
  }

  /**
   * Volume Mute Capability
   * Dione mute endpoint needs to be verified - may use different structure
   */
  async onCapabilityVolumeMute(value) {
    try {
      const muteState = value ? 'muted' : 'unmuted';
      await this.makeRequest(`/groups/current/sources/current/soundControl/mute`, 'POST', { state: muteState });
    } catch (error) {
      this.error('Mute control failed:', error.message);
      // Mute might not be supported via API on Dione
      throw new Error('Mute control is not available on this device');
    }
    return true;
  }

  /**
   * Speaker Playing Capability
   * Dione uses /groups/current/sources/current/playback path
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
   * Dione power management - turning off may be supported, turning on requires physical button
   */
  async onCapabilityOnoff(value) {
    if (!value) {
      try {
        // Try to power off the system
        await this.makeRequest(`/systems/current/powerOff`, 'POST', {});
      } catch (error) {
        this.error('Power off failed:', error.message);
        throw new Error('Power off is not available on this device');
      }
    }
    // Note: Turning on is only possible by pressing physical button or via remote
    return true;
  }

};
