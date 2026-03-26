#!/usr/bin/env node

require('dotenv').config();
const mqtt = require('mqtt');
const yargs = require('yargs');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // Import node-fetch

// Parse command-line arguments
const argv = yargs
  .option('ip', {
    describe: 'IP address of energy bridge',
    demandOption: true,
    default: process.env.ENERGYBRIDGE_IP || '10.1.221.25'
  })
  .option('addr', {
    describe: 'Address to listen on for Prometheus exporter',
    default: ':9525',
  })
  .option('auth', {
    describe: 'Send authentication information (needed for older firmwares)',
    type: 'boolean',
    default: false,
  })
  .option('haUrl', {
    describe: 'Home Assistant URL, including port if necessary',
    demandOption: true,
    default: process.env.HA_URL || 'http://10.3.103.91:8123',
    type: 'string',
  })
  .option('haToken', {
    describe: 'Long-Lived Access Token for Home Assistant',
    demandOption: true,
    default: process.env.HA_TOKEN,
    type: 'string',
  })
  .help()
  .alias('help', 'h')
  .argv;

// MQTT client options
const options = {
  clientId: "powerley-energybridge-homekit",
  connectTimeout: 10 * 1000,
};

if (argv.auth) {
  options.username = process.env.MQTT_USERNAME || "admin";
  options.password = process.env.MQTT_PASSWORD || "trinity";
}

const client = mqtt.connect(`mqtt://${argv.ip}:2883`, options);

client.on('connect', () => {
  console.log('MQTT connection established');
  // Subscribe to topics
  client.subscribe("#", (err) => {
    if (!err) {
      console.log("Subscribed to all topics");
    } else {
      console.error("Failed to subscribe:", err);
    }
  });
});

client.on('error', (err) => {
  console.log(`MQTT connection error: ${err}`);
});

client.on('message', (topic, message) => {
  // Logging every message received
  console.log(`Received message on ${topic}: ${message.toString()}`);

  // Example handling different topics with JSON payloads
  try {
    const payload = JSON.parse(message.toString());
    switch (topic) {
      case "announce":
        // Process announcement messages
        console.log(`EBOSVersion: ${payload.eb_os_version}, Serial: ${payload.serial}`);
        break;
      case "_zigbee_metering/event/metering/instantaneous_demand":
      case "event/metering/instantaneous_demand":
        // Process demand messages
        console.log(`Instantaneous demand: ${payload.demand} W`);
        postToHomeAssistant(payload.demand, argv.haUrl, argv.haToken);
        break;
      // Add more cases as needed
      default:
        console.log("Unhandled topic.");
    }
  } catch (e) {
    console.error("Error parsing message payload:", e);
  }
});

// Function to post data to Home Assistant
function postToHomeAssistant(demand, haUrl, haToken) {
  const entity_id = 'sensor.bcydro_demand'; // Example entity ID, adjust as needed
  const url = `${haUrl}/api/states/${entity_id}`;
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${haToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      state: demand,
      attributes: {
        unit_of_measurement: 'W',
        friendly_name: 'BCHydro Demand'
      }
    }),
  };

  fetch(url, options)
    .then(response => response.json())
    .then(data => console.log('Success:', data))
    .catch((error) => console.error('Error:', error));
}


// Ensuring graceful shutdown on interrupt
process.on('SIGINT', () => {
  client.end(() => {
    console.log("MQTT client disconnected on interrupt.");
    process.exit(0);
  });
});
