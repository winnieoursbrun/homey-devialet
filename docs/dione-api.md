# Devialet Dione API Specification

## Overview

The Devialet Dione soundbar uses a REST API for control and status monitoring. This API differs from the Phantom/Mania speaker APIs, using `/groups/current/` endpoints instead of `/systems/current/` for most operations.

## Base URL

```
http://{device_ip}:80/ipcontrol/v1
```

## Authentication

No authentication required. All endpoints are accessible via HTTP GET/POST requests.

## Endpoints

### System Information

#### GET /systems/current

Retrieves system information including device details, system ID, and group ID.

**Response:**
```json
{
  "systemId": "string",
  "groupId": "string",
  "systemName": "string",
  "devices": [
    {
      "deviceId": "string",
      "deviceName": "string",
      "serial": "string",
      "role": "string",
      "model": "Dione"
    }
  ]
}
```

### Sources

#### GET /groups/current/sources

Retrieves the list of available input sources.

**Response:**
```json
[
  {
    "sourceId": "string",
    "sourceName": "string",
    "sourceType": "string"
  }
]
```

#### GET /groups/current/sources/current

Retrieves the current source and playback state.

**Response:**
```json
{
  "sourceId": "string",
  "sourceName": "string",
  "playingState": "playing|paused|stopped",
  "muteState": "muted|unmuted",
  "metadata": {
    "artist": "string",
    "album": "string",
    "title": "string",
    "coverArtUrl": "string"
  }
}
```

### Volume Control

#### GET /groups/current/sources/current/soundControl/volume

Retrieves the current volume level.

**Response:**
```json
{
  "volume": 50
}
```

#### POST /groups/current/sources/current/soundControl/volume

Sets the volume level.

**Request Body:**
```json
{
  "volume": 50
}
```

**Parameters:**
- `volume`: Integer between 0-100

#### POST /groups/current/sources/current/soundControl/volumeUp

Increases volume by one step.

**Request Body:**
```json
{}
```

#### POST /groups/current/sources/current/soundControl/volumeDown

Decreases volume by one step.

**Request Body:**
```json
{}
```

#### POST /groups/current/sources/current/soundControl/mute

Controls mute state.

**Request Body:**
```json
{
  "state": "muted|unmuted"
}
```

### Playback Control

#### POST /groups/current/sources/current/playback/play

Starts playback.

**Request Body:**
```json
{}
```

#### POST /groups/current/sources/current/playback/pause

Pauses playback.

**Request Body:**
```json
{}
```

#### POST /groups/current/sources/current/playback/next

Skips to next track.

**Request Body:**
```json
{}
```

#### POST /groups/current/sources/current/playback/previous

Skips to previous track.

**Request Body:**
```json
{}
```

### Power Control

#### POST /systems/current/powerOff

Powers off the system.

**Request Body:**
```json
{}
```

**Note:** Power on is only available via physical button or remote control.


## Limitations

- Night mode is not available via API
- Equalizer presets are not available via API
- Power on requires physical interaction
