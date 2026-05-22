-- Stripe Checkout session ids (cs_…) exceed 64 chars. Prefer: bash scripts/run-db-migrations.sh
ALTER TABLE `enrollments` MODIFY COLUMN `orderId` VARCHAR(255) NOT NULL;
