CREATE TYPE "AddressType" AS ENUM ('PERMANENT', 'COMMUNICATION');

CREATE TYPE "ContactType" AS ENUM ('MOBILE', 'OTHER');

ALTER TABLE "customer"
  ADD COLUMN "first_name" VARCHAR(40),
  ADD COLUMN "middle_name" VARCHAR(40),
  ADD COLUMN "last_name" VARCHAR(40),
  ADD COLUMN "dob" TIMESTAMP(3);

UPDATE "customer"
SET
  "first_name" = LEFT(NULLIF(SPLIT_PART(TRIM("name"), ' ', 1), ''), 40),
  "last_name" = LEFT(
    COALESCE(
      NULLIF(TRIM(SUBSTRING(TRIM("name") FROM POSITION(' ' IN TRIM("name")) + 1)), ''),
      NULLIF(TRIM("name"), ''),
      'User'
    ),
    40
  );

UPDATE "customer"
SET
  "first_name" = COALESCE(NULLIF("first_name", ''), 'User'),
  "last_name" = COALESCE(NULLIF("last_name", ''), 'User');

ALTER TABLE "customer"
  ALTER COLUMN "first_name" SET NOT NULL,
  ALTER COLUMN "last_name" SET NOT NULL;

CREATE TABLE "user_address" (
  "id" SERIAL NOT NULL,
  "customer_id" INTEGER NOT NULL,
  "type" "AddressType" NOT NULL,
  "address_line_1" VARCHAR(60) NOT NULL,
  "address_line_2" VARCHAR(60) NOT NULL,
  "address_line_3" VARCHAR(60),
  "city" VARCHAR(40) NOT NULL,
  "district" VARCHAR(40) NOT NULL,
  "state" VARCHAR(40) NOT NULL,
  "country" VARCHAR(40) NOT NULL,
  "pin" VARCHAR(12) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_address_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_contact" (
  "id" SERIAL NOT NULL,
  "customer_id" INTEGER NOT NULL,
  "type" "ContactType" NOT NULL,
  "country_code" VARCHAR(8) NOT NULL DEFAULT '+91',
  "contact" VARCHAR(40) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_contact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_address_customer_id_idx" ON "user_address"("customer_id");

CREATE INDEX "user_contact_customer_id_idx" ON "user_contact"("customer_id");

ALTER TABLE "user_address"
  ADD CONSTRAINT "user_address_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_contact"
  ADD CONSTRAINT "user_contact_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
