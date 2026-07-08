# Xceed16 — API Documentation

> **Base URL (local):** `http://localhost:3000/api/v1`  
> **Base URL (production):** `http://<server-ip>:3000/api/v1`  
> **Content-Type:** `application/json`  
> **Auth header:** `Authorization: Bearer <access_token>`

---

## Response Format

All responses follow this shape:

```json
// Success
{ "success": true, "status": 200, "message": "...", "data": { ... } }

// Error
{ "success": false, "status": 4xx, "message": "Error description" }
```

---

## 1. Health

### GET /health

```bash
curl http://localhost:3000/api/v1/health
```

**Response:**
```json
{
  "success": true,
  "status": 200,
  "message": "equity-eyes API is running",
  "data": { "environment": "development", "version": "v1", "uptime": "3s" }
}
```

---

## 2. Auth

### POST /auth/register

Register and immediately activate the user. No OTP step.  
`email` and `referral_code` are optional.

```bash
# Without referral code (first user / admin)
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ravi Kumar",
    "phone": "9876543210",
    "password": "Pass@1234"
  }'

# With referral code
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Priya Sharma",
    "phone": "9123456780",
    "password": "Pass@1234",
    "email": "priya@example.com",
    "referral_code": "RAVI12ABC"
  }'
```

**Response `201`:**
```json
{
  "success": true,
  "status": 201,
  "message": "Registration successful. Please verify your phone number.",
  "data": {
    "userId": "uuid-here",
    "referral_code": "RAVI5XYWZ"
  }
}
```

---

### POST /auth/login

Login with phone + password. Returns access and refresh tokens.

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "password": "Pass@1234"
  }'
```

**Response `200`:**
```json
{
  "success": true,
  "status": 200,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "user": {
      "id": "uuid-here",
      "name": "Ravi Kumar",
      "role": "new_joiner",
      "referral_code": "RAVI5XYWZ"
    }
  }
}
```

> **Save the `accessToken`** — required for all 🔒 endpoints below.

---

### POST /auth/refresh-token

Exchange a refresh token for a new access token.

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{ "refresh_token": "eyJhbGci..." }'
```

**Response `200`:**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

---

### POST /auth/logout  🔒

Invalidates the session. Client should discard both tokens.

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer <access_token>"
```

**Response `200`:**
```json
{ "success": true, "status": 200, "message": "Logged out successfully" }
```

---

### GET /auth/me  🔒

Get the currently logged-in user's profile and wallet balance.

```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"
```

**Response `200`:**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "id": "uuid-here",
    "name": "Ravi Kumar",
    "role": "new_joiner",
    "status": "active",
    "referral_code": "RAVI5XYWZ",
    "wallet_balance": "0.00",
    "joined_at": "2026-06-20T15:00:00.000Z"
  }
}
```

---

## 3. Plans

### GET /plans

List all 5 plans. Public — no auth needed.

```bash
curl http://localhost:3000/api/v1/plans
```

**Response `200`:**
```json
{
  "success": true,
  "status": 200,
  "data": [
    { "id": "P1", "name": "Plan 1", "principal": "11000.00", "welcome_bonus": "225.00" },
    { "id": "P2", "name": "Plan 2", "principal": "22000.00", "welcome_bonus": "500.00" },
    { "id": "P3", "name": "Plan 3", "principal": "33000.00", "welcome_bonus": "825.00" },
    { "id": "P4", "name": "Plan 4", "principal": "44000.00", "welcome_bonus": "1100.00" },
    { "id": "P5", "name": "Plan 5", "principal": "55000.00", "welcome_bonus": "1375.00" }
  ]
}
```

---

### GET /plans/:planId

Get a single plan. `planId` = P1, P2, P3, P4, or P5.

```bash
curl http://localhost:3000/api/v1/plans/P1
```

---

### GET /plans/:planId/projection

Daily compounding projection table. Optional `?days=N` (default 60, max 365).

```bash
curl "http://localhost:3000/api/v1/plans/P1/projection?days=5"
```

**Response `200`:**
```json
{
  "success": true,
  "status": 200,
  "data": [
    {
      "plan_id": "P1",
      "day_number": 1,
      "am_position": "UP",
      "am_trade_count": 1,
      "am_profit": "4.158000",
      "am_closing": "11004.158000",
      "pm_position": "Down",
      "pm_trade_count": 2,
      "pm_profit": "2.773048",
      "pm_closing": "11006.931048",
      "total_day_profit": "6.931048"
    }
  ]
}
```

---

