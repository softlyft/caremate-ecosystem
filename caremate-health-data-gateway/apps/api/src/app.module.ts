import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '@caremate/common';
import { DocumentsModule } from '@caremate/documents';
import { EncryptionModule } from '@caremate/encryption';
import { EmergencyModule } from '@caremate/emergency';
import { FamilyModule } from '@caremate/family';
import { MessagesModule } from '@caremate/messages';
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
    FamilyModule,
    MessagesModule,
    DocumentsModule,
  ],
  controllers: [HealthController, CryptoController],
})
export class AppModule {}
