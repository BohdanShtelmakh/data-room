import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { StorageBackend, StorageContent, StoredObject } from './storage.types';

@Injectable()
export class LocalStorageService implements StorageBackend {
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = path.resolve(
      config.get<string>('LOCAL_STORAGE_PATH', './uploads'),
    );
  }

  async put(file: Express.Multer.File): Promise<StoredObject> {
    await mkdir(this.root, { recursive: true });
    const key = randomUUID();
    await writeFile(this.resolveKey(key), file.buffer, { flag: 'wx' });
    return { key, size: file.size };
  }

  async get(key: string): Promise<StorageContent> {
    const filePath = this.resolveKey(key);
    try {
      const fileStats = await stat(filePath);
      if (!fileStats.isFile()) throw new Error('Not a file');
      return { stream: createReadStream(filePath), size: fileStats.size };
    } catch {
      throw new NotFoundException('File content not found');
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolveKey(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  private resolveKey(key: string) {
    const normalized = key.replace(/^uploads[\\/]/, '');
    if (!normalized || path.isAbsolute(normalized)) {
      throw new NotFoundException('File content not found');
    }
    const resolved = path.resolve(this.root, normalized);
    if (!resolved.startsWith(`${this.root}${path.sep}`)) {
      throw new NotFoundException('File content not found');
    }
    return resolved;
  }
}
