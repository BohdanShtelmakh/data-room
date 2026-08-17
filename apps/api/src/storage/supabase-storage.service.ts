import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { StorageBackend, StorageContent, StoredObject } from './storage.types';

@Injectable()
export class SupabaseStorageService implements StorageBackend {
  private readonly client: ReturnType<typeof createClient>;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    this.client = createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      config.getOrThrow<string>('SUPABASE_SECRET_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    this.bucket = config.getOrThrow<string>('SUPABASE_STORAGE_BUCKET');
  }

  async put(file: Express.Multer.File): Promise<StoredObject> {
    const key = randomUUID();
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(key, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });
    if (error) throw error;
    return { key, size: file.size };
  }

  async get(key: string): Promise<StorageContent> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .download(key);
    if (error || !data) throw new NotFoundException('File content not found');
    const buffer = Buffer.from(await data.arrayBuffer());
    return { stream: Readable.from(buffer), size: buffer.length };
  }

  async delete(key: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([key]);
    if (error) throw error;
  }
}
