'use strict';

const logger = require('../config/logger');

// ---------------------------------------------------------------------------
// Delivery channel implementations
// ---------------------------------------------------------------------------

function deliverLog(user, message) {
  logger.info(`[NOTIFY] ${user.name} (${user.phone}) → ${message}`);
}

async function deliverWhatsApp(user, message) {
  // TODO: replace with WhatsApp Business API (WATI / MSG91 / Twilio)
  // Example — MSG91 WhatsApp:
  //   await axios.post('https://api.msg91.com/api/v5/whatsapp/...', {
  //     to: `91${user.phone}`,
  //     message,
  //   }, { headers: { authkey: process.env.MSG91_AUTH_KEY } });
  deliverLog(user, `[WhatsApp not configured] ${message}`);
}

async function deliverSMS(user, message) {
  // TODO: replace with SMS provider (MSG91 / Twilio / Fast2SMS)
  deliverLog(user, `[SMS not configured] ${message}`);
}

async function deliverPush(user, message) {
  // TODO: replace with Firebase FCM
  deliverLog(user, `[Push not configured] ${message}`);
}

const CHANNELS = {
  log:       deliverLog,
  whatsapp:  deliverWhatsApp,
  sms:       deliverSMS,
  push:      deliverPush,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

async function notify(user, message, channel = 'log') {
  const deliver = CHANNELS[channel] || deliverLog;
  try {
    await deliver(user, message);
  } catch (err) {
    logger.error(`[NOTIFY] Failed for ${user.phone}: ${err.message}`);
  }
}

async function notifyBulk(users, messageFn, channel = 'log') {
  for (const user of users) {
    await notify(user, messageFn(user), channel);
  }
  logger.info(`[NOTIFY] Sent ${channel} notifications to ${users.length} user(s)`);
}

module.exports = { notify, notifyBulk };
