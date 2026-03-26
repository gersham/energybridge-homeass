# energybridge-homeass

Bridges a Powerley Energy Bridge to Home Assistant by subscribing to the bridge's MQTT broker and forwarding real-time power demand readings via the HA REST API.

The Energy Bridge (commonly bundled with BC Hydro smart meters) publishes instantaneous demand data over MQTT on port 2883. This app subscribes to those messages and updates a `sensor.bcydro_demand` entity in Home Assistant with the current wattage.

## Setup

```bash
npm install
cp .env.example .env   # then fill in your values
```

### Environment variables

| Variable | Description | Required |
|---|---|---|
| `ENERGYBRIDGE_IP` | IP address of the Energy Bridge | Yes |
| `HA_URL` | Home Assistant base URL (e.g. `http://192.168.1.10:8123`) | Yes |
| `HA_TOKEN` | Home Assistant long-lived access token | Yes |
| `MQTT_USERNAME` | MQTT username (only used with `--auth` flag) | No |
| `MQTT_PASSWORD` | MQTT password (only used with `--auth` flag) | No |

All of these can also be passed as command-line arguments (run `node power.js --help` for details).

## Usage

```bash
node power.js
```

### Command-line options

```
--ip        IP address of energy bridge (default: $ENERGYBRIDGE_IP)
--addr      Address for Prometheus exporter (default: :9525)
--auth      Send MQTT authentication (needed for older firmwares)
--haUrl     Home Assistant URL
--haToken   Home Assistant long-lived access token
-h, --help  Show help
```

## Running as a service

A systemd user service works well for running this on boot:

```ini
# ~/.config/systemd/user/energybridge.service
[Unit]
Description=Energy Bridge MQTT to Home Assistant
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/path/to/energybridge
ExecStart=/usr/bin/node power.js
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
```

```bash
systemctl --user enable --now energybridge
loginctl enable-linger $USER   # so it starts at boot, not just login
```

## How it works

1. Connects to the Energy Bridge's MQTT broker at `<ip>:2883`
2. Subscribes to all topics (`#`)
3. Listens for `event/metering/instantaneous_demand` messages
4. POSTs the demand value (in watts) to Home Assistant's REST API as `sensor.bcydro_demand`

## License

ISC
