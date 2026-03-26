# CLAUDE.md

## Project overview

Single-file Node.js app (`power.js`) that bridges a Powerley Energy Bridge to Home Assistant. It subscribes to the bridge's MQTT broker and forwards instantaneous power demand to HA via the REST API.

## Architecture

- **power.js** — the entire application. Connects to MQTT, parses messages, posts to Home Assistant. No build step, no transpilation.
- **dotenv** loads secrets from `.env` at startup. CLI args (via yargs) override env vars.
- The MQTT broker runs on the Energy Bridge itself at port 2883 (not a standard broker).

## Key details

- The HA entity updated is `sensor.bcydro_demand` (hardcoded in `postToHomeAssistant()`).
- Two MQTT topics carry demand data: `event/metering/instantaneous_demand` and `_zigbee_metering/event/metering/instantaneous_demand`. Both are handled identically.
- The `--auth` flag enables MQTT username/password authentication, needed for older Energy Bridge firmwares.
- Uses Node's built-in `fetch` (requires Node 18+).

## Development

```bash
npm install
cp .env.example .env  # fill in real values
node power.js
```

No tests. No build step. Run directly with Node.

## Secrets

All secrets live in `.env` (gitignored). Never commit credentials. The `.env.example` file documents the required variables.
