import { Module } from '@nestjs/common';
import { CommonModule } from '@caremate/common';
import { EncryptionModule } from '@caremate/encryption';
import { HealthTimelineController } from './health-timeline.controller';
import { HealthTimelineService } from './health-timeline.service';

@Module({
  imports: [CommonModule, EncryptionModule],
  controllers: [HealthTimelineController],
  providers: [HealthTimelineService],
  exports: [HealthTimelineService],
})
export class HealthTimelineModule {}
