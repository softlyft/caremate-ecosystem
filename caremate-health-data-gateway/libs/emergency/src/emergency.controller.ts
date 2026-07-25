import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
  SupabaseJwtGuard,
} from '@caremate/common';
import { UpsertEmergencyDto } from './dto/upsert-emergency.dto';
import { EmergencyService } from './emergency.service';

@Controller('v1/emergency')
@UseGuards(SupabaseJwtGuard)
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.emergencyService.getOwn(user.userId);
  }

  @Put()
  put(@CurrentUser() user: AuthUser, @Body() body: UpsertEmergencyDto) {
    return this.emergencyService.upsert(user.userId, body);
  }
}
