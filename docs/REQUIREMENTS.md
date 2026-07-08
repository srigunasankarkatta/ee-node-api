# Xceed16 — Product Requirements Document

> **Platform:** Xceed16 — AI Copy + Trade + Compounding  
> **Stack:** Node.js (Express 4) · MySQL 8 (Sequelize) · PM2 cluster · JWT auth  
> **Last updated:** 2026-06-22

---

## 1. Platform Overview

Xceed16 is an AI-powered copy trading platform where users:
1. **Invest** a fixed principal in one of 5 plans
2. **Copy trade** daily using time-gated codes (4 slots per day)
3. **Earn daily profits** automatically credited by the system
4. **Grow their network** via an MLM referral structure with rank rewards
5. **Withdraw earnings** to a verified bank account

---

## 2. Investment Plans

| Plan | Principal | Welcome Bonus |
|------|-----------|---------------|
| P1   | ₹11,000   | ₹225          |
| P2   | ₹22,000   | ₹500          |
| P3   | ₹33,000   | ₹825          |
| P4   | ₹44,000   | ₹1,100        |
| P5   | ₹55,000   | ₹1,375        |

### 2.1 Tenure & Multiplier

When subscribing, the user must choose a tenure. Tenure determines the total projected return and locking period.

| Tenure   | Multiplier | Locking Period | Projected Benefit (P1 example) |
|----------|-----------|----------------|-------------------------------|
| 9 months  | 2×         | 90 days         | ₹22,000                        |
| 18 months | 4×         | 180 days        | ₹44,000                        |
| 27 months | 8×         | 270 days        | ₹88,000                        |
| 36 months | 16×        | 360 days        | ₹1,76,000                      |

**Formula:** `Projected Benefit = Principal × Multiplier`

**Locking period vs tenure:**
- Locking period = days during which the principal cannot be withdrawn
- Tenure = total investment duration (plan active for this long)
- Example: 18-month plan has 180-day lock, but remains active for 18 months

### 2.2 Benefit Projection Table (Full)

| Plan Amount | 9M (2×)    | 18M (4×)   | 27M (8×)   | 36M (16×)   |
|------------|------------|------------|------------|-------------|
| ₹11,000    | ₹22,000    | ₹44,000    | ₹88,000    | ₹1,76,000   |
| ₹22,000    | ₹44,000    | ₹88,000    | ₹1,76,000  | ₹3,52,000   |
| ₹33,000    | ₹66,000    | ₹1,32,000  | ₹2,64,000  | ₹5,28,000   |
| ₹44,000    | ₹88,000    | ₹1,76,000  | ₹3,52,000  | ₹7,04,000   |
| ₹55,000    | ₹1,10,000  | ₹2,20,000  | ₹4,40,000  | ₹8,80,000   |

### 2.3 Business Rules

- One active plan per user at a time
- Subscribe triggers immediate welcome bonus credit
- User role upgrades: `new_joiner` → `member` on first subscribe
- Daily profits are auto-credited to wallet at **15:30 IST** by the cron job
- Profit data comes from `plan_projections` table (291 days of AM + PM trade data per plan)

---

## 3. Trading Codes (Copy Trading)

### 3.1 Daily Code Slots

| # | Code Type    | Time (IST)       | Eligibility                   | Condition                          |
|---|-------------|------------------|-------------------------------|-------------------------------------|
| 1 | Welcome     | 10:00 – 10:15 AM | New joiners (days 1–5 only)   | 5-day welcome window                |
| 2 | Regular AM  | 11:00 – 11:15 AM | All active members            | 2 fixed codes for daily trading     |
| 3 | Regular PM  | 02:00 – 02:15 PM | All active members            | 2 fixed codes for daily trading     |
| 4 | Referral    | 03:00 – 03:15 PM | Existing members (day 6+)     | 5-day additional code for referrals |

- All times are **Indian Standard Time (IST)**
- All time checks are enforced server-side
- Codes are **plan-scoped**: a P1 user cannot access P2 codes
- The midnight cron publishes **20 codes** per day (5 plans × 4 slot types)

### 3.2 Code Format

```
XCEED-{PLAN}-{LABEL}-{RAND6}
Example: XCEED-P1-AMC-NQW02H
```

Labels: `WLC` (welcome) · `AMC` (regular AM) · `PMC` (regular PM) · `REF` (referral)

### 3.3 Code Access Rules

- `welcome` — requires joining within last 5 days; no active plan needed
- `regular_am`, `regular_pm` — requires active plan; available all days
- `referral` — requires active plan AND joined more than 5 days ago

---

## 4. Referral & Reward Structure

### 4.1 New Comer Reward (Welcome Bonus)

