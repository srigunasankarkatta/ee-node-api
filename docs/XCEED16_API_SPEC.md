# Xceed16 — API Specification & User Flow Guide

> **Platform:** AI Copy + Trade + Compounding  
> **Stack:** Node.js (Express) · MySQL (`app_db`) · PM2  
> **Base URL:** `http://<server>/api/v1`  
> **Auth:** JWT Bearer token (header: `Authorization: Bearer <token>`)

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [User Roles](#2-user-roles)
3. [Plans](#3-plans)
4. [Trading Code Timings](#4-trading-code-timings)
5. [Reward Structure](#5-reward-structure)
6. [Rank & Level System](#6-rank--level-system)
7. [Complete API Reference](#7-complete-api-reference)
8. [Database Overview](#8-database-overview)
9. [User Flows (Step-by-Step)](#9-user-flows-step-by-step)
10. [Business Rules & Validations](#10-business-rules--validations)

---

## 1. Platform Overview

Xceed16 is a copy-trading compounding platform where:
- Users purchase a **Plan** (P1–P5) to start trading.
- Every day, **Trading Codes** are released at fixed IST time windows.
- Users earn through **compounding profits** and a **multi-level reward system**.
- As a user grows their team, they unlock **Level Ranks (L1–L5)** with weekly payouts.

---

## 2. User Roles

| Role | Description |
|------|-------------|
| `new_joiner` | Just registered; eligible for Welcome Code (first 5 days) |
| `member` | Has an active plan; receives Regular Codes daily |
| `inviter` | Existing member who referred others; earns referral bonuses |
| `superior` | Inviter whose invitees have also referred others (2nd-level) |
| `admin` | Platform admin; publishes codes, approves payouts |

---

## 3. Plans

| Plan | Principal (₹) | Welcome Bonus (₹) |
|------|--------------|-------------------|
| P-1  | 11,000       | 225               |
| P-2  | 22,000       | 500               |
| P-3  | 33,000       | 825               |
| P-4  | 44,000       | 1,100             |
| P-5  | 55,000       | 1,375             |

**Compounding Rate:** ~0.25% per trade session (2 sessions/day = ~6–28 Rs daily profit compounding daily)  
**Projection data:** stored in DB, sourced from Excel sheets (Day 1–58+ per plan).

---

## 4. Trading Code Timings

All times in **Indian Standard Time (IST)**:

| # | Code Type | Window | Eligible For | Condition |
|---|-----------|--------|-------------|-----------|
| 1 | Welcome Code | 10:00 AM – 10:15 AM | New Joiners only | Valid for first 5 days after joining |
| 2 | Regular Code | 11:00 AM – 11:15 AM | All Members | 2 fixed codes for daily trading |
| 3 | Regular Code | 02:00 PM – 02:15 PM | All Members | 2 fixed codes for daily trading |
| 4 | Referral Code | 03:00 PM – 03:15 PM | Existing Members | 5-day additional code for referrals |

**Validation rules:**
- Server checks IST time before returning any code.
- Codes are fetched from DB (admin publishes them each day).
- Welcome Code: `accountAgeDays <= 5 AND role = new_joiner`.
- Referral Code: `accountAgeDays > 5 AND hasActiveReferrals = true`.

---

## 5. Reward Structure

### 5a. New Comer Reward (Welcome Bonus — 1st recharge only)

| Plan | Principal | Welcome Bonus |
|------|-----------|--------------|
| P-1 | 11,000 | 225 |
| P-2 | 22,000 | 500 |
| P-3 | 33,000 | 825 |
| P-4 | 44,000 | 1,100 |
| P-5 | 55,000 | 1,375 |

### 5b. Inviter Reward (Recommender gets this per referral)

| Plan of Invitee | Per Head Bonus | Team Size | Team Referral Bonus |
|----------------|---------------|-----------|---------------------|
| P-1 | 275 | 5 | 1,375 |
| P-2 | 650 | 5 | 3,250 |
| P-3 | 1,025 | 5 | 5,125 |
| P-4 | 1,400 | 5 | 7,000 |
| P-5 | 1,875 | 5 | 9,375 |

### 5c. Inviter's Superior Reward (2nd-level up)

| Plan of Invitee | Per Head Bonus | Team Size | Team Referral Bonus |
|----------------|---------------|-----------|---------------------|
| P-1 | 50 | 25 | 1,250 |
| P-2 | 100 | 25 | 2,500 |
| P-3 | 150 | 25 | 3,750 |
| P-4 | 200 | 25 | 5,000 |
| P-5 | 250 | 25 | 6,250 |

**Notes:**
1. New comer can earn more bonus by recharging above the basic plan. T&C apply.
2. Recommender gets invitation reward based on 1st-time recharge amount.
3. Recommender's Superior gets reward per the above structure.

---

## 6. Rank & Level System

### Level Thresholds & Benefits

| Rank | Team Size | Achievement Bonus (₹) | Weekly Payment (₹) | Tenure (Weeks) | Total Promo Bonus (₹) | Gross Benefit (₹) |
|------|-----------|----------------------|-------------------|----------------|----------------------|-------------------|
| L1 | 5 | 2,500 | 100 | 36 | 3,600 | 6,100 |
| L2 | 25 | 4,000 | 150 | 32 | 4,800 | 8,800 |
| L3 | 125 | 8,000 | 250 | 28 | 7,000 | 15,000 |
| L4 | 625 | 16,000 | 400 | 24 | 9,600 | 25,600 |
| L5 | 3,125 | 32,000 | 600 | 20 | 12,000 | 44,000 |

### Upgrade Conditions

- **L1:** At least 5 direct subordinates join with P1 Plan (₹11,000).
- **L2:** 5 direct subordinates must be promoted to L1 Rank.
- **L3 or above:** At least 4 users at L2 Rank required under you.

### Weekly Payout Rules

- Management rewards issued **every Saturday**.
- Can be collected up to the **tenure period** of the rank.
- Total promotional bonus = weekly payment × tenure weeks.

---

## 7. Complete API Reference

### 7.1 Auth

```
POST   /api/v1/auth/register          Register new user (accepts referral_code)
POST   /api/v1/auth/login             Login → returns JWT access + refresh token
POST   /api/v1/auth/send-otp          Send OTP to phone/email
POST   /api/v1/auth/verify-otp        Verify OTP → marks user as verified
POST   /api/v1/auth/refresh-token     Rotate JWT using refresh token
POST   /api/v1/auth/logout            Invalidate refresh token
POST   /api/v1/auth/forgot-password   Send reset link
POST   /api/v1/auth/reset-password    Reset password with token
```

### 7.2 User Profile

```
GET    /api/v1/user/profile           Own profile (name, phone, plan, rank, wallet balance)
PATCH  /api/v1/user/profile           Update profile fields
GET    /api/v1/user/dashboard         Aggregated: plan info, rank, wallet, team size, today's codes
```

### 7.3 Plans

```
GET    /api/v1/plans                  List all 5 plans (P1–P5) with principal & bonuses
GET    /api/v1/plans/:planId          Plan detail + compounding projection summary
POST   /api/v1/plans/:planId/subscribe   Activate plan (first recharge triggers welcome bonus)
GET    /api/v1/plans/:planId/projection  Full daily compounding table (Day 1–N)
```

**Projection response:**
```json
{
  "planId": "P1",
  "principal": 11000,
  "days": [
    {
      "day": 1,
      "amSession": { "position": "UP", "tradeCount": 1, "rate": 0.0015, "tradeValue": 16.5, "profit": 4.158, "closing": 11004.158 },
      "pmSession": { "position": "Down", "tradeCount": 2, "rate": 0.001, "tradeValue": 11.004, "profit": 2.773, "closing": 11006.93 },
      "totalDayProfit": 6.93
    }
  ]
}
```

### 7.4 Trading Codes

```
GET    /api/v1/codes/today            All codes available to the user right now (time-gated)
GET    /api/v1/codes/welcome          Welcome code (new joiners, 10:00–10:15 AM IST)
GET    /api/v1/codes/regular          Regular codes (all members, 11 AM & 2 PM slots)
GET    /api/v1/codes/referral         Referral code (existing members, 3:00–3:15 PM IST)
GET    /api/v1/codes/history          User's past codes (by date)
```

**Response:**
```json
{
  "codeType": "regular",
  "slot": "11:00 AM - 11:15 AM",
  "codes": ["CODE-A1", "CODE-B2"],
  "validUntil": "2024-01-15T05:45:00.000Z",
  "timezone": "Asia/Kolkata"
}
```

### 7.5 Referral & Team

```
GET    /api/v1/referral/my-code       My referral code and shareable link
GET    /api/v1/referral/team          Direct subordinates (1st level)
GET    /api/v1/referral/tree          Full downline tree (all levels)
GET    /api/v1/referral/team/stats    Team size count, active/inactive, plan breakdown
```

### 7.6 Rewards

```
GET    /api/v1/rewards                All rewards for the logged-in user
GET    /api/v1/rewards/welcome-bonus  New comer welcome bonus (plan-based)
GET    /api/v1/rewards/inviter        Inviter per-head + team bonus earned
GET    /api/v1/rewards/superior       Inviter's superior bonus earned
GET    /api/v1/rewards/history        Paginated reward transaction history
        ?page=1&limit=20&type=inviter
```

### 7.7 Rank & Level

```
GET    /api/v1/rank/me                Current rank, team size, progress to next level
GET    /api/v1/rank/levels            All level definitions (L1–L5 with full benefits)
GET    /api/v1/rank/upgrade-check     Check if user qualifies for next level upgrade
POST   /api/v1/rank/upgrade           Request level upgrade (triggers admin review)
GET    /api/v1/rank/history           Rank change history with dates
```

### 7.8 Wallet & Payouts

```
GET    /api/v1/wallet                 Balance, total earned, pending, available to withdraw
GET    /api/v1/wallet/transactions    All transactions (credit/debit) paginated
GET    /api/v1/payouts/weekly         Weekly promotion payment history
GET    /api/v1/payouts/schedule       Upcoming payout dates + amounts based on rank tenure
POST   /api/v1/payouts/withdraw       Withdrawal request
        Body: { "amount": 500, "bankAccountId": "uuid" }
GET    /api/v1/payouts/withdraw/status/:requestId   Track withdrawal status
```

### 7.9 Bank Account

```
GET    /api/v1/bank-accounts          List saved bank accounts
POST   /api/v1/bank-accounts          Add bank account
DELETE /api/v1/bank-accounts/:id      Remove bank account
PATCH  /api/v1/bank-accounts/:id/primary   Set as primary
```

### 7.10 Admin

```
POST   /api/v1/admin/codes/publish          Publish today's trading codes
GET    /api/v1/admin/codes                  List published codes by date
PATCH  /api/v1/admin/codes/:id              Edit a code entry

GET    /api/v1/admin/users                  List all users with filters
GET    /api/v1/admin/users/:id              User detail with team and wallet
PATCH  /api/v1/admin/users/:id/rank         Manual rank update
PATCH  /api/v1/admin/users/:id/status       Activate / deactivate account

GET    /api/v1/admin/rewards/pending        Rewards awaiting disbursement
POST   /api/v1/admin/rewards/approve/:id    Approve and credit reward
POST   /api/v1/admin/rewards/reject/:id     Reject with reason

POST   /api/v1/admin/payouts/run-weekly     Trigger Saturday payout job
GET    /api/v1/admin/payouts/withdrawals    All withdrawal requests
PATCH  /api/v1/admin/payouts/withdrawals/:id   Process withdrawal (approve/reject)

GET    /api/v1/admin/stats                  Platform-wide stats: users, volume, payouts
```

---

## 8. Database Overview

> Full schema in `docs/DB_SCHEMA.md`

**MySQL database:** `app_db`  
**Connection user:** `app_user`

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts, role, status, referral link |
| `plans` | P1–P5 plan definitions |
| `user_plans` | Which plan a user is on (recharge record) |
| `plan_projections` | Daily compounding data per plan (from Excel) |
| `trading_codes` | Codes published by admin per date and slot |
| `user_code_access` | Log of which user accessed which code |
| `referrals` | Referral relationships (inviter → invitee) |
| `rewards` | All reward credits (type, amount, status) |
| `ranks` | L1–L5 definitions |
| `user_ranks` | Current and historical rank of each user |
| `wallet_transactions` | Every credit/debit to user wallet |
| `weekly_payouts` | Weekly Saturday payout records |
| `withdrawal_requests` | User withdrawal requests and status |
| `bank_accounts` | User bank details for withdrawal |

---

## 9. User Flows (Step-by-Step)

### Flow A: New User Onboarding

```
1. User hits referral link  →  GET /api/v1/referral/my-code (of inviter)
2. User registers           →  POST /api/v1/auth/register  { referral_code }
3. OTP verification         →  POST /api/v1/auth/send-otp + /verify-otp
4. User selects plan        →  GET /api/v1/plans
5. User subscribes P1–P5   →  POST /api/v1/plans/:id/subscribe
   ↳ System credits welcome bonus to user wallet
   ↳ System credits inviter reward to inviter's wallet
   ↳ System credits superior reward to inviter's inviter
6. Next morning (10 AM IST)  →  GET /api/v1/codes/welcome  (5-day window)
```

### Flow B: Daily Trading

```
1. 10:00–10:15 AM  →  GET /api/v1/codes/welcome   (new joiners only)
2. 11:00–11:15 AM  →  GET /api/v1/codes/regular   (2 codes)
3. 02:00–02:15 PM  →  GET /api/v1/codes/regular   (2 codes)
4. 03:00–03:15 PM  →  GET /api/v1/codes/referral  (existing members)
```

### Flow C: Rank Upgrade

```
1. User checks progress     →  GET /api/v1/rank/me
2. Eligibility check        →  GET /api/v1/rank/upgrade-check
3. User requests upgrade    →  POST /api/v1/rank/upgrade
4. Admin confirms           →  PATCH /api/v1/admin/users/:id/rank
5. Achievement bonus credited to wallet
6. Weekly payouts begin every Saturday for N weeks
```

### Flow D: Weekly Saturday Payout

```
Admin cron job (every Saturday):
  POST /api/v1/admin/payouts/run-weekly
  ↳ Queries all users with active rank + remaining tenure weeks > 0
  ↳ Credits weekly amount to each user's wallet
  ↳ Decrements remaining_weeks by 1
  ↳ Logs each payout in weekly_payouts table
```

### Flow E: Withdrawal

```
1. User adds bank account   →  POST /api/v1/bank-accounts
2. User requests withdrawal →  POST /api/v1/payouts/withdraw
3. Admin reviews            →  GET /api/v1/admin/payouts/withdrawals
4. Admin approves           →  PATCH /api/v1/admin/payouts/withdrawals/:id
5. Wallet debited           →  wallet_transactions record created
```

---

## 10. Business Rules & Validations

| Rule | Details |
|------|---------|
| One active plan per user | A user can only have one active plan at a time |
| First recharge only for welcome bonus | Welcome bonus triggers only on the very first plan subscription |
| Code time-gating | All codes must be validated against IST clock server-side |
| Welcome code window | Only available if `days_since_join <= 5` |
| Referral code eligibility | Only for members with `days_since_join > 5` and at least 1 active referral |
| L1 upgrade condition | 5 direct subs on P1 (₹11,000) minimum |
| L2 upgrade condition | 5 direct subs promoted to L1 |
| L3+ upgrade condition | 4 L2-ranked users in downline |
| Weekly payout cap | Stops after `tenure_weeks` for the rank; doesn't carry over |
| Withdrawal minimum | Define minimum withdrawal amount (suggested: ₹500) |
| Money laundering clause | Accounts in violation are permanently frozen (per disclaimer) |
| Disclaimer | Investment in securities subject to market risks — show on plan subscription |

---

## Appendix

### Environment Variables

```env
NODE_ENV=production
PORT=3000
API_VERSION=v1

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=app_db
DB_USER=app_user
DB_PASS=<stored in .env only — never committed>

# JWT
JWT_SECRET=<random 64-char secret>
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# CORS
CORS_ORIGINS=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### PM2 Deploy Commands

```bash
# Start in production
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Logs
pm2 logs equity-eyes

# Monitor
pm2 monit
```

### Folder Structure

```
equity-eyes/
├── docs/
│   ├── XCEED16_API_SPEC.md    ← this file
│   └── DB_SCHEMA.md           ← table definitions + ERD notes
├── src/
│   ├── config/                ← env config, logger, db connection
│   ├── controllers/           ← one file per feature module
│   ├── middleware/            ← auth, error handler, rate limiter
│   ├── models/                ← Sequelize models (one per table)
│   ├── routes/                ← one file per feature module
│   ├── services/              ← business logic layer
│   └── app.js
├── server.js
├── ecosystem.config.js
└── .env
```
