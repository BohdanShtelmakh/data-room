import { Inject, Injectable } from '@nestjs/common';
import { STORAGE_BACKEND } from './storage.types';
import type { StorageBackend } from './storage.types';

@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_BACKEND) private readonly backend: StorageBackend,
  ) {}

  put(file: Express.Multer.File) {
    return this.backend.put(file);
  }

  get(key: string) {
    return this.backend.get(key);
  }

  delete(key: string) {
    return this.backend.delete(key);
  }
}