Credited automatically on plan subscribe.

| Plan | Welcome Bonus |
|------|--------------|
| P1   | ₹225         |
| P2   | ₹500         |
| P3   | ₹825         |
| P4   | ₹1,100       |
| P5   | ₹1,375       |

### 4.2 Inviter Reward (Per Head)

Credited to the person who referred the new subscriber, on each subscribe event.

| Plan | Per-Head Reward | Team Size (to fill) | Total Team Reward |
|------|----------------|---------------------|------------------|
| P1   | ₹275           | 5                   | ₹1,375           |
| P2   | ₹650           | 5                   | ₹3,250           |
| P3   | ₹1,025         | 5                   | ₹5,125           |
| P4   | ₹1,400         | 5                   | ₹7,000           |
| P5   | ₹1,875         | 5                   | ₹9,375           |

### 4.3 Superior (Inviter's Inviter) Reward

Credited to the person who referred the inviter, on each subscribe event.

| Plan | Per-Head Reward | Team Size | Total Team Reward |
|------|----------------|-----------|------------------|
| P1   | ₹50            | 25        | ₹1,250           |
| P2   | ₹100           | 25        | ₹2,500           |
| P3   | ₹150           | 25        | ₹3,750           |
| P4   | ₹200           | 25        | ₹5,000           |
| P5   | ₹250           | 25        | ₹6,250           |

### 4.4 Notes

1. New comer can earn a higher welcome bonus by subscribing to a higher-value plan
2. Inviter reward is credited per head at the time of each invitee's subscribe
3. Superior reward follows the same per-subscribe cadence

---

## 5. Rank (Level) System

Ranks are granted automatically when a user's direct referral network meets the required team composition.

### 5.1 Rank Definitions

| Rank | Team Required                    | Achievement Bonus | Weekly Payment | Tenure   | Total Promo | Gross Benefit |
|------|----------------------------------|------------------|---------------|---------|-------------|---------------|
| L1   | 5 direct members with active plan | ₹2,500           | ₹100/week      | 36 weeks | ₹3,600      | ₹6,100        |
| L2   | 5 direct L1 members              | ₹4,000           | ₹150/week      | 32 weeks | ₹4,800      | ₹8,800        |
| L3   | 4 direct L2 members              | ₹8,000           | ₹250/week      | 28 weeks | ₹7,000      | ₹15,000       |
| L4   | 4 direct L3 members              | ₹16,000          | ₹400/week      | 24 weeks | ₹9,600      | ₹25,600       |
| L5   | 4 direct L4 members              | ₹32,000          | ₹600/week      | 20 weeks | ₹12,000     | ₹44,000       |

### 5.2 Rank Upgrade Rules

- **L1:** At least 5 direct subordinates must join with any active plan (minimum P1 = ₹11,000)
- **L2:** Must have 5 direct subordinates promoted to L1 rank
- **L3 and above:** At least 4 direct subordinates at the preceding rank level

### 5.3 How Rank Upgrades Work

1. User B subscribes to a plan (referred by A)
2. Server checks if A now qualifies for L1 (has 5+ direct active members)
3. If A qualifies → A is promoted → achievement bonus credited immediately → weekly payment schedule starts
4. Server then checks if A's inviter (C) now qualifies for a higher rank (because A just got promoted)
5. Propagation continues up the chain (max 5 hops)

### 5.4 Weekly Payments

- Paid every **Saturday at 09:00 IST** by a cron job
- Each active rank pays independently (a user with L1 + L2 gets both payments every Saturday)
- `remaining_weeks` decrements by 1 each Saturday
- When `remaining_weeks` reaches 0, rank status changes to `completed`
- Management rewards issued every Saturday and can be collected up to tenure

---

## 6. Wallet & Transactions

### 6.1 Credit Categories

| Category           | Trigger                              |
|--------------------|--------------------------------------|
| `welcome_bonus`    | On plan subscribe                    |
| `inviter_reward`   | When a direct referral subscribes    |
| `superior_reward`  | When an indirect referral subscribes |
| `level_achievement`| On rank promotion (L1–L5)           |
| `weekly_payout`    | Every Saturday for active ranks      |
| `daily_profit`     | Every day at 15:30 IST per active plan|
| `adjustment`       | Admin manual adjustment              |

### 6.2 Debit Categories

| Category    | Trigger                             |
|-------------|-------------------------------------|
| `withdrawal` | Withdrawal request (locked immediately) |

### 6.3 Withdrawal Rules

- Minimum withdrawal: ₹100
- Funds are **debited on request**, not on approval
- Only one pending withdrawal at a time per user
- Requires a saved primary bank account
- Admin approves → marks as `processed` (no wallet change on approval)
- Admin rejects → amount reversed back to wallet

