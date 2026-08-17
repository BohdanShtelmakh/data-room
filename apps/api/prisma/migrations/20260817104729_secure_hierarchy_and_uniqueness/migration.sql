-- Remove duplicate file names before applying this migration if production data
-- predates the uniqueness rule.
ALTER TABLE "DataRoom" DROP CONSTRAINT "DataRoom_ownerId_fkey";
ALTER TABLE "Folder" DROP CONSTRAINT "Folder_dataRoomId_fkey";
ALTER TABLE "Folder" DROP CONSTRAINT "Folder_parentId_fkey";

CREATE INDEX "Folder_dataRoomId_idx" ON "Folder"("dataRoomId");
CREATE INDEX "Folder_parentId_idx" ON "Folder"("parentId");
CREATE UNIQUE INDEX "File_folderId_name_key" ON "File"("folderId", "name");
CREATE UNIQUE INDEX "Folder_dataRoomId_parentId_name_key"
  ON "Folder"("dataRoomId", "parentId", "name") NULLS NOT DISTINCT;

ALTER TABLE "DataRoom" ADD CONSTRAINT "DataRoom_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_dataRoomId_fkey"
  FOREIGN KEY ("dataRoomId") REFERENCES "DataRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
