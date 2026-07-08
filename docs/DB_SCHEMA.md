# Xceed16 — MySQL Database Schema

> **Database:** `app_db`  
> **Charset:** `utf8mb4` / `utf8mb4_unicode_ci`  
> **ORM:** Sequelize  

---

## Entity Relationship Summary

```
users
  ├── user_plans         (1:many — plan subscriptions)
  ├── referrals          (1:many — as inviter)
  ├── referrals          (1:1 — as invitee)
  ├── user_ranks         (1:many — rank history)
  ├── wallet_transactions(1:many)
  ├── weekly_payouts     (1:many)
  ├── withdrawal_requests(1:many)
  └── bank_accounts      (1:many)

plans
  └── plan_projections   (1:many — daily compounding rows)

trading_codes
  └── user_code_access   (1:many — access log)

rewards
  └── linked to users (receiver) and referrals
```

---

## Table Definitions

### `users`

```sql
CREATE TABLE users (
  id              CHAR(36)        NOT NULL PRIMARY KEY,       -- UUID
  name            VARCHAR(100)    NOT NULL,
  phone           VARCHAR(15)     NOT NULL UNIQUE,
  email           VARCHAR(150)        NULL UNIQUE,
  password_hash   VARCHAR(255)    NOT NULL,
  role            ENUM('new_joiner','member','inviter','superior','admin')
                                  NOT NULL DEFAULT 'new_joiner',
  status          ENUM('pending','active','suspended','frozen')
                                  NOT NULL DEFAULT 'pending',
  referral_code   VARCHAR(20)     NOT NULL UNIQUE,            -- own code to share
  referred_by     CHAR(36)            NULL,                   -- FK → users.id (inviter)
  phone_verified  TINYINT(1)      NOT NULL DEFAULT 0,
  joined_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login      DATETIME            NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_referral_code (referral_code),
  INDEX idx_referred_by   (referred_by),
  FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
```

---

### `plans`

```sql
CREATE TABLE plans (
  id              VARCHAR(10)     NOT NULL PRIMARY KEY,        -- 'P1'…'P5'
  name            VARCHAR(50)     NOT NULL,
  principal       DECIMAL(12,2)   NOT NULL,
  welcome_bonus   DECIMAL(12,2)   NOT NULL,
  is_active       TINYINT(1)      NOT NULL DEFAULT 1,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Seed data
INSERT INTO plans VALUES
  ('P1','Plan 1',11000, 225,  1, NOW(), NOW()),
  ('P2','Plan 2',22000, 500,  1, NOW(), NOW()),
  ('P3','Plan 3',33000, 825,  1, NOW(), NOW()),
  ('P4','Plan 4',44000, 1100, 1, NOW(), NOW()),
  ('P5','Plan 5',55000, 1375, 1, NOW(), NOW());
```

---

### `user_plans`

```sql
CREATE TABLE user_plans (
  id              CHAR(36)        NOT NULL PRIMARY KEY,
  user_id         CHAR(36)        NOT NULL,
  plan_id         VARCHAR(10)     NOT NULL,
  status          ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',
  subscribed_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at      DATETIME            NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id)
) ENGINE=InnoDB;
```

---

### `plan_projections`

```sql
-- Populated from Excel sheets (11000, 22000, 33000, 44000, 55000)
CREATE TABLE plan_projections (
  id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT PRIMARY KEY,
  plan_id             VARCHAR(10)     NOT NULL,
  day_number          SMALLINT        NOT NULL,

  -- AM Session
  am_position         ENUM('UP','Down') NOT NULL,
  am_trade_count      INT             NOT NULL,
  am_rate             DECIMAL(8,6)    NOT NULL,
  am_trade_value      DECIMAL(14,6)   NOT NULL,
  am_profit           DECIMAL(14,6)   NOT NULL,
  am_closing          DECIMAL(14,6)   NOT NULL,

  -- PM Session
  pm_position         ENUM('UP','Down') NOT NULL,
  pm_trade_count      INT             NOT NULL,
  pm_rate             DECIMAL(8,6)    NOT NULL,
  pm_trade_value      DECIMAL(14,6)   NOT NULL,
  pm_profit           DECIMAL(14,6)   NOT NULL,
  pm_closing          DECIMAL(14,6)   NOT NULL,

  total_day_profit    DECIMAL(14,6)   NOT NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_plan_day (plan_id, day_number),
  FOREIGN KEY (plan_id) REFERENCES plans(id)
) ENGINE=InnoDB;
```

