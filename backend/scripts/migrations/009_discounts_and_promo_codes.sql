-- Course sale discount (admin-set on course edit)
ALTER TABLE courses
  ADD COLUMN discountPercent INT NOT NULL DEFAULT 0;

-- Promo codes (admin-created, learner-applied at checkout)
CREATE TABLE IF NOT EXISTS promo_codes (
  id VARCHAR(36) NOT NULL,
  code VARCHAR(64) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  discountPercent INT NOT NULL DEFAULT 10,
  active TINYINT(1) NOT NULL DEFAULT 1,
  expiresAt DATETIME NULL,
  maxUses INT NULL,
  useCount INT NOT NULL DEFAULT 0,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY UQ_promo_codes_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Order pricing snapshot on enrollment
ALTER TABLE enrollments
  ADD COLUMN listPriceCents INT NULL,
  ADD COLUMN amountPaidCents INT NULL,
  ADD COLUMN courseDiscountPercent INT NOT NULL DEFAULT 0,
  ADD COLUMN promoCode VARCHAR(64) NULL,
  ADD COLUMN promoDiscountPercent INT NOT NULL DEFAULT 0;
