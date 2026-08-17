-- CreateEnum
CREATE TYPE "ShareType" AS ENUM ('PUBLIC', 'USER');

-- CreateEnum
CREATE TYPE "ShareResourceType" AS ENUM ('DATAROOM', 'FOLDER', 'FILE');

-- CreateTable
CREATE TABLE "Share" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "ShareType" NOT NULL,
    "resourceType" "ShareResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Share_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Share_token_key" ON "Share"("token");

-- CreateIndex
CREATE INDEX "Share_resourceId_resourceType_idx" ON "Share"("resourceId", "resourceType");

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
