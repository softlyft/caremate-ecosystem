import { Module } from '@nestjs/common';
import { CommonModule } from '@caremate/common';
import { EncryptionModule } from '@caremate/encryption';
import { MiniAppSnapshotsController } from './mini-app-snapshots.controller';
import { MiniAppSnapshotsService } from './mini-app-snapshots.service';

@Module({
  imports: [CommonModule, EncryptionModule],
  controllers: [MiniAppSnapshotsController],
  providers: [MiniAppSnapshotsService],
  exports: [MiniAppSnapshotsService],
})
export class MiniAppSnapshotsModule {}
