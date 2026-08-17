ALTER TABLE "Share" DROP CONSTRAINT "Share_createdById_fkey";

CREATE INDEX "Share_userId_idx" ON "Share"("userId");
CREATE INDEX "Share_createdById_idx" ON "Share"("createdById");

ALTER TABLE "Share" ADD CONSTRAINT "Share_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Share" ADD CONSTRAINT "Share_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