### POST /plans/:planId/subscribe  🔒

Subscribe to a plan. Requires a tenure selection. Credits welcome bonus to wallet immediately. One active plan at a time.

**Body:**

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `tenure_months` | integer | ✅ | `9`, `18`, `27`, `36` |

**Tenure → Multiplier → Locking period:**

| tenure_months | Multiplier | Locking Period | Projected Benefit (P1) |
|---|---|---|---|
| 9  | 2×  | 90 days  | ₹22,000 |
| 18 | 4×  | 180 days | ₹44,000 |
| 27 | 8×  | 270 days | ₹88,000 |
| 36 | 16× | 360 days | ₹1,76,000 |

```bash
curl -X POST http://localhost:3000/api/v1/plans/P1/subscribe \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{ "tenure_months": 18 }'
```

**Response `201`:**
```json
{
  "success": true,
  "status": 201,
  "message": "Plan activated. Welcome bonus credited.",
  "data": {
    "userPlanId": "uuid-here",
    "planId": "P1",
    "tenureMonths": 18,
    "multiplier": 4,
    "lockedUntil": "2026-12-18",
    "expiresAt": "2027-12-18",
    "welcomeBonus": 225,
    "projectedBenefit": 44000
  }
}
```

> On subscribe:
> - Wallet credited the welcome bonus (₹225 for P1) immediately
> - Role upgrades `new_joiner` → `member`
> - `locked_until` = subscribe date + locking days
> - `expires_at` = subscribe date + tenure months
> - If referred, inviter gets per-head reward; inviter's inviter gets superior reward
> - Rank eligibility is checked automatically (inviter may be promoted to L1–L5)

---

## 4. Trading Codes

> All code endpoints require 🔒 auth and an **active plan subscription**.

### How codes work

- Codes are **pre-defined per plan per day** — sourced from the Xceed16 Excel sheet (Sheet5).
- Each code is tied to the user's **personal day number** (Day 1 = their subscription date, Day 2 = next day, etc.), not the calendar date. Two users on the same plan but subscribed on different dates see different codes on the same day.
- A P1 user can only see P1 codes. A P2 user can only see P2 codes.
- Each code is valid for **one 15-minute window per day**. Submitting the same code type twice in one day is rejected.
- After a valid submission, **profit is credited to the wallet after 30 minutes** via a background job.

### Code types and time windows (IST)

| Code type | Window | Eligible |
|---|---|---|
| `welcome` | 10:00 – 10:15 | Days 1–5 only |
| `regular_am` | 11:00 – 11:15 | All active members |
| `regular_pm` | 14:00 – 14:15 | All active members |
| `referral` | 15:00 – 15:15 | Day 6+ only |

---

### GET /codes/today  🔒

Overview of all time slots for today with open / closed / upcoming status, plus the user's current day number.

```bash
curl http://localhost:3000/api/v1/codes/today \
  -H "Authorization: Bearer <access_token>"
```

**Response `200`:**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "date": "2026-06-23",
    "currentISTTime": "14:32",
    "planId": "P1",
    "dayNumber": 15,
    "slots": [
      { "codeType": "welcome",    "slot": "10:00 – 10:15 IST", "status": "closed" },
      { "codeType": "regular_am", "slot": "11:00 – 11:15 IST", "status": "closed" },
      { "codeType": "regular_pm", "slot": "14:00 – 14:15 IST", "status": "open" },
      { "codeType": "referral",   "slot": "15:00 – 15:15 IST", "status": "upcoming" }
    ]
  }
}
```

> `dayNumber` is the user's personal trading day count since their plan subscription date.

---

### GET /codes/welcome  🔒

Fetch today's welcome code. Available **10:00–10:15 AM IST**, **days 1–5** only. Requires an active plan.

```bash
curl http://localhost:3000/api/v1/codes/welcome \
  -H "Authorization: Bearer <access_token>"
```

**Response `200`:**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "codeType": "welcome",
    "planId": "P1",
    "dayNumber": 1,
    "codes": ["99OE15OEO"],
    "slot": "10:00 – 10:15 IST",
    "date": "2026-06-23"
  }
}
```

---

### GET /codes/regular/am  🔒

Fetch the AM regular code. Available **11:00–11:15 AM IST**, all active members.

```bash
curl http://localhost:3000/api/v1/codes/regular/am \
  -H "Authorization: Bearer <access_token>"
```

---

### GET /codes/regular/pm  🔒

Fetch the PM regular code. Available **02:00–02:15 PM IST**, all active members.

