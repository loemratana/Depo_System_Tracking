-- CreateTable
CREATE TABLE "telegram_chats" (
    "id" SERIAL NOT NULL,
    "chat_id" VARCHAR(50) NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_chats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_chats_chat_id_key" ON "telegram_chats"("chat_id");

-- CreateIndex
CREATE INDEX "telegram_chats_brand_id_idx" ON "telegram_chats"("brand_id");

-- CreateIndex
CREATE INDEX "telegram_chats_brand_id_is_active_idx" ON "telegram_chats"("brand_id", "is_active");

-- AddForeignKey
ALTER TABLE "telegram_chats" ADD CONSTRAINT "telegram_chats_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
