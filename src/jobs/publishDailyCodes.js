'use strict';

// Codes are pre-seeded from src/data/Xceed Code & Value.xlsx (see seeder
// 20240101000005-trading-codes-from-sheet5.js). Each user's code is looked
// up by their personal day_number + plan_id, so there is nothing to publish
// nightly. This function is intentionally a no-op.

async function publishDailyCodes() {}

module.exports = { publishDailyCodes };
