CREATE TABLE "user_group" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_group_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_group_name_key" ON "user_group"("name");