```bash
curl http://localhost:3000/api/v1/codes/regular/pm \
  -H "Authorization: Bearer <access_token>"
```

---

### GET /codes/referral  🔒

Fetch the referral code. Available **03:00–03:15 PM IST**, members on **day 6+**.

```bash
curl http://localhost:3000/api/v1/codes/referral \
  -H "Authorization: Bearer <access_token>"
```

---

### POST /codes/submit  🔒

**The earning action.** Paste a code from the fetch endpoints above → system validates → queues profit to be credited after 30 minutes.

```bash
curl -X POST http://localhost:3000/api/v1/codes/submit \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "99OE15OEO",
    "code_type": "welcome"
  }'
```

**`code_type` values:** `welcome` · `regular_am` · `regular_pm` · `referral`

**Response `200`:**
```json
{
  "success": true,
  "status": 200,
  "message": "✓ Code accepted — ₹4.16 will be credited to your wallet in 30 minutes (Day 1 AM session)",
  "data": {
    "codeType": "welcome",
    "dayNumber": 1,
    "planId": "P1",
    "profitPending": 4.16,
    "creditAfter": "2026-06-23T05:45:00.000Z",
    "session": "AM",
    "submissionDate": "2026-06-23"
  }
}
```

> `profitPending` — the amount that will be credited after 30 minutes.  
> `creditAfter` — ISO timestamp when the background job will credit the wallet.  
> Use `GET /profits` to check current pending and credited profit history.

**Possible errors:**

| Status | Message |
|--------|---------|
| `403` | Active plan required to access trading codes |
| `403` | Outside submission time window |
| `403` | Welcome code window has expired (valid for first 5 days only) |
| `403` | Referral code is available from day 6 onwards |
| `400` | Invalid code. Please check and try again. |
| `409` | You already submitted the `<type>` code for today |
| `404` | No `<type>` code found for day N (Plan: P1) |

---

### GET /codes/submissions  🔒

Raw submission history. Each row includes `credited_at` — `null` means still pending (not yet in wallet), a timestamp means credited.

```bash
curl "http://localhost:3000/api/v1/codes/submissions?page=1&limit=20" \
  -H "Authorization: Bearer <access_token>"
```

**Response `200`:**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "total": 14,
    "page": 1,
    "pages": 1,
    "data": [
      {
        "id": "uuid",
        "plan_id": "P1",
        "day_number": 7,
        "code_type": "regular_am",
        "profit_amount": "4.171620",
        "submission_date": "2026-06-23",
        "submitted_at": "2026-06-23T05:32:00.000Z",
        "credited_at": "2026-06-23T06:02:00.000Z"
      }
    ]
  }
}
```

> For a cleaner mobile-ready profit history view, prefer `GET /profits` instead.

---

## 5. Profits  🔒

Single endpoint for the mobile app's earnings / profit history screen. Returns all code-submission profits — both pending (not yet in wallet) and credited — in one paginated list with a summary header.

### GET /profits

```bash
# All profits (default)
curl "http://localhost:3000/api/v1/profits" \
  -H "Authorization: Bearer <access_token>"

# Pending only
curl "http://localhost:3000/api/v1/profits?status=pending" \
  -H "Authorization: Bearer <access_token>"

# Credited only, page 2
curl "http://localhost:3000/api/v1/profits?status=credited&page=2&limit=10" \
  -H "Authorization: Bearer <access_token>"
```

**Query params:**

| Param | Default | Description |
|-------|---------|-------------|
| `page` | `1` | Page number |
| `limit` | `20` | Items per page |
| `status` | *(all)* | `pending` or `credited` |

**Response `200`:**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "summary": {
      "total_credited": 2450.00,
      "total_pending": 142.86,
      "pending_count": 1
    },
    "total": 30,
    "page": 1,
    "pages": 2,
    "data": [
      {
        "id": "uuid",
        "date": "2026-06-23",
        "day_number": 15,
        "plan_id": "P1",
        "code_type": "regular_am",
        "code_label": "AM Regular Code",
        "profit_amount": 142.86,
        "status": "pending",
        "submitted_at": "2026-06-23T05:32:00.000Z",
        "credited_at": null,
        "credit_after": "2026-06-23T06:02:00.000Z"
      },
      {
        "id": "uuid",
        "date": "2026-06-22",
        "day_number": 14,
        "plan_id": "P1",
        "code_type": "regular_pm",
        "code_label": "PM Regular Code",
        "profit_amount": 165.00,
        "status": "credited",
        "submitted_at": "2026-06-22T08:42:00.000Z",
        "credited_at": "2026-06-22T09:12:00.000Z",
        "credit_after": null
      }
    ]
  }
}
```

