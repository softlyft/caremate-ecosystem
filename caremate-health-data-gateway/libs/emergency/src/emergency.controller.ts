import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, SupabaseJwtGuard } from '@caremate/common';
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

  @Get('patients/:patientId')
  getForPatient(
    @CurrentUser() user: AuthUser,
    @Param('patientId') patientId: string,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.emergencyService.getForConnectedPatient(
      user.userId,
      patientId,
      organizationId ?? '',
    );
  }

  @Put()
  put(@CurrentUser() user: AuthUser, @Body() body: UpsertEmergencyDto) {
    return this.emergencyService.upsert(user.userId, body);
  }
}
