import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
  SupabaseJwtGuard,
} from '@caremate/common';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { ProfileService } from './profile.service';

@Controller('v1/profile')
@UseGuards(SupabaseJwtGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.profileService.getOwn(user.userId);
  }

  @Put()
  put(@CurrentUser() user: AuthUser, @Body() body: UpsertProfileDto) {
    return this.profileService.upsert(user.userId, body);
  }
}
