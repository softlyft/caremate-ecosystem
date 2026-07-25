import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseClientModule } from '@caremate/supabase-client';
import { EncryptionService } from './encryption.service';

@Module({
  imports: [ConfigModule, SupabaseClientModule],
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class EncryptionModule {}
