export type User = { id: string; name: string; email: string };

export type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  dataRoomId: string;
};

export type DataFile = {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  folderId: string;
};

export type FolderContent = {
  folder: Pick<Folder, "id" | "name">;
  folders: Folder[];
  files: DataFile[];
};

export type Preview = {
  name: string;
  mimeType: string;
  url?: string;
  text?: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export type ShareResourceType = "DATAROOM" | "FOLDER" | "FILE";

export type ReceivedShare = {
  id: string;
  token: string;
  resourceType: ShareResourceType;
  resourceId: string;
  expiresAt: string | null;
  createdBy: { name: string; email: string };
  resource:
    | ({
        id: string;
        name: string;
        folders?: Folder[];
        files?: DataFile[];
      } & Partial<DataFile>)
    | null;
};
