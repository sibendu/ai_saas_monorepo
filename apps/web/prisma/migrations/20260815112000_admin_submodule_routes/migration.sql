UPDATE "module"
SET "href" = '/admin/roles', "updated_at" = CURRENT_TIMESTAMP
WHERE "label" = 'Admin';

WITH admin_module AS (
  SELECT "id" FROM "module" WHERE "label" = 'Admin'
),
admin_routes("label", "href") AS (
  VALUES
    ('Roles', '/admin/roles'),
    ('Users', '/admin/users'),
    ('Groups', '/admin/groups'),
    ('Modules', '/admin/modules'),
    ('Role-Module', '/admin/role-module'),
    ('Style', '/admin/style'),
    ('Logs', '/admin/logs')
)
UPDATE "sub_module" sub_module
SET "href" = admin_routes."href", "updated_at" = CURRENT_TIMESTAMP
FROM admin_module
CROSS JOIN admin_routes
WHERE sub_module."module_id" = admin_module."id"
  AND sub_module."label" = admin_routes."label";

WITH admin_module AS (
  SELECT "id" FROM "module" WHERE "label" = 'Admin'
),
admin_routes("label", "href") AS (
  VALUES
    ('Roles', '/admin/roles'),
    ('Users', '/admin/users'),
    ('Groups', '/admin/groups'),
    ('Modules', '/admin/modules'),
    ('Role-Module', '/admin/role-module'),
    ('Style', '/admin/style'),
    ('Logs', '/admin/logs')
)
UPDATE "module" child_module
SET
  "href" = admin_routes."href",
  "parent_module_id" = admin_module."id",
  "updated_at" = CURRENT_TIMESTAMP
FROM admin_module
CROSS JOIN admin_routes
WHERE child_module."label" = admin_routes."label";
