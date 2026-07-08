'use strict';

/**
 * Daily Trading Codes & Profits — Integration Test Suite
 *
 * Covers the full lifecycle without waiting for real-time windows:
 *   Phase 1  — Trading code seed verification (Sheet5 codes in DB)
 *   Phase 2  — Test user + plan subscription setup
 *   Phase 3  — Code submissions (bypasses IST time-gate via direct DB insert)
 *   Phase 4  — Pre-credit state (wallet = 0, all pending)
 *   Phase 5  — Credit job run (backdate submitted_at, call job directly)
 *   Phase 6  — Post-credit assertions (balance, transactions, consistency)
 *   Phase 7  — Idempotency (second job run must NOT double-credit)
 *   Phase 8  — Cross-plan code uniqueness (P1–P4 must have different codes)
 *   Phase 9  — Profit history service (getProfitHistory shape + accuracy)
 *
 * Run:   node tests/test-daily-cycle.js
 * Needs: DB running, migrations applied, seeders run (npm run db:seed)
 * Safe:  Creates test-only data, cleans up in finally block regardless of outcome.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { v4: uuidv4 } = require('uuid');
const { Op }         = require('sequelize');
const bcrypt         = require('bcryptjs');

const { sequelize }  = require('../src/config/database');
const User              = require('../src/models/User');
const UserPlan          = require('../src/models/UserPlan');
const TradingCode       = require('../src/models/TradingCode');
const CodeSubmission    = require('../src/models/CodeSubmission');
const WalletTransaction = require('../src/models/WalletTransaction');
const PlanProjection    = require('../src/models/PlanProjection');
const { creditPendingSubmissions } = require('../src/jobs/creditPendingSubmissions');
const profitService     = require('../src/services/profitService');

// ─── Console helpers ───────────────────────────────────────────────────────────
const G = (s) => `\x1b[32m${s}\x1b[0m`;
const R = (s) => `\x1b[31m${s}\x1b[0m`;
const Y = (s) => `\x1b[33m${s}\x1b[0m`;
const C = (s) => `\x1b[36m${s}\x1b[0m`;
const B = (s) => `\x1b[1m${s}\x1b[0m`;
const D = (s) => `\x1b[2m${s}\x1b[0m`;

let passed = 0, failed = 0;

function section(title) {
  console.log(`\n${B(C(`━━━ ${title} ━━━`))}`);
}
function pass(msg)             { passed++; console.log(`  ${G('✓')} ${msg}`); }
function fail(msg, detail = '') {
  failed++;
  console.log(`  ${R('✗')} ${msg}`);
  if (detail) console.log(`    ${D(detail)}`);
}
function info(msg)  { console.log(`    ${D('ℹ')} ${D(msg)}`); }
function ok(msg)    { console.log(`    ${D('·')} ${D(msg)}`); }

function assert(cond, passMsg, failMsg, detail = '') {
  cond ? pass(passMsg) : fail(failMsg || passMsg, detail);
  return !!cond;
}

// ─── Test-data registry (for cleanup) ─────────────────────────────────────────
const TEST_PHONE     = '9000099999';
const TEST_REF_CODE  = 'TEST_DC99XYZ';
const ids = { users: [], userPlans: [], submissions: [] };

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(B('\n╔══════════════════════════════════════════════════════╗'));
  console.log(B('║   Xceed16 – Daily Codes & Profits Integration Test   ║'));
  console.log(B('╚══════════════════════════════════════════════════════╝\n'));

  try {
    await sequelize.authenticate();
    pass('Database connection OK');
  } catch (err) {
    fail('Cannot connect to database — is MySQL running?', err.message);
    process.exit(1);
  }

  // Wipe any leftover state from a previous crashed run
  await cleanup(false);

  let user, userPlan, submissions;
  try {
    await phase1_SeedVerification();
    ({ user, userPlan } = await phase2_UserSetup());
    submissions = await phase3_SubmitCodes(user, userPlan);
    await phase4_PreCreditState(user, submissions);
    await phase5_CreditJob(user, submissions);
    await phase6_PostCreditAssertions(user, submissions);
    await phase7_Idempotency(user);
    await phase8_CrossPlanUniqueness();
    await phase9_ProfitHistory(user, submissions);
  } catch (err) {
    fail('Unhandled error during test run', err.stack || err.message);
  } finally {
    await cleanup(true);
    printSummary();
  }
}

// ─── Phase 1: Seed verification ────────────────────────────────────────────────
async function phase1_SeedVerification() {
  section('Phase 1 — Trading Code Seed Verification');

  const PLANS      = ['P1', 'P2', 'P3', 'P4'];
  const CODE_TYPES = ['welcome', 'regular_am', 'regular_pm', 'referral'];
  const SPOT_DAYS  = [1, 2, 3, 5, 10];

  let found = 0, missing = 0;
  const missingList = [];

  for (const planId of PLANS) {
    for (const day of SPOT_DAYS) {
      for (const ct of CODE_TYPES) {
        const tc = await TradingCode.findOne({
          where: { plan_id: planId, day_number: day, code_type: ct },
          attributes: ['id', 'codes'],
        });
        if (tc) {
          found++;
          const codes = parseCodes(tc.codes);
          if (!codes.length) fail(`${planId}/day${day}/${ct}: codes array is empty`);
        } else {
          missing++;
          missingList.push(`${planId}/day${day}/${ct}`);
        }
      }
    }
  }

  assert(
    missing === 0,
    `All spot-check codes seeded (${found} entries verified across P1–P4, days 1/2/3/5/10)`,
    `${missing} entries missing from trading_codes table`,
    missingList.slice(0, 5).join(', ') + (missingList.length > 5 ? ` … +${missingList.length - 5} more` : '') +
      '\nRun: npm run db:seed'
  );

  // P1 vs P2 — same day+type must have DIFFERENT codes
  const p1 = await TradingCode.findOne({ where: { plan_id: 'P1', day_number: 1, code_type: 'welcome' } });
  const p2 = await TradingCode.findOne({ where: { plan_id: 'P2', day_number: 1, code_type: 'welcome' } });
  if (p1 && p2) {
    const c1 = parseCodes(p1.codes)[0];
    const c2 = parseCodes(p2.codes)[0];
    assert(c1 !== c2,
      `P1 and P2 day-1 welcome codes differ  (P1=${c1} P2=${c2})`,
      `P1 and P2 day-1 welcome codes are identical (${c1}) — seeder may be broken`
    );
  }

  // Day 1 vs Day 2 — same plan+type must have DIFFERENT codes
  const d1 = await TradingCode.findOne({ where: { plan_id: 'P1', day_number: 1, code_type: 'regular_am' } });
  const d2 = await TradingCode.findOne({ where: { plan_id: 'P1', day_number: 2, code_type: 'regular_am' } });
  if (d1 && d2) {
    const c1 = parseCodes(d1.codes)[0];
    const c2 = parseCodes(d2.codes)[0];
    assert(c1 !== c2,
      `P1 day-1 and day-2 AM codes differ  (day1=${c1} day2=${c2})`,
      `P1 day-1 and day-2 AM codes are identical (${c1}) — every day may have the same code`
    );
  }

  const total = await TradingCode.count();
  info(`Total trading_codes rows in DB: ${total}`);
}

// ─── Phase 2: Create test user + UserPlan ─────────────────────────────────────
async function phase2_UserSetup() {
  section('Phase 2 — Test User & Plan Setup');

  const userId    = uuidv4();
  const planId    = uuidv4();
  const pwHash    = await bcrypt.hash('Test@9999', 10);
  const now       = new Date();

  const user = await User.create({
    id:             userId,
    name:           'Test_DailyCycle',
    phone:          TEST_PHONE,
    password_hash:  pwHash,
    status:         'active',
    role:           'member',
    referral_code:  TEST_REF_CODE,
    wallet_balance: 0.00,
    joined_at:      now,
  });
  ids.users.push(userId);
  pass(`Test user created  (id: ${userId.slice(0, 8)}…)`);

  const userPlan = await UserPlan.create({
    id:            planId,
    user_id:       userId,
    plan_id:       'P1',
    status:        'active',
    tenure_months: 18,
    multiplier:    4,
    subscribed_at: now,                                                        // Day 1 = today
    locked_until:  new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000),
    expires_at:    new Date(now.getTime() + 18 * 30 * 24 * 60 * 60 * 1000),
  });
  ids.userPlans.push(planId);
  pass(`UserPlan P1 created  (subscribed_at = today → Day 1)`);

  const loaded = await UserPlan.findOne({ where: { user_id: userId, status: 'active' } });
  assert(!!loaded,              'Active UserPlan retrievable from DB');
  assert(loaded.plan_id === 'P1', `plan_id is P1 (got: ${loaded.plan_id})`);

  const freshUser = await User.findByPk(userId);
  assert(
    parseFloat(freshUser.wallet_balance) === 0.00,
    'Initial wallet_balance is ₹0.00'
  );

  return { user, userPlan };
}

// ─── Phase 3: Submit all 4 code types (direct DB insert — bypasses time-gate) ──
async function phase3_SubmitCodes(user, userPlan) {
  section('Phase 3 — Code Submissions  (direct insert, bypassing IST time-gate)');

  const CODE_TYPES = ['welcome', 'regular_am', 'regular_pm', 'referral'];
  const PROFIT_FIELD = {
    welcome:    'am_profit',
    regular_am: 'am_profit',
    regular_pm: 'pm_profit',
    referral:   'pm_profit',
  };
  const DAY = 1;

  const proj = await PlanProjection.findOne({ where: { plan_id: 'P1', day_number: DAY } });
  if (!proj) {
    fail(`PlanProjection for P1/day${DAY} not found — run seeders first`);
    return [];
  }
  info(`P1 Day ${DAY}: am_profit=₹${parseFloat(proj.am_profit).toFixed(4)}  pm_profit=₹${parseFloat(proj.pm_profit).toFixed(4)}`);

  const today = new Date().toISOString().slice(0, 10);
  const submissions = [];

  for (const codeType of CODE_TYPES) {
    const tc = await TradingCode.findOne({
      where: { plan_id: 'P1', day_number: DAY, code_type: codeType },
    });
    if (!tc) {
      fail(`TradingCode not found for P1/day${DAY}/${codeType}`);
      continue;
    }

    const codes        = parseCodes(tc.codes);
    const profitAmount = parseFloat(proj[PROFIT_FIELD[codeType]]);
    const subId        = uuidv4();

    const sub = await CodeSubmission.create({
      id:              subId,
      user_id:         user.id,
      user_plan_id:    userPlan.id,
      trading_code_id: tc.id,
      plan_id:         'P1',
      day_number:      DAY,
      code_type:       codeType,
      submitted_code:  codes[0],
      profit_amount:   profitAmount,
      submission_date: today,
      submitted_at:    new Date(),
      credited_at:     null,
    });
    ids.submissions.push(subId);
    submissions.push(sub);

    pass(`${codeType.padEnd(12)} → code=${codes[0]}  profit=₹${profitAmount.toFixed(4)}`);
  }

  assert(
    submissions.length === CODE_TYPES.length,
    `All ${CODE_TYPES.length} code types inserted`,
    `Only ${submissions.length}/${CODE_TYPES.length} code types inserted`
  );

  return submissions;
}

// ─── Phase 4: Verify nothing credited yet ─────────────────────────────────────
async function phase4_PreCreditState(user, submissions) {
  section('Phase 4 — Pre-Credit State  (wallet unchanged, all pending)');

  const freshUser = await User.findByPk(user.id);
  assert(
    parseFloat(freshUser.wallet_balance) === 0.00,
    `wallet_balance still ₹0.00 — credit job has not run yet`
  );

  const pendingCount = await CodeSubmission.count({
    where: { user_id: user.id, credited_at: null },
  });
  assert(pendingCount === submissions.length,
    `${pendingCount}/${submissions.length} submissions have credited_at = NULL`
  );

  const txCount = await WalletTransaction.count({ where: { user_id: user.id } });
  assert(txCount === 0, `No WalletTransaction rows yet for test user`);

  const totalPending = submissions.reduce((s, r) => s + parseFloat(r.profit_amount), 0);
  info(`Total profit queued: ₹${totalPending.toFixed(4)}`);
}

// ─── Phase 5: Backdate + run credit job ───────────────────────────────────────
async function phase5_CreditJob(user, submissions) {
  section('Phase 5 — Credit Job Execution  (backdate → run job)');

  const backdated = new Date(Date.now() - 31 * 60 * 1000);
  await CodeSubmission.update(
    { submitted_at: backdated },
    { where: { id: { [Op.in]: submissions.map((s) => s.id) } } }
  );
  pass(`submitted_at backdated to ${backdated.toISOString()} (31 min ago)`);

  await creditPendingSubmissions();
  pass('creditPendingSubmissions() executed without throwing');
}

// ─── Phase 6: Post-credit assertions ──────────────────────────────────────────
async function phase6_PostCreditAssertions(user, submissions) {
  section('Phase 6 — Post-Credit Assertions');

  // All submissions should now have credited_at set
  const stillPending = await CodeSubmission.count({
    where: { user_id: user.id, credited_at: null },
  });
  assert(stillPending === 0,
    `credited_at is set on all ${submissions.length} submissions (0 still pending)`
  );

  // Wallet balance
  const expectedBalance = +submissions
    .reduce((s, r) => s + parseFloat(r.profit_amount), 0)
    .toFixed(2);
  const freshUser = await User.findByPk(user.id);
  const actualBalance = parseFloat(freshUser.wallet_balance);
  assert(
    Math.abs(actualBalance - expectedBalance) < 0.01,
    `wallet_balance = ₹${actualBalance.toFixed(2)}  (expected ₹${expectedBalance.toFixed(2)})`,
    `wallet_balance mismatch: got ₹${actualBalance.toFixed(2)}, expected ₹${expectedBalance.toFixed(2)}`
  );

  // WalletTransaction count
  const txCount = await WalletTransaction.count({ where: { user_id: user.id } });
  assert(txCount === submissions.length,
    `${txCount} WalletTransaction rows created (one per submission)`
  );

  // All transactions must be credit/daily_profit
  const txs = await WalletTransaction.findAll({
    where:  { user_id: user.id },
    order:  [['created_at', 'ASC']],
  });
  const wrongType = txs.filter((t) => t.type !== 'credit' || t.category !== 'daily_profit');
  assert(wrongType.length === 0,
    `All transactions: type=credit, category=daily_profit`,
    `${wrongType.length} transaction(s) have wrong type/category`,
    wrongType.map((t) => `id=${t.id.slice(0,8)} type=${t.type} cat=${t.category}`).join('\n    ')
  );

  // Per-transaction internal consistency: balance_before + amount must equal balance_after
  let consistent = true;
  for (const tx of txs) {
    const before        = parseFloat(tx.balance_before);
    const amount        = parseFloat(tx.amount);
    const expectedAfter = +(before + amount).toFixed(2);
    const actualAfter   = parseFloat(tx.balance_after);
    if (Math.abs(actualAfter - expectedAfter) > 0.01) {
      consistent = false;
      fail(
        `TX ${tx.id.slice(0,8)}: ₹${before.toFixed(2)} + ₹${amount.toFixed(2)} = ₹${expectedAfter} but balance_after=₹${actualAfter.toFixed(2)}`
      );
    }
  }
  if (consistent) pass('Each WalletTransaction: balance_before + amount = balance_after');

  // reference_id links back to the submission
  const linkedCount = await WalletTransaction.count({
    where: {
      user_id:      user.id,
      reference_id: { [Op.in]: submissions.map((s) => s.id) },
    },
  });
  assert(linkedCount === submissions.length,
    `All ${linkedCount} transactions have reference_id → submission id`
  );

  // Print per-code-type breakdown
  console.log('');
  ok('Per-code-type breakdown:');
  const reloaded = await CodeSubmission.findAll({
    where: { user_id: user.id },
    order: [['submitted_at', 'ASC']],
  });
  for (const sub of reloaded) {
    const tag = sub.credited_at ? G('credited') : Y('pending');
    ok(`  ${sub.code_type.padEnd(12)}  ₹${parseFloat(sub.profit_amount).toFixed(4).padStart(10)}  ${tag}`);
  }
}

// ─── Phase 7: Idempotency — running the job twice must NOT double-credit ───────
async function phase7_Idempotency(user) {
  section('Phase 7 — Idempotency  (second job run must not double-credit)');

  const balanceBefore = parseFloat((await User.findByPk(user.id)).wallet_balance);
  const txCountBefore = await WalletTransaction.count({ where: { user_id: user.id } });

  await creditPendingSubmissions();

  const balanceAfter  = parseFloat((await User.findByPk(user.id)).wallet_balance);
  const txCountAfter  = await WalletTransaction.count({ where: { user_id: user.id } });

  assert(
    Math.abs(balanceAfter - balanceBefore) < 0.001,
    `Balance unchanged after 2nd job run  (₹${balanceAfter.toFixed(2)} = ₹${balanceBefore.toFixed(2)})`,
    `Balance changed on 2nd run — double-credit detected!  before=₹${balanceBefore.toFixed(2)} after=₹${balanceAfter.toFixed(2)}`
  );
  assert(txCountAfter === txCountBefore,
    `No new WalletTransaction rows on 2nd run  (count still ${txCountAfter})`,
    `${txCountAfter - txCountBefore} duplicate transaction(s) created on 2nd run`
  );
}

// ─── Phase 8: Cross-plan code uniqueness ──────────────────────────────────────
async function phase8_CrossPlanUniqueness() {
  section('Phase 8 — Cross-Plan Code Uniqueness  (P1–P4 must have distinct codes)');

  const PLANS     = ['P1', 'P2', 'P3', 'P4'];
  const CODE_TYPES = ['welcome', 'regular_am', 'regular_pm', 'referral'];
  const DAY       = 1;

  for (const ct of CODE_TYPES) {
    const rows = await TradingCode.findAll({
      where:      { plan_id: { [Op.in]: PLANS }, day_number: DAY, code_type: ct },
      attributes: ['plan_id', 'codes'],
    });

    if (rows.length < PLANS.length) {
      fail(`${ct}: only ${rows.length}/${PLANS.length} plans have a code for day ${DAY}`);
      continue;
    }

    const codeMap = {};
    for (const r of rows) codeMap[r.plan_id] = parseCodes(r.codes)[0];

    const values  = Object.values(codeMap);
    const unique  = new Set(values).size;

    assert(unique === PLANS.length,
      `${ct}: all 4 plans have unique codes  ${PLANS.map((p) => `${p}=${codeMap[p]}`).join('  ')}`,
      `${ct}: only ${unique} unique code(s) across ${PLANS.length} plans — possible seeding error`,
      PLANS.map((p) => `${p}=${codeMap[p]}`).join('  ')
    );
  }
}

// ─── Phase 9: Profit history service ──────────────────────────────────────────
async function phase9_ProfitHistory(user, submissions) {
  section('Phase 9 — Profit History Service  (getProfitHistory)');

  const result = await profitService.getProfitHistory(user.id, { page: 1, limit: 20 });

  assert(result && typeof result.summary === 'object', 'Response has summary object');
  assert(result.summary.pending_count === 0,
    `summary.pending_count = 0  (all credited)`
  );
  assert(parseFloat(result.summary.total_pending) === 0,
    `summary.total_pending = 0`
  );
  assert(result.summary.total_credited > 0,
    `summary.total_credited > 0  (₹${result.summary.total_credited})`
  );

  assert(result.data.length === submissions.length,
    `${result.data.length} history items returned  (expected ${submissions.length})`
  );
  assert(result.total === submissions.length,
    `result.total = ${result.total}`
  );

  const allCredited = result.data.every((d) => d.status === 'credited');
  assert(allCredited,
    'All items have status="credited"',
    `Some items not credited: ${result.data.filter((d) => d.status !== 'credited').map((d) => d.code_type).join(', ')}`
  );

  const hasLabels = result.data.every((d) => typeof d.code_label === 'string' && d.code_label.length > 0);
  assert(hasLabels, 'All items have a non-empty code_label');

  const noCreditAfter = result.data.every((d) => d.credit_after === null);
  assert(noCreditAfter, 'credit_after is null for all credited items');

  const hasCreditedAt = result.data.every((d) => d.credited_at !== null);
  assert(hasCreditedAt, 'credited_at is set on all items');

  const hasPlanIds = result.data.every((d) => d.plan_id === 'P1');
  assert(hasPlanIds, 'All items report plan_id = P1');

  // Spot-check numeric precision — profit_amount should be 2 decimal places
  const badPrecision = result.data.filter((d) => {
    const s = String(d.profit_amount);
    const dec = s.includes('.') ? s.split('.')[1].length : 0;
    return dec > 2;
  });
  assert(badPrecision.length === 0,
    'All profit_amount values have ≤ 2 decimal places',
    `${badPrecision.length} item(s) have more than 2 decimal places: ${badPrecision.map((d) => d.profit_amount).join(', ')}`
  );

  info(`History summary — total_credited=₹${result.summary.total_credited}  pending_count=${result.summary.pending_count}`);

  ok('History items:');
  for (const d of result.data) {
    ok(`  ${d.code_type.padEnd(12)}  ₹${String(d.profit_amount).padStart(8)}  ${G(d.status)}  label="${d.code_label}"`);
  }
}

// ─── Cleanup ───────────────────────────────────────────────────────────────────
async function cleanup(verbose) {
  if (verbose) section('Cleanup — Removing Test Data');
  try {
    if (ids.submissions.length) {
      // wallet transactions reference submissions via reference_id
      await WalletTransaction.destroy({ where: { reference_id: { [Op.in]: ids.submissions } } });
      if (verbose) pass(`Deleted WalletTransaction rows for test submissions`);

      await CodeSubmission.destroy({ where: { id: { [Op.in]: ids.submissions } } });
      if (verbose) pass(`Deleted ${ids.submissions.length} CodeSubmission rows`);
    }
    if (ids.userPlans.length) {
      await UserPlan.destroy({ where: { id: { [Op.in]: ids.userPlans } } });
      if (verbose) pass(`Deleted ${ids.userPlans.length} UserPlan row(s)`);
    }
    if (ids.users.length) {
      await User.destroy({ where: { id: { [Op.in]: ids.users } } });
      if (verbose) pass(`Deleted ${ids.users.length} User row(s)`);
    }
  } catch (err) {
    if (verbose) fail('Cleanup error: ' + err.message, err.stack);
  }
}

// ─── Summary ───────────────────────────────────────────────────────────────────
function printSummary() {
  const total = passed + failed;
  console.log('\n' + B('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(B(' Test Summary'));
  console.log(B('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(`  Total:   ${total}`);
  console.log(`  ${G('Passed:')}  ${G(String(passed))}`);
  if (failed > 0) console.log(`  ${R('Failed:')}  ${R(String(failed))}`);
  console.log(B('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  process.exit(failed > 0 ? 1 : 0);
}

// ─── Utility ───────────────────────────────────────────────────────────────────
function parseCodes(raw) {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw || '[]'); } catch { return []; }
}

main().catch((err) => {
  console.error(R('\n✗ Fatal: ' + err.message));
  console.error(err.stack);
  process.exit(1);
});