**Field reference:**

| Field | Description |
|-------|-------------|
| `summary.total_credited` | Sum of all credited profits (in wallet) |
| `summary.total_pending` | Sum of profits submitted but not yet in wallet |
| `summary.pending_count` | Number of pending items |
| `status` | `"pending"` — not yet in wallet · `"credited"` — already in wallet |
| `credit_after` | ISO timestamp when the pending profit will be credited (present only when `status = "pending"`) |
| `credited_at` | ISO timestamp when it was actually credited (present only when `status = "credited"`) |
| `code_label` | Human-readable label: `"Welcome Code"`, `"AM Regular Code"`, `"PM Regular Code"`, `"Referral Code"` |

---

## 6. Ranks

> All rank endpoints require 🔒 auth.

Ranks are awarded **automatically** on the server when a user's referral network meets the required team size. No API call is needed to "claim" a rank — the check runs inside the subscribe flow.

### Rank Definitions

| Rank | Team Required | Achievement Bonus | Weekly Payment | Tenure | Total Promo Bonus | Gross Benefit |
|------|-------------|-----------------|--------------|--------|-----------------|--------------|
| L1 | 5 direct active members | ₹2,500 | ₹100/week | 36 weeks | ₹3,600 | ₹6,100 |
| L2 | 5 direct L1 members | ₹4,000 | ₹150/week | 32 weeks | ₹4,800 | ₹8,800 |
| L3 | 4 direct L2 members | ₹8,000 | ₹250/week | 28 weeks | ₹7,000 | ₹15,000 |
| L4 | 4 direct L3 members | ₹16,000 | ₹400/week | 24 weeks | ₹9,600 | ₹25,600 |
| L5 | 4 direct L4 members | ₹32,000 | ₹600/week | 20 weeks | ₹12,000 | ₹44,000 |

**How it works:**
- On every `POST /plans/:planId/subscribe`, the server checks if the subscriber's inviter now qualifies for L1–L5
- If the inviter gets promoted, the server checks their inviter too (propagates up the chain automatically)
- Achievement bonus is credited to wallet immediately on promotion
- Weekly payment is credited every **Saturday 09:00 IST** for `tenure_weeks` weeks
- A user can hold multiple ranks simultaneously and receive weekly payments for each

**Upgrade rules:**
- **L1:** need 5 direct subordinates with any active plan
- **L2:** need 5 of your direct referrals to be at L1
- **L3+:** need 4 of your direct referrals at the preceding rank

---

## 7. Wallet

> All wallet endpoints require 🔒 auth.  
> Base path: `/api/v1/wallet`

> **Note on wallet balance:** The balance reflects only **credited** amounts — welcome bonus, credited code profits, referral rewards, rank bonuses, and weekly payouts. Profits pending the 30-minute window are not included until credited. Use `GET /profits?status=pending` to see pending amounts.

### GET /wallet/balance

Current wallet balance.

```bash
curl http://localhost:3000/api/v1/wallet/balance \
  -H "Authorization: Bearer <access_token>"
```

**Response `200`:**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "userId": "uuid-here",
    "name": "Ravi Kumar",
    "balance": 300.00
  }
}
```

---

### GET /wallet/summary

Earnings breakdown by category — total earned, withdrawn, and current balance.

```bash
curl http://localhost:3000/api/v1/wallet/summary \
  -H "Authorization: Bearer <access_token>"
```

**Response `200`:**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "currentBalance": 300.00,
    "totalEarned": 500.00,
    "totalWithdrawn": 200.00,
    "breakdown": {
      "welcome_bonus": 225.00,
      "inviter_reward": 275.00,
      "daily_profit": 0.00
    }
  }
}
```

> `breakdown` only shows categories that have at least one transaction. `daily_profit` here reflects only amounts already credited (not pending).

---

### GET /wallet/transactions

Full transaction ledger. Optional `?category=<value>` filter, `?page=1&limit=20` pagination.

```bash
curl "http://localhost:3000/api/v1/wallet/transactions?category=daily_profit&page=1&limit=20" \
  -H "Authorization: Bearer <access_token>"
```

