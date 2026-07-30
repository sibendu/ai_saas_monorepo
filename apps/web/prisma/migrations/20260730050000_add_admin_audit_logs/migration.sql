-- CreateEnum
CREATE TYPE "AdminAuditAction" AS ENUM ('ROLE_CREATED', 'ROLE_UPDATED', 'ROLE_DELETED', 'USER_UPDATED', 'USER_ROLES_UPDATED', 'ROLE_MODULES_UPDATED');

-- CreateEnum
CREATE TYPE "AdminAuditEntityType" AS ENUM ('ROLE', 'CUSTOMER', 'USER_ROLE', 'ROLE_MODULE');

-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "actor_customer_id" INTEGER,
    "actor_email" TEXT NOT NULL,
    "action" "AdminAuditAction" NOT NULL,
    "entity_type" "AdminAuditEntityType" NOT NULL,
    "entity_id" TEXT,
    "entity_label" TEXT,
    "target_customer_id" INTEGER,
    "target_role_id" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- CreateIndex
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_idx" ON "audit_log"("entity_type");

-- CreateIndex
CREATE INDEX "audit_log_actor_email_idx" ON "audit_log"("actor_email");

-- CreateIndex
CREATE INDEX "audit_log_target_customer_id_idx" ON "audit_log"("target_customer_id");

-- CreateIndex
CREATE INDEX "audit_log_target_role_id_idx" ON "audit_log"("target_role_id");
