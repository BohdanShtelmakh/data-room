import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageService } from './local-storage.service';
import { StorageService } from './storage.service';
import { SupabaseStorageService } from './supabase-storage.service';
import { STORAGE_BACKEND } from './storage.types';

@Module({
  providers: [
    {
      provide: STORAGE_BACKEND,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get('STORAGE_DRIVER', 'local') === 'supabase'
          ? new SupabaseStorageService(config)
          : new LocalStorageService(config),
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