**Response `200`:**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "total": 3,
    "page": 1,
    "pages": 1,
    "data": [
      {
        "id": "uuid",
        "type": "debit",
        "category": "withdrawal",
        "amount": "200.00",
        "balance_before": "500.00",
        "balance_after": "300.00",
        "note": "Withdrawal request to State Bank of India ****3456",
        "created_at": "2026-06-23T19:36:49.000Z"
      },
      {
        "id": "uuid",
        "type": "credit",
        "category": "daily_profit",
        "amount": "142.86",
        "balance_before": "225.00",
        "balance_after": "367.86",
        "note": "Day 15 · regular_am profit · Plan P1",
        "created_at": "2026-06-23T06:02:00.000Z"
      },
      {
        "id": "uuid",
        "type": "credit",
        "category": "welcome_bonus",
        "amount": "225.00",
        "balance_before": "0.00",
        "balance_after": "225.00",
        "note": "Welcome bonus for Plan 1",
        "created_at": "2026-06-09T09:00:00.000Z"
      }
    ]
  }
}
```

**`category` filter values:**

| Value | Description |
|-------|-------------|
| `welcome_bonus` | Plan subscription welcome bonus |
| `daily_profit` | Code submission profit (credited 30 min after submission) |
| `inviter_reward` | Per-head reward when a direct referral subscribes |
| `superior_reward` | Per-head reward when an invitee's referral subscribes |
| `level_achievement` | One-time bonus on rank promotion (L1–L5) |
| `weekly_payout` | Weekly rank payment (credited every Saturday) |
| `withdrawal` | Debit on withdrawal request |
| `adjustment` | Reversal on withdrawal cancellation or rejection |

---

## 8. Bank Accounts

> All require 🔒 auth.

### GET /wallet/bank-accounts

List all saved bank accounts for the logged-in user.

```bash
curl http://localhost:3000/api/v1/wallet/bank-accounts \
  -H "Authorization: Bearer <access_token>"
```

**Response `200`:**
```json
{
  "success": true,
  "status": 200,
  "data": [
    {
      "id": "uuid",
      "account_holder": "Ravi Kumar",
      "account_number": "1234567890123456",
      "ifsc_code": "SBIN0001234",
      "bank_name": "State Bank of India",
      "is_primary": 1
    }
  ]
}
```

---

### POST /wallet/bank-accounts

Add a new bank account. The first account added is automatically set as primary.

```bash
curl -X POST http://localhost:3000/api/v1/wallet/bank-accounts \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "account_holder": "Ravi Kumar",
    "account_number": "1234567890123456",
    "ifsc_code": "SBIN0001234",
    "bank_name": "State Bank of India"
  }'
```

**Response `201`:**
```json
{
  "success": true,
  "status": 201,
  "message": "Bank account added",
  "data": { "id": "uuid", "is_primary": 1 }
}
```

**Validation:**
- `ifsc_code` must match format: 4 letters + `0` + 6 alphanumeric (e.g. `SBIN0001234`)

---

### PATCH /wallet/bank-accounts/:id/primary

Set a specific account as primary. All others are cleared.

```bash
curl -X PATCH http://localhost:3000/api/v1/wallet/bank-accounts/<account_id>/primary \
  -H "Authorization: Bearer <access_token>"
```

---

### DELETE /wallet/bank-accounts/:id

Remove a bank account. Cannot delete primary if other accounts exist — set a new primary first.

```bash
curl -X DELETE http://localhost:3000/api/v1/wallet/bank-accounts/<account_id> \
  -H "Authorization: Bearer <access_token>"
```

---

## 9. Withdrawals

> All require 🔒 auth. Minimum withdrawal: ₹100.

### POST /wallet/withdraw/preview

Calculate the exact amount to be received before submitting. Returns deduction info if within the locking period.

```bash
curl -X POST http://localhost:3000/api/v1/wallet/withdraw/preview \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{ "amount": 1000 }'
```

**Response `200` (within locking period):**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "requestedAmount": 1000,
    "isBeforeLockingPeriod": true,
    "deductionPercent": 40,
    "deductionAmount": 400,
    "withdrawableAmount": 600,
    "lockedUntil": "2026-09-20"
  }
}
```

**Response `200` (after locking period):**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "requestedAmount": 1000,
    "isBeforeLockingPeriod": false,
    "deductionPercent": 0,
    "deductionAmount": 0,
    "withdrawableAmount": 1000,
    "lockedUntil": "2026-09-20"
  }
}
```

---

### POST /wallet/withdraw

Request a withdrawal. Funds are **debited from wallet immediately** (locked pending admin approval).  
Uses the primary bank account. Only one pending request allowed at a time.

**If within the locking period**, the server returns `409` with deduction details. Re-submit with `accept_early_withdrawal_deduction: true` to confirm the 40% penalty.

```bash
# Normal withdrawal (after lock period)
curl -X POST http://localhost:3000/api/v1/wallet/withdraw \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{ "amount": 1000 }'

