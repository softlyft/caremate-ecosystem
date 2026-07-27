import { Controller, Post, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, SupabaseJwtGuard } from '@caremate/common';
import { EncryptionService } from '@caremate/encryption';

@Controller('v1/crypto')
@UseGuards(SupabaseJwtGuard)
export class CryptoController {
  constructor(private readonly encryption: EncryptionService) {}

  @Post('bootstrap')
  bootstrap(@CurrentUser() user: AuthUser) {
    return this.encryption.bootstrapUserKey(user.userId);
  }
}