---

### `trading_codes`

```sql
CREATE TABLE trading_codes (
  id              CHAR(36)        NOT NULL PRIMARY KEY,
  code_date       DATE            NOT NULL,
  code_type       ENUM('welcome','regular_am','regular_pm','referral') NOT NULL,
  codes           JSON            NOT NULL,               -- array of code strings
  slot_start      TIME            NOT NULL,
  slot_end        TIME            NOT NULL,
  published_by    CHAR(36)        NOT NULL,               -- admin user id
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_date_type (code_date, code_type),
  INDEX idx_code_date (code_date),
  FOREIGN KEY (published_by) REFERENCES users(id)
) ENGINE=InnoDB;
```

---

### `user_code_access`

```sql
CREATE TABLE user_code_access (
  id              CHAR(36)        NOT NULL PRIMARY KEY,
  user_id         CHAR(36)        NOT NULL,
  trading_code_id CHAR(36)        NOT NULL,
  accessed_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_user_code (user_id, trading_code_id),
  FOREIGN KEY (user_id)         REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (trading_code_id) REFERENCES trading_codes(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

---

### `referrals`

```sql
CREATE TABLE referrals (
  id              CHAR(36)        NOT NULL PRIMARY KEY,
  inviter_id      CHAR(36)        NOT NULL,               -- direct referrer
  invitee_id      CHAR(36)        NOT NULL UNIQUE,        -- the new user
  superior_id     CHAR(36)            NULL,               -- inviter's inviter
  plan_id         VARCHAR(10)         NULL,               -- plan invitee subscribed to
  status          ENUM('pending','active','rewarded') NOT NULL DEFAULT 'pending',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_inviter  (inviter_id),
  INDEX idx_superior (superior_id),
  FOREIGN KEY (inviter_id)  REFERENCES users(id),
  FOREIGN KEY (invitee_id)  REFERENCES users(id),
  FOREIGN KEY (superior_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (plan_id)     REFERENCES plans(id)
) ENGINE=InnoDB;
```

---

### `rewards`

```sql
CREATE TABLE rewards (
  id              CHAR(36)        NOT NULL PRIMARY KEY,
  user_id         CHAR(36)        NOT NULL,               -- recipient
  type            ENUM('welcome_bonus','inviter_per_head','inviter_team',
                       'superior_per_head','superior_team',
                       'level_achievement','weekly_payout') NOT NULL,
  amount          DECIMAL(12,2)   NOT NULL,
  reference_id    CHAR(36)            NULL,               -- referral_id / user_plan_id / etc.
  status          ENUM('pending','approved','credited','rejected') NOT NULL DEFAULT 'pending',
  note            VARCHAR(255)        NULL,
  approved_by     CHAR(36)            NULL,
  approved_at     DATETIME            NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_status  (status),
  FOREIGN KEY (user_id)     REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
```

---

### `ranks`

```sql
CREATE TABLE ranks (
  id                    VARCHAR(5)      NOT NULL PRIMARY KEY,  -- 'L1'…'L5'
  level                 TINYINT         NOT NULL,
  team_size_required    INT             NOT NULL,
  achievement_bonus     DECIMAL(12,2)   NOT NULL,
  weekly_payment        DECIMAL(12,2)   NOT NULL,
  tenure_weeks          SMALLINT        NOT NULL,
  total_promo_bonus     DECIMAL(12,2)   NOT NULL,
  gross_benefit         DECIMAL(12,2)   NOT NULL,
  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Seed data
INSERT INTO ranks VALUES
  ('L1',1,5,   2500, 100, 36, 3600,  6100,  NOW()),
  ('L2',2,25,  4000, 150, 32, 4800,  8800,  NOW()),
  ('L3',3,125, 8000, 250, 28, 7000,  15000, NOW()),
  ('L4',4,625, 16000,400, 24, 9600,  25600, NOW()),
  ('L5',5,3125,32000,600, 20, 12000, 44000, NOW());
```

---

### `user_ranks`

```sql
CREATE TABLE user_ranks (
  id                  CHAR(36)        NOT NULL PRIMARY KEY,
  user_id             CHAR(36)        NOT NULL,
  rank_id             VARCHAR(5)      NOT NULL,
  status              ENUM('pending','active','completed') NOT NULL DEFAULT 'pending',
  achievement_credited TINYINT(1)     NOT NULL DEFAULT 0,
  remaining_weeks     SMALLINT        NOT NULL,           -- counts down each Saturday
  activated_at        DATETIME            NULL,
  completed_at        DATETIME            NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (rank_id)  REFERENCES ranks(id)
) ENGINE=InnoDB;
```

---

### `wallet_transactions`

```sql
CREATE TABLE wallet_transactions (
  id              CHAR(36)        NOT NULL PRIMARY KEY,
  user_id         CHAR(36)        NOT NULL,
  type            ENUM('credit','debit')  NOT NULL,
  category        ENUM('welcome_bonus','inviter_reward','superior_reward',
                       'level_achievement','weekly_payout','withdrawal',
                       'adjustment') NOT NULL,
  amount          DECIMAL(12,2)   NOT NULL,
  balance_before  DECIMAL(14,2)   NOT NULL,
  balance_after   DECIMAL(14,2)   NOT NULL,
  reference_id    CHAR(36)            NULL,               -- reward_id / payout_id / etc.
  note            VARCHAR(255)        NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_id   (user_id),
  INDEX idx_category  (category),
  INDEX idx_created   (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

---

### `weekly_payouts`

```sql
CREATE TABLE weekly_payouts (
  id              CHAR(36)        NOT NULL PRIMARY KEY,
  user_id         CHAR(36)        NOT NULL,
  user_rank_id    CHAR(36)        NOT NULL,
  amount          DECIMAL(12,2)   NOT NULL,
  payout_date     DATE            NOT NULL,               -- the Saturday
  status          ENUM('pending','credited','failed') NOT NULL DEFAULT 'pending',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_user_week (user_id, payout_date),
  INDEX idx_payout_date (payout_date),
  FOREIGN KEY (user_id)      REFERENCES users(id),
  FOREIGN KEY (user_rank_id) REFERENCES user_ranks(id)
) ENGINE=InnoDB;
```

---

### `withdrawal_requests`

```sql
CREATE TABLE withdrawal_requests (
  id                  CHAR(36)        NOT NULL PRIMARY KEY,
  user_id             CHAR(36)        NOT NULL,
  bank_account_id     CHAR(36)        NOT NULL,
  amount              DECIMAL(12,2)   NOT NULL,
  status              ENUM('pending','approved','rejected','processed') NOT NULL DEFAULT 'pending',
  requested_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at        DATETIME            NULL,
  processed_by        CHAR(36)            NULL,
  rejection_reason    VARCHAR(255)        NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_status  (status),
  FOREIGN KEY (user_id)         REFERENCES users(id),
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
  FOREIGN KEY (processed_by)    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
```

---

### `bank_accounts`

```sql
CREATE TABLE bank_accounts (
  id              CHAR(36)        NOT NULL PRIMARY KEY,
  user_id         CHAR(36)        NOT NULL,
  account_holder  VARCHAR(100)    NOT NULL,
  account_number  VARCHAR(30)     NOT NULL,
  ifsc_code       VARCHAR(15)     NOT NULL,
  bank_name       VARCHAR(100)    NOT NULL,
  is_primary      TINYINT(1)      NOT NULL DEFAULT 0,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

---

## Table Creation Order (Respect FK dependencies)

```
1. plans
2. ranks
3. users
4. bank_accounts
5. user_plans
6. plan_projections
7. trading_codes
8. user_code_access
9. referrals
10. rewards
11. user_ranks
12. wallet_transactions
13. weekly_payouts
14. withdrawal_requests
```

---

## Wallet Balance Derivation

The current wallet balance is always computed as:

```sql
SELECT 
  SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END) AS wallet_balance
FROM wallet_transactions
WHERE user_id = ?;
```

Or cached in a `users.wallet_balance` column (updated on every transaction — faster reads).

---

## Key Indexes for Performance

```sql
-- Code lookup by date (daily query)
CREATE INDEX idx_trading_codes_date ON trading_codes(code_date);

-- Reward pending queue (admin view)
CREATE INDEX idx_rewards_status ON rewards(status);

-- Weekly payout job (runs every Saturday)
CREATE INDEX idx_user_ranks_active ON user_ranks(status, remaining_weeks);

-- Team tree traversal
CREATE INDEX idx_referrals_inviter ON referrals(inviter_id);
```
