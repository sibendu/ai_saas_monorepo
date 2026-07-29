ALTER TABLE "customer"
ADD COLUMN "password_reset_token" TEXT,
ADD COLUMN "password_reset_expires_at" TIMESTAMP(3);
