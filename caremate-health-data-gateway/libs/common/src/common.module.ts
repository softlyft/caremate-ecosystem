import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseJwtGuard } from './auth/supabase-jwt.guard';

@Module({
  imports: [ConfigModule],
  providers: [SupabaseJwtGuard],
  exports: [SupabaseJwtGuard, ConfigModule],
})
export class CommonModule {}
