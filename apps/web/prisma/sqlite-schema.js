const fs = require('fs')
const path = require('path')
const { DatabaseSync } = require('node:sqlite')

function resolveSqlitePath(databaseUrl, schemaPath) {
  const sqliteFile = (databaseUrl || 'file:../data/demo.db').slice('file:'.length)

  return path.isAbsolute(sqliteFile)
    ? sqliteFile
    : path.resolve(path.dirname(schemaPath), sqliteFile)
}

function createSqliteSchema(databaseUrl, schemaPath) {
  const sqlitePath = resolveSqlitePath(databaseUrl, schemaPath)
  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true })

  const database = new DatabaseSync(sqlitePath)

  try {
    database.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS "customer" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "username" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "first_name" TEXT NOT NULL,
        "middle_name" TEXT,
        "last_name" TEXT NOT NULL,
        "dob" DATETIME,
        "company" TEXT,
        "registration_type" TEXT NOT NULL DEFAULT 'DIRECT',
        "password_reset_token" TEXT,
        "password_reset_expires_at" DATETIME
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "customer_username_key" ON "customer"("username");

      CREATE TABLE IF NOT EXISTS "user_address" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "customer_id" INTEGER NOT NULL,
        "type" TEXT NOT NULL,
        "address_line_1" TEXT NOT NULL,
        "address_line_2" TEXT NOT NULL,
        "address_line_3" TEXT,
        "city" TEXT NOT NULL,
        "district" TEXT NOT NULL,
        "state" TEXT NOT NULL,
        "country" TEXT NOT NULL,
        "pin" TEXT NOT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME NOT NULL,
        FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE INDEX IF NOT EXISTS "user_address_customer_id_idx" ON "user_address"("customer_id");

      CREATE TABLE IF NOT EXISTS "user_contact" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "customer_id" INTEGER NOT NULL,
        "type" TEXT NOT NULL,
        "country_code" TEXT NOT NULL DEFAULT '+91',
        "contact" TEXT NOT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME NOT NULL,
        FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE INDEX IF NOT EXISTS "user_contact_customer_id_idx" ON "user_contact"("customer_id");

      CREATE TABLE IF NOT EXISTS "user_group" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "user_group_name_key" ON "user_group"("name");

      CREATE TABLE IF NOT EXISTS "task" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "task_id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "project" TEXT NOT NULL,
        "priority" TEXT NOT NULL,
        "date" DATETIME NOT NULL,
        "owner" TEXT NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "task_task_id_key" ON "task"("task_id");

      CREATE TABLE IF NOT EXISTS "role" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "role_name_key" ON "role"("name");

      CREATE TABLE IF NOT EXISTS "module" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "parent_module_id" INTEGER,
        "label" TEXT NOT NULL,
        "display_order" INTEGER NOT NULL,
        "icon" TEXT,
        "href" TEXT,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME NOT NULL,
        FOREIGN KEY ("parent_module_id") REFERENCES "module"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "module_label_key" ON "module"("label");
      CREATE INDEX IF NOT EXISTS "module_parent_module_id_idx" ON "module"("parent_module_id");
      CREATE INDEX IF NOT EXISTS "module_parent_module_id_display_order_idx" ON "module"("parent_module_id", "display_order");

      CREATE TABLE IF NOT EXISTS "sub_module" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "module_id" INTEGER NOT NULL,
        "label" TEXT NOT NULL,
        "display_order" INTEGER NOT NULL,
        "icon" TEXT,
        "href" TEXT NOT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME NOT NULL,
        FOREIGN KEY ("module_id") REFERENCES "module"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "sub_module_module_id_label_key" ON "sub_module"("module_id", "label");
      CREATE UNIQUE INDEX IF NOT EXISTS "sub_module_module_id_href_key" ON "sub_module"("module_id", "href");
      CREATE INDEX IF NOT EXISTS "sub_module_module_id_display_order_idx" ON "sub_module"("module_id", "display_order");

      CREATE TABLE IF NOT EXISTS "role_module" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "role_id" INTEGER NOT NULL,
        "module_id" INTEGER NOT NULL,
        "sub_module_id" INTEGER,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("module_id") REFERENCES "module"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("sub_module_id") REFERENCES "sub_module"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE INDEX IF NOT EXISTS "role_module_role_id_module_id_idx" ON "role_module"("role_id", "module_id");
      CREATE INDEX IF NOT EXISTS "role_module_sub_module_id_idx" ON "role_module"("sub_module_id");

      CREATE TABLE IF NOT EXISTS "user_group_member" (
        "group_id" INTEGER NOT NULL,
        "customer_id" INTEGER NOT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("group_id", "customer_id"),
        FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("group_id") REFERENCES "user_group"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE INDEX IF NOT EXISTS "user_group_member_customer_id_idx" ON "user_group_member"("customer_id");

      CREATE TABLE IF NOT EXISTS "group_role" (
        "group_id" INTEGER NOT NULL,
        "role_id" INTEGER NOT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("group_id", "role_id"),
        FOREIGN KEY ("group_id") REFERENCES "user_group"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE INDEX IF NOT EXISTS "group_role_role_id_idx" ON "group_role"("role_id");

      CREATE TABLE IF NOT EXISTS "audit_log" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "actor_customer_id" INTEGER,
        "actor_email" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "entity_type" TEXT NOT NULL,
        "entity_id" TEXT,
        "entity_label" TEXT,
        "target_customer_id" INTEGER,
        "target_role_id" INTEGER,
        "metadata" TEXT,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS "audit_log_created_at_idx" ON "audit_log"("created_at");
      CREATE INDEX IF NOT EXISTS "audit_log_action_idx" ON "audit_log"("action");
      CREATE INDEX IF NOT EXISTS "audit_log_entity_type_idx" ON "audit_log"("entity_type");
      CREATE INDEX IF NOT EXISTS "audit_log_actor_email_idx" ON "audit_log"("actor_email");
      CREATE INDEX IF NOT EXISTS "audit_log_target_customer_id_idx" ON "audit_log"("target_customer_id");
      CREATE INDEX IF NOT EXISTS "audit_log_target_role_id_idx" ON "audit_log"("target_role_id");
    `)
  } finally {
    database.close()
  }
}

module.exports = {
  createSqliteSchema,
  resolveSqlitePath,
}