# Early withdrawal with confirmed 40% deduction
curl -X POST http://localhost:3000/api/v1/wallet/withdraw \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{ "amount": 1000, "accept_early_withdrawal_deduction": true }'
```

**Response `201` (normal — after lock period):**
```json
{
  "success": true,
  "status": 201,
  "message": "Withdrawal request submitted",
  "data": {
    "requestId": "uuid",
    "grossAmount": 1000,
    "deductionPercent": 0,
    "deductionAmount": 0,
    "amount": 1000,
    "balanceAfter": 500.00,
    "bankAccount": {
      "bank_name": "State Bank of India",
      "account_number": "****3456",
      "ifsc_code": "SBIN0001234"
    }
  }
}
```

**Response `409` (within lock period — confirmation required):**
```json
{
  "success": false,
  "status": 409,
  "message": "Early withdrawal requires confirmation",
  "data": {
    "isBeforeLockingPeriod": true,
    "lockedUntil": "2026-09-20",
    "deductionPercent": 40,
    "deductionAmount": 400,
    "withdrawableAmount": 600
  }
}
```

**Response `201` (early withdrawal confirmed):**
```json
{
  "success": true,
  "status": 201,
  "message": "Withdrawal request submitted",
  "data": {
    "requestId": "uuid",
    "grossAmount": 1000,
    "deductionPercent": 40,
    "deductionAmount": 400,
    "amount": 600,
    "balanceAfter": 500.00,
    "bankAccount": {
      "bank_name": "State Bank of India",
      "account_number": "****3456",
      "ifsc_code": "SBIN0001234"
    }
  }
}
```

**Possible errors:**

| Status | Message |
|--------|---------|
| `400` | Minimum withdrawal amount is ₹100 |
| `400` | Insufficient wallet balance |
| `400` | No primary bank account found |
| `409` | You already have a pending withdrawal request |
| `409` | Early withdrawal requires confirmation (includes `data` with deduction breakdown) |

---

### GET /wallet/withdrawals

User's withdrawal history with bank account details.

```bash
curl "http://localhost:3000/api/v1/wallet/withdrawals?page=1&limit=20" \
  -H "Authorization: Bearer <access_token>"
```

**Response `200`:**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "total": 1,
    "page": 1,
    "pages": 1,
    "data": [
      {
        "id": "uuid",
        "amount": "200.00",
        "status": "pending",
        "requested_at": "2026-06-23T19:36:49.000Z",
        "processed_at": null,
        "rejection_reason": null,
        "bank_account": {
          "bank_name": "State Bank of India",
          "account_number": "****3456",
          "ifsc_code": "SBIN0001234"
        }
      }
    ]
  }
}
```

**Status values:** `pending` · `approved` · `rejected` · `processed`

---

### DELETE /wallet/withdrawals/:id

Cancel a pending withdrawal. The **full requested amount** is reversed back to the wallet (including any early-withdrawal deduction that would have applied — the deduction only takes effect if the request is processed, not if cancelled or rejected).

```bash
curl -X DELETE http://localhost:3000/api/v1/wallet/withdrawals/<request_id> \
  -H "Authorization: Bearer <access_token>"
```

**Response `200`:**
```json
{
  "success": true,
  "status": 200,
  "message": "Withdrawal request cancelled and amount reversed"
}
```

---

## 10. Admin — Withdrawals

> Requires 🔒 admin token.

### GET /wallet/admin/withdrawals

List all pending withdrawal requests (oldest first — FIFO processing order).

```bash
curl "http://localhost:3000/api/v1/wallet/admin/withdrawals?page=1&limit=20" \
  -H "Authorization: Bearer <admin_token>"
```

---

### PATCH /wallet/admin/withdrawals/:id/approve

Approve and mark a withdrawal as processed. No wallet change on approval (funds already debited on request).

```bash
curl -X PATCH http://localhost:3000/api/v1/wallet/admin/withdrawals/<request_id>/approve \
  -H "Authorization: Bearer <admin_token>"
```

**Response `200`:**
```json
{
  "success": true,
  "status": 200,
  "message": "Withdrawal approved and marked as processed",
  "data": { "status": "processed", "processed_at": "2026-06-23T19:42:51.890Z" }
}
```

---

### PATCH /wallet/admin/withdrawals/:id/reject

Reject a withdrawal. The **full gross amount** is reversed back to the user's wallet automatically (same as cancel — the 40% early-withdrawal deduction is not applied on rejection).

