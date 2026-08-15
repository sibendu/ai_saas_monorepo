CREATE TABLE "user_group_member" (
  "group_id" INTEGER NOT NULL,
  "customer_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_group_member_pkey" PRIMARY KEY ("group_id", "customer_id"),
  CONSTRAINT "user_group_member_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "user_group"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_group_member_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "user_group_member_customer_id_idx" ON "user_group_member"("customer_id");
