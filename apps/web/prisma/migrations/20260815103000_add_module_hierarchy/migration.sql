ALTER TABLE "module"
ADD COLUMN "parent_module_id" INTEGER;

ALTER TABLE "module"
ADD CONSTRAINT "module_parent_module_id_fkey"
FOREIGN KEY ("parent_module_id") REFERENCES "module"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "module_parent_module_id_idx" ON "module"("parent_module_id");

INSERT INTO "module" ("label", "icon", "href", "parent_module_id", "created_at", "updated_at")
SELECT
  sm."label",
  sm."icon",
  sm."href",
  sm."module_id",
  sm."created_at",
  sm."updated_at"
FROM "sub_module" sm
WHERE NOT EXISTS (
  SELECT 1
  FROM "module" m
  WHERE lower(m."label") = lower(sm."label")
);
