ALTER TABLE "messages" ALTER COLUMN "signal" SET DEFAULT 'text';--> statement-breakpoint
-- Pesan yang dibuat sebelum ada pilihan sinyal mendapat 'audio' dari default lama; kembalikan ke 'text'
UPDATE "messages" SET "signal" = 'text' WHERE "signal" = 'audio';
