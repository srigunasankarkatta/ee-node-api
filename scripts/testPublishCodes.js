'use strict';

/**
 * Manual test for publishDailyCodes().
 *
 * Usage:
 *   node scripts/testPublishCodes.js          — run against today's codes (idempotent)
 *   node scripts/testPublishCodes.js --clean  — delete today's codes first, then re-publish
 *
 * Pass to verify the "no regular_am codes published" fix works correctly.
 */

require('dotenv').config();

const { connectDB, sequelize } = require('../src/config/database');
const TradingCode = require('../src/models/TradingCode');
const { publishDailyCodes } = require('../src/jobs/publishDailyCodes');

const PLANS     = ['P1', 'P2', 'P3', 'P4', 'P5'];
const SLOT_TYPES = ['welcome', 'regular_am', 'regular_pm', 'referral'];
const EXPECTED  = PLANS.length * SLOT_TYPES.length; // 20

const CLEAN = process.argv.includes('--clean');

// Returns today in IST as YYYY-MM-DD (mirrors publishDailyCodes logic)
function todayIST() {
  const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return nowIST.toISOString().split('T')[0];
}

function pass(msg) { console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function fail(msg) { console.log(`  \x1b[31m✗\x1b[0m ${msg}`); }
function info(msg) { console.log(`  \x1b[33m→\x1b[0m ${msg}`); }

async function run() {
  console.log('\n=== publishDailyCodes test ===\n');

  await connectDB();

  const date = todayIST();
  info(`Target date (IST): ${date}`);

  if (CLEAN) {
    const deleted = await TradingCode.destroy({ where: { code_date: date } });
    info(`--clean: deleted ${deleted} existing rows for ${date}`);
  }

  // Count before
  const before = await TradingCode.count({ where: { code_date: date } });
  info(`Rows in DB before publish: ${before}`);

  console.log('\n--- Running publishDailyCodes() ---\n');
  await publishDailyCodes();
  console.log('\n--- Done ---\n');

  // Verify counts
  const rows = await TradingCode.findAll({ where: { code_date: date } });

  console.log('Results:\n');

  // Per slot-type check
  let allPassed = true;
  for (const slotType of SLOT_TYPES) {
    const matching = rows.filter((r) => r.code_type === slotType);
    const ok = matching.length === PLANS.length;
    if (ok) {
      pass(`${slotType}: ${matching.length} rows (${PLANS.join(', ')})`);
    } else {
      const foundPlans = matching.map((r) => r.plan_id);
      const missing    = PLANS.filter((p) => !foundPlans.includes(p));
      fail(`${slotType}: found ${matching.length}/${PLANS.length} — missing plans: ${missing.join(', ')}`);
      allPassed = false;
    }
  }

  // Total check
  console.log('');
  if (rows.length === EXPECTED) {
    pass(`Total: ${rows.length}/${EXPECTED} rows — all good`);
  } else {
    fail(`Total: ${rows.length}/${EXPECTED} rows — something is missing`);
    allPassed = false;
  }

  // Spot-check: show one regular_am code so you can see the format
  const sample = rows.find((r) => r.code_type === 'regular_am' && r.plan_id === 'P1');
  if (sample) {
    console.log('');
    info(`Sample regular_am/P1 code: ${JSON.stringify(sample.codes[0])}  slot: ${sample.slot_start}–${sample.slot_end}`);
  }

  console.log('');
  if (allPassed) {
    console.log('\x1b[32mALL CHECKS PASSED\x1b[0m\n');
    process.exitCode = 0;
  } else {
    console.log('\x1b[31mSOME CHECKS FAILED\x1b[0m\n');
    process.exitCode = 1;
  }

  await sequelize.close();
}

run().catch((err) => {
  console.error('\nUnexpected error:', err.message);
  process.exit(1);
});
