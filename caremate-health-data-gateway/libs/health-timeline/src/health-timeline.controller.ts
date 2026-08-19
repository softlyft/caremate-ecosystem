import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthUser, CurrentUser, SupabaseJwtGuard } from '@caremate/common';
import { UpsertHealthTimelineEventDto } from './dto/upsert-health-timeline-event.dto';
import { HealthTimelineService } from './health-timeline.service';

@Controller('v1/health-timeline')
@UseGuards(SupabaseJwtGuard)
export class HealthTimelineController {
  constructor(private readonly timeline: HealthTimelineService) {}

  @Get()
  listOwn(@CurrentUser() user: AuthUser) {
    return this.timeline.listOwn(user.userId);
  }

  @Get('patients/:patientId')
  listForPatient(
    @CurrentUser() user: AuthUser,
    @Param('patientId') patientId: string,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.timeline.listForConnectedPatient(
      user.userId,
      patientId,
      organizationId ?? '',
    );
  }

  @Put()
  put(@CurrentUser() user: AuthUser, @Body() body: UpsertHealthTimelineEventDto) {
    return this.timeline.upsert(user.userId, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.timeline.deleteOwn(user.userId, id);
  }
}