```bash
curl -X PATCH http://localhost:3000/api/v1/wallet/admin/withdrawals/<request_id>/reject \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{ "reason": "Invalid bank account details" }'
```

**Response `200`:**
```json
{
  "success": true,
  "status": 200,
  "message": "Withdrawal rejected and amount reversed to user wallet"
}
```

---

## 11. KYC (Identity Verification)

> All require 🔒 auth.

### GET /kyc/status

Returns current KYC status and allowed document types.

```bash
curl http://localhost:3000/api/v1/kyc/status \
  -H "Authorization: Bearer <access_token>"
```

**Response `200` (not started):**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "status": "not_started",
    "allowedDocuments": [
      { "type": "pan",             "label": "PAN Card" },
      { "type": "aadhaar",         "label": "Aadhaar Card" },
      { "type": "voter_id",        "label": "Voter ID" },
      { "type": "driving_license", "label": "Driving License" }
    ],
    "requiredUploads": ["front_image", "back_image", "selfie_with_id"]
  }
}
```

**Response `200` (submitted / under review):**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "status": "pending",
    "documentType": "aadhaar",
    "submittedAt": "2026-06-22T10:30:00.000Z",
    "reviewedAt": null,
    "rejectionReason": null,
    "allowedDocuments": [ "..." ],
    "requiredUploads": ["front_image", "back_image", "selfie_with_id"]
  }
}
```

**Status values:** `not_started` · `pending` · `verified` · `rejected`

---

### POST /kyc/submit

Submit identity documents. Use `multipart/form-data`.  
Allowed re-submission if previously rejected.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `document_type` | string | Yes | `pan`, `aadhaar`, `voter_id`, `driving_license` |
| `document_number` | string | Yes | PAN/Aadhaar/Voter ID number |
| `front_image` | file | Yes | JPEG/PNG/WebP, max 5 MB |
| `back_image` | file | Yes | JPEG/PNG/WebP, max 5 MB |
| `selfie_with_id` | file | Yes | JPEG/PNG/WebP, max 5 MB |

```bash
curl -X POST http://localhost:3000/api/v1/kyc/submit \
  -H "Authorization: Bearer <access_token>" \
  -F "document_type=aadhaar" \
  -F "document_number=1234 5678 9012" \
  -F "front_image=@/path/to/front.jpg" \
  -F "back_image=@/path/to/back.jpg" \
  -F "selfie_with_id=@/path/to/selfie.jpg"
```

**Response `201`:**
```json
{
  "success": true,
  "status": 201,
  "message": "KYC submitted successfully. Verification is under review.",
  "data": {
    "kycId": "uuid",
    "status": "pending"
  }
}
```

**Possible errors:**

| Status | Message |
|--------|---------|
| `400` | KYC is already verified |
| `400` | KYC is already submitted and under review |
| `400` | front_image, back_image, and selfie_with_id are all required |
| `400` | Only JPEG, PNG, and WebP images are allowed |
| `422` | document_type must be one of: pan, aadhaar, voter_id, driving_license |

---

## 12. Me (User Self-Info)

> All require 🔒 auth.

### GET /me/active-plan

Returns the user's current active plan with lock-period status.

```bash
curl http://localhost:3000/api/v1/me/active-plan \
  -H "Authorization: Bearer <access_token>"
```

**Response `200` (active plan):**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "planId": "P1",
    "planName": "Plan 1",
    "principal": 11000,
    "tenureMonths": 18,
    "multiplier": 4,
    "projectedBenefit": 44000,
    "subscribedAt": "2026-06-09T09:00:00.000Z",
    "lockedUntil": "2026-12-06",
    "expiresAt": "2027-12-09T09:00:00.000Z",
    "isLocked": true,
    "daysRemaining": 180,
    "creditedThroughDay": 14
  }
}
```

**Response `200` (no active plan):**
```json
{ "success": true, "status": 200, "data": null }
```

---

## User Onboarding Flows

### Flow A — Admin login (pre-seeded, no registration needed)

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "phone": "9999999999", "password": "Admin@123" }'
```

Admin credentials: **phone** `9999999999` · **password** `Admin@123`

---

### Flow B — First regular user (no referral code)

