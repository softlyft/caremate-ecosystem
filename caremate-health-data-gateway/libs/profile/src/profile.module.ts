import { Module } from '@nestjs/common';
import { CommonModule } from '@caremate/common';
import { EncryptionModule } from '@caremate/encryption';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [CommonModule, EncryptionModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
