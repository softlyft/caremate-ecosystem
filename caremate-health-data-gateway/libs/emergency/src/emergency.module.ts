import { Module } from '@nestjs/common';
import { CommonModule } from '@caremate/common';
import { EncryptionModule } from '@caremate/encryption';
import { EmergencyController } from './emergency.controller';
import { EmergencyService } from './emergency.service';

@Module({
  imports: [CommonModule, EncryptionModule],
  controllers: [EmergencyController],
  providers: [EmergencyService],
  exports: [EmergencyService],
})
export class EmergencyModule {}
