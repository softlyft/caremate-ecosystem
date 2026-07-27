import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
  SupabaseJwtGuard,
} from '@caremate/common';
import { UpsertMiniAppSnapshotDto } from './dto/upsert-mini-app-snapshot.dto';
import { MiniAppSnapshotsService } from './mini-app-snapshots.service';

@Controller('v1/mini-app-snapshots')
@UseGuards(SupabaseJwtGuard)
export class MiniAppSnapshotsController {
  constructor(private readonly snapshots: MiniAppSnapshotsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.snapshots.listOwn(user.userId);
  }

  @Get(':appKey')
  get(@CurrentUser() user: AuthUser, @Param('appKey') appKey: string) {
    return this.snapshots.getOwn(user.userId, appKey);
  }

  @Put()
  put(@CurrentUser() user: AuthUser, @Body() body: UpsertMiniAppSnapshotDto) {
    return this.snapshots.upsert(user.userId, body);
  }
}
