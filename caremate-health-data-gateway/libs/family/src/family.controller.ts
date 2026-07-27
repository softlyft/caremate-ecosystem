import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthUser, CurrentUser, SupabaseJwtGuard } from '@caremate/common';
import { UpsertFamilyMemberDto } from './dto/upsert-family-member.dto';
import { FamilyService } from './family.service';

@Controller('v1/family/members')
@UseGuards(SupabaseJwtGuard)
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.familyService.listMembers(user.userId);
  }

  @Put()
  put(@CurrentUser() user: AuthUser, @Body() body: UpsertFamilyMemberDto) {
    return this.familyService.upsertMember(user.userId, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.familyService.deleteMember(user.userId, id);
  }
}
