import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, SupabaseJwtGuard } from '@caremate/common';
import { UpsertDocumentDto } from './dto/upsert-document.dto';
import { DocumentsService } from './documents.service';

@Controller('v1/documents')
@UseGuards(SupabaseJwtGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('organizationId') organizationId?: string,
  ) {
    if (organizationId) {
      return this.documentsService.listForOrganization(
        user.userId,
        organizationId,
      );
    }
    return this.documentsService.listMine(user.userId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.documentsService.getOne(user.userId, id);
  }

  @Put()
  put(@CurrentUser() user: AuthUser, @Body() body: UpsertDocumentDto) {
    return this.documentsService.upsert(user.userId, body);
  }
}
