import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '@caremate/common';
import { EncryptionModule } from '@caremate/encryption';
import { EmergencyModule } from '@caremate/emergency';
import { MiniAppSnapshotsModule } from '@caremate/mini-app-snapshots';
import { ProfileModule } from '@caremate/profile';
import { SupabaseClientModule } from '@caremate/supabase-client';
import { CryptoController } from './crypto.controller';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    CommonModule,
    SupabaseClientModule,
    EncryptionModule,
    ProfileModule,
    EmergencyModule,
    MiniAppSnapshotsModule,
  ],
  controllers: [HealthController, CryptoController],
})
export class AppModule {}
