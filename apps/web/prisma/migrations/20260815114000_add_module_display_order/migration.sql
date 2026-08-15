ALTER TABLE "module"
ADD COLUMN "display_order" INTEGER;

WITH ordered_modules AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "parent_module_id"
      ORDER BY "label" ASC, "id" ASC
    ) AS row_number
  FROM "module"
)
UPDATE "module" module
SET "display_order" = ordered_modules.row_number
FROM ordered_modules
WHERE module."id" = ordered_modules."id";

ALTER TABLE "module"
ALTER COLUMN "display_order" SET NOT NULL;

CREATE INDEX "module_parent_module_id_display_order_idx"
ON "module"("parent_module_id", "display_order");

ALTER TABLE "sub_module"
ADD COLUMN "display_order" INTEGER;

WITH ordered_sub_modules AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "module_id"
      ORDER BY "label" ASC, "id" ASC
    ) AS row_number
  FROM "sub_module"
)
UPDATE "sub_module" sub_module
SET "display_order" = ordered_sub_modules.row_number
FROM ordered_sub_modules
WHERE sub_module."id" = ordered_sub_modules."id";

ALTER TABLE "sub_module"
ALTER COLUMN "display_order" SET NOT NULL;

CREATE INDEX "sub_module_module_id_display_order_idx"
ON "sub_module"("module_id", "display_order");

UPDATE "module"
SET "display_order" = ordered_modules."display_order"
FROM (
  VALUES
    ('Dashboard', 1),
    ('CRM', 2),
    ('Reporting', 3),
    ('Settings', 4),
    ('Admin', 5),
    ('CRM Dashboard', 1),
    ('Contacts', 2),
    ('Leads', 3),
    ('Reporting Overview', 1),
    ('Charts', 2),
    ('Preferences', 1),
    ('Roles', 1),
    ('Users', 2),
    ('Groups', 3),
    ('Modules', 4),
    ('Role-Module', 5),
    ('Style', 6),
    ('Logs', 7)
) AS ordered_modules("label", "display_order")
WHERE "module"."label" = ordered_modules."label";

UPDATE "sub_module"
SET "display_order" = ordered_sub_modules."display_order"
FROM "module" parent_module
JOIN (
  VALUES
    ('CRM', 'CRM Dashboard', 1),
    ('CRM', 'Contacts', 2),
    ('CRM', 'Leads', 3),
    ('Reporting', 'Reporting Overview', 1),
    ('Reporting', 'Charts', 2),
    ('Settings', 'Preferences', 1),
    ('Admin', 'Roles', 1),
    ('Admin', 'Users', 2),
    ('Admin', 'Groups', 3),
    ('Admin', 'Modules', 4),
    ('Admin', 'Role-Module', 5),
    ('Admin', 'Style', 6),
    ('Admin', 'Logs', 7)
) AS ordered_sub_modules("parent_label", "label", "display_order")
  ON parent_module."label" = ordered_sub_modules."parent_label"
WHERE "sub_module"."module_id" = parent_module."id"
  AND "sub_module"."label" = ordered_sub_modules."label";
