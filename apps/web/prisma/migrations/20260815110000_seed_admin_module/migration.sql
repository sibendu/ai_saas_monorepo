INSERT INTO "module" ("label", "icon", "href", "parent_module_id", "created_at", "updated_at")
VALUES ('Admin', 'settings', '/admin#roles', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("label") DO UPDATE
SET
  "icon" = EXCLUDED."icon",
  "href" = EXCLUDED."href",
  "parent_module_id" = NULL,
  "updated_at" = CURRENT_TIMESTAMP;

WITH admin_module AS (
  SELECT "id" FROM "module" WHERE "label" = 'Admin'
),
admin_tabs("label", "icon", "href") AS (
  VALUES
    ('Roles', 'settings', '/admin#roles'),
    ('Users', 'users', '/admin#users'),
    ('Groups', 'users', '/admin#groups'),
    ('Modules', 'workspace', '/admin#modules'),
    ('Role-Module', 'workspace', '/admin#role-module'),
    ('Style', 'settings', '/admin#style'),
    ('Logs', 'workspace', '/admin#logs')
)
INSERT INTO "sub_module" ("module_id", "label", "icon", "href", "created_at", "updated_at")
SELECT admin_module."id", admin_tabs."label", admin_tabs."icon", admin_tabs."href", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM admin_module
CROSS JOIN admin_tabs
ON CONFLICT ("module_id", "label") DO UPDATE
SET
  "icon" = EXCLUDED."icon",
  "href" = EXCLUDED."href",
  "updated_at" = CURRENT_TIMESTAMP;

WITH admin_module AS (
  SELECT "id" FROM "module" WHERE "label" = 'Admin'
),
admin_tabs("label", "icon", "href") AS (
  VALUES
    ('Roles', 'settings', '/admin#roles'),
    ('Users', 'users', '/admin#users'),
    ('Groups', 'users', '/admin#groups'),
    ('Modules', 'workspace', '/admin#modules'),
    ('Role-Module', 'workspace', '/admin#role-module'),
    ('Style', 'settings', '/admin#style'),
    ('Logs', 'workspace', '/admin#logs')
)
INSERT INTO "module" ("label", "icon", "href", "parent_module_id", "created_at", "updated_at")
SELECT admin_tabs."label", admin_tabs."icon", admin_tabs."href", admin_module."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM admin_module
CROSS JOIN admin_tabs
ON CONFLICT ("label") DO UPDATE
SET
  "icon" = EXCLUDED."icon",
  "href" = EXCLUDED."href",
  "parent_module_id" = EXCLUDED."parent_module_id",
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "role_module" ("role_id", "module_id", "sub_module_id", "created_at")
SELECT role_record."id", admin_module."id", NULL, CURRENT_TIMESTAMP
FROM "role" role_record
CROSS JOIN "module" admin_module
WHERE role_record."name" = 'Admin'
  AND admin_module."label" = 'Admin'
  AND NOT EXISTS (
    SELECT 1
    FROM "role_module" existing_role_module
    WHERE existing_role_module."role_id" = role_record."id"
      AND existing_role_module."module_id" = admin_module."id"
      AND existing_role_module."sub_module_id" IS NULL
  );

INSERT INTO "role_module" ("role_id", "module_id", "sub_module_id", "created_at")
SELECT role_record."id", admin_module."id", sub_module."id", CURRENT_TIMESTAMP
FROM "role" role_record
CROSS JOIN "module" admin_module
JOIN "sub_module" sub_module ON sub_module."module_id" = admin_module."id"
WHERE role_record."name" = 'Admin'
  AND admin_module."label" = 'Admin'
  AND sub_module."label" IN (
    'Roles',
    'Users',
    'Groups',
    'Modules',
    'Role-Module',
    'Style',
    'Logs'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "role_module" existing_role_module
    WHERE existing_role_module."role_id" = role_record."id"
      AND existing_role_module."module_id" = admin_module."id"
      AND existing_role_module."sub_module_id" = sub_module."id"
  );
