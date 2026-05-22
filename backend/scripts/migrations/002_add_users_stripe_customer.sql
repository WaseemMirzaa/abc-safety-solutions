-- Adds Stripe customer id on users (run via scripts/run-db-migrations.sh).

ALTER TABLE `users` ADD COLUMN `stripeCustomerId` VARCHAR(64) NULL;
