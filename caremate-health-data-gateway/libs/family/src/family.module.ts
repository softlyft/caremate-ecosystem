import { Module } from '@nestjs/common';
import { CommonModule } from '@caremate/common';
import { EncryptionModule } from '@caremate/encryption';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';

@Module({
  imports: [CommonModule, EncryptionModule],
  controllers: [FamilyController],
  providers: [FamilyService],
  exports: [FamilyService],
})
export class FamilyModule {}
