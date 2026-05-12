-- AlterTable: add isAdmin flag to users (default false, populated server-side).
ALTER TABLE "users" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;
