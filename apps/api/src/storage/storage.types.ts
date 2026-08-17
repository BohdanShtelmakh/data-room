import { Readable } from 'node:stream';

export type StoredObject = {
  key: string;
  size: number;
};

export type StorageContent = {
  stream: Readable;
  size: number;
};

export interface StorageBackend {
  put(file: Express.Multer.File): Promise<StoredObject>;
  get(key: string): Promise<StorageContent>;
  delete(key: string): Promise<void>;
}

export const STORAGE_BACKEND = Symbol('STORAGE_BACKEND');