```bash
# Step 1 — Register (immediately active)
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{ "name": "Ravi Kumar", "phone": "9876543210", "password": "Pass@1234" }'

# Step 2 — Login → get token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "phone": "9876543210", "password": "Pass@1234" }'

# Step 3 — Subscribe to a plan
curl -X POST http://localhost:3000/api/v1/plans/P1/subscribe \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{ "tenure_months": 18 }'

# ✓ Wallet: ₹225 welcome bonus credited immediately
# ✓ locked_until = 180 days from today, expires_at = 18 months from today
# ✓ projected benefit = ₹11,000 × 4 = ₹44,000
```

---

### Flow C — User joins via referral code

```bash
# Step 1 — Register with inviter's referral code
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Priya Sharma",
    "phone": "9123456780",
    "password": "Pass@1234",
    "referral_code": "RAVI5XYWZ"
  }'

# Step 2 — Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "phone": "9123456780", "password": "Pass@1234" }'

# Step 3 — Subscribe (triggers referral rewards + rank check)
curl -X POST http://localhost:3000/api/v1/plans/P1/subscribe \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{ "tenure_months": 9 }'

# On subscribe:
# - Priya gets ₹225 welcome bonus
# - Ravi (inviter) gets ₹275 per-head reward
# - If Ravi now has 5 active referrals → automatically promoted to L1 (₹2,500 achievement bonus)
# - Ravi's inviter (if any) gets ₹50 superior reward
```

---

### Flow D — Daily trading (active member)

```bash
TOKEN="<access_token>"

# At 10:00–10:15 IST (days 1–5 only) — fetch welcome code
curl http://localhost:3000/api/v1/codes/welcome -H "Authorization: Bearer $TOKEN"

# Submit it → profit queued for 30 min
curl -X POST http://localhost:3000/api/v1/codes/submit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "code": "99OE15OEO", "code_type": "welcome" }'

# At 11:00–11:15 IST — fetch + submit AM code
curl http://localhost:3000/api/v1/codes/regular/am -H "Authorization: Bearer $TOKEN"
curl -X POST http://localhost:3000/api/v1/codes/submit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "code": "98PF17PFP", "code_type": "regular_am" }'

# At 14:00–14:15 IST — fetch + submit PM code
curl http://localhost:3000/api/v1/codes/regular/pm -H "Authorization: Bearer $TOKEN"

# At 15:00–15:15 IST (day 6+ only) — fetch + submit referral code
curl http://localhost:3000/api/v1/codes/referral -H "Authorization: Bearer $TOKEN"

# Check profit history (including pending)
curl "http://localhost:3000/api/v1/profits" -H "Authorization: Bearer $TOKEN"
```

---

## Quick Test Checklist

```bash
# 1. Health
curl http://localhost:3000/api/v1/health

# 2. List plans (no auth)
curl http://localhost:3000/api/v1/plans

# 3. Admin login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "phone": "9999999999", "password": "Admin@123" }'

# 4. Register a test user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{ "name": "Test User", "phone": "9000000001", "password": "Test@123" }'

# 5. Login immediately
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "phone": "9000000001", "password": "Test@123" }'

# 6. Subscribe to plan
curl -X POST http://localhost:3000/api/v1/plans/P1/subscribe \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "tenure_months": 18 }'

# 7. Check wallet — should show ₹225 welcome bonus
curl http://localhost:3000/api/v1/wallet/balance \
  -H "Authorization: Bearer <TOKEN>"

# 8. Check profit history
curl http://localhost:3000/api/v1/profits \
  -H "Authorization: Bearer <TOKEN>"
```

---

## Error Reference

| HTTP | Meaning |
|------|---------|
| `400` | Bad request — invalid body, wrong code, or insufficient balance |
| `401` | Missing or expired token |
| `403` | Forbidden — wrong role, no active plan, outside time window, window expired |
| `404` | Resource not found — no code for this day/plan |
| `409` | Conflict — already registered, code already submitted today, pending withdrawal exists |
| `422` | Validation error — missing or malformed required fields |
| `429` | Rate limit exceeded (100 req / 15 min) |
| `500` | Server error — check `logs/combined.log` |

---

## Background Jobs Reference

| Job | Schedule | What it does |
|-----|----------|-------------|
| `creditPendingSubmissions` | Every minute | Credits wallet for code submissions that are 30+ minutes old. Sets `credited_at` on the submission record. |
| `creditDailyProfit` | 15:30 IST daily | Auto-credits `total_day_profit` from plan projections to all active plan holders. |
| `creditWeeklyPayments` | 09:00 IST Saturday | Credits weekly rank payments to all users with active ranks that have weeks remaining. |
| `notifySlot` | 09:55 / 10:55 / 13:55 / 14:55 IST | Sends slot-open notifications (welcome / AM / PM / referral). |