---

## 7. Automated Jobs (Cron Schedule)

All crons run in **Asia/Kolkata (IST)** timezone. In PM2 cluster mode, only instance 0 runs the scheduler.

| Time (IST)        | Job                    | Description |
|-------------------|------------------------|-------------|
| 00:00 daily       | `publishDailyCodes`    | Publishes 20 codes (5 plans × 4 slots) for today. Idempotent — safe to re-run |
| 09:55 daily       | `notify:welcome`       | Sends welcome slot reminder (opens 10:00) |
| 10:55 daily       | `notify:regular_am`    | Sends AM regular slot reminder (opens 11:00) |
| 13:55 daily       | `notify:regular_pm`    | Sends PM regular slot reminder (opens 14:00) |
| 14:55 daily       | `notify:referral`      | Sends referral slot reminder (opens 15:00) |
| 15:30 daily       | `creditDailyProfit`    | Credits `total_day_profit` from plan_projections to all active plan holders |
| 09:00 (Saturday)  | `creditWeeklyPayments` | Credits weekly rank promotion payments; decrements `remaining_weeks` |

**Startup publication:** On every server boot, `publishDailyCodes()` runs immediately to cover missed midnight crons (idempotent via `findOrCreate`).

---

## 8. User Roles

| Role         | Description |
|-------------|-------------|
| `new_joiner` | Registered but no active plan |
| `member`     | Has an active plan |
| `inviter`    | Has at least one active referral |
| `admin`      | Full access; can approve/reject withdrawals; pre-seeded |

---

## 9. Auth Flow

- Register → immediately active (no OTP step currently)
- Login → returns `accessToken` (JWT, 7d) + `refreshToken` (30d)
- All protected endpoints require `Authorization: Bearer <accessToken>`
- Token refresh via `POST /auth/refresh-token`

**Admin credentials (pre-seeded):**
- Phone: `9999999999`
- Password: `Admin@123`
- Referral code: `ADMIN00001`

---

## 10. Data Model Summary

| Table                 | Purpose |
|-----------------------|---------|
| `users`               | User accounts, wallet_balance, role, referral_code |
| `plans`               | 5 plan definitions (P1–P5) |
| `user_plans`          | User subscriptions with tenure, multiplier, locked_until, credited_through_day |
| `plan_projections`    | 291 days × 5 plans of AM/PM profit data (1,455 rows from Excel) |
| `ranks`               | L1–L5 rank definitions (achievement bonus, weekly payment, tenure_weeks) |
| `user_ranks`          | Active/completed rank records; tracks remaining_weeks per user per rank |
| `weekly_payouts`      | Log of every Saturday weekly payment per rank |
| `referrals`           | inviter_id → invitee_id → superior_id linkage |
| `trading_codes`       | Daily codes per plan per slot (published by midnight cron) |
| `user_code_access`    | Access log per code per user |
| `code_submissions`    | User code submissions and profit credit records |
| `wallet_transactions` | Full ledger of all credits and debits |
| `bank_accounts`       | Saved bank accounts per user (IFSC validated) |
| `withdrawal_requests` | Withdrawal requests with status lifecycle |

---

## 11. Security & Infrastructure

- **Rate limiting:** 100 requests / 15 minutes per IP
- **Trust proxy:** `app.set('trust proxy', 1)` — required for correct IP behind Nginx
- **Input validation:** `express-validator` on all POST body fields
- **Password hashing:** `bcryptjs`
- **Helmet:** HTTP security headers
- **CORS:** Configured origins only
- **Async errors:** All Express handlers wrapped in `asyncHandler` to prevent unhandledRejection crashes
- **PM2 cluster:** `instances: 'max'`; cron guard ensures only instance 0 runs scheduler

---

## 12. Known Gaps / Future Work

| Feature | Status | Notes |
|---------|--------|-------|
| SMS/WhatsApp notifications | Not implemented | `notificationService.js` ready; swap channel from `'log'` to `'whatsapp'` |
| Rank status API (`GET /me/rank`) | Not built | Mobile app needs to display rank and weekly payout history |
| Plan expiry enforcement | Partial | `expires_at` stored; no job to auto-expire plans after tenure ends |
| Plan upgrade/downgrade | Not built | No endpoint to switch plans |
| OTP phone verification | Removed (temp) | `sendOTP`/`verifyOTP` functions exist; re-enable by setting `phone_verified=0` on register |
| Admin dashboard APIs | Partial | Only withdrawal admin built; no user management or analytics endpoints |
| Code submission profit logic | Built (service exists) | `codeSubmissionService.js` exists; verify integration with daily profit flow |
