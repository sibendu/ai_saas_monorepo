ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'GROUP_ROLES_UPDATED';
ALTER TYPE "AdminAuditEntityType" ADD VALUE IF NOT EXISTS 'GROUP_ROLE';

CREATE TABLE IF NOT EXISTS "group_role" (
    "group_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_role_pkey" PRIMARY KEY ("group_id","role_id")
);

CREATE INDEX IF NOT EXISTS "group_role_role_id_idx" ON "group_role"("role_id");

ALTER TABLE "group_role"
ADD CONSTRAINT "group_role_group_id_fkey"
FOREIGN KEY ("group_id") REFERENCES "user_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "group_role"
ADD CONSTRAINT "group_role_role_id_fkey"
FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "user_group" ("name", "description", "created_at", "updated_at")
SELECT
    "role"."name" || ' Group',
    'Migrated group for ' || "role"."name" || ' role access',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "role"
WHERE EXISTS (
    SELECT 1
    FROM "user_role"
    WHERE "user_role"."role_id" = "role"."id"
)
AND NOT EXISTS (
    SELECT 1
    FROM "user_group"
    WHERE LOWER("user_group"."name") = LOWER("role"."name" || ' Group')
);

INSERT INTO "group_role" ("group_id", "role_id", "created_at")
SELECT "user_group"."id", "role"."id", CURRENT_TIMESTAMP
FROM "role"
JOIN "user_group" ON LOWER("user_group"."name") = LOWER("role"."name" || ' Group')
WHERE EXISTS (
    SELECT 1
    FROM "user_role"
    WHERE "user_role"."role_id" = "role"."id"
)
ON CONFLICT ("group_id", "role_id") DO NOTHING;

INSERT INTO "user_group_member" ("group_id", "customer_id", "created_at")
SELECT DISTINCT "user_group"."id", "user_role"."customer_id", CURRENT_TIMESTAMP
FROM "user_role"
JOIN "role" ON "role"."id" = "user_role"."role_id"
JOIN "user_group" ON LOWER("user_group"."name") = LOWER("role"."name" || ' Group')
ON CONFLICT ("group_id", "customer_id") DO NOTHING;

DROP TABLE IF EXISTS "user_role";
