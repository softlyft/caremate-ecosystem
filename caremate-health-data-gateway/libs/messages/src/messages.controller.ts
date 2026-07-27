import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, SupabaseJwtGuard } from '@caremate/common';
import { PostMessageDto, SealMessagesDto } from './dto/messages.dto';
import { MessagesService } from './messages.service';

@Controller('v1/messages')
@UseGuards(SupabaseJwtGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  listConversations(
    @CurrentUser() user: AuthUser,
    @Query('organizationId') organizationId?: string,
  ) {
    if (organizationId) {
      return this.messagesService.listOrgConversations(
        user.userId,
        organizationId,
      );
    }
    return this.messagesService.listConversations(user.userId);
  }

  @Get('conversations/:id')
  listMessages(
    @CurrentUser() user: AuthUser,
    @Param('id') conversationId: string,
  ) {
    return this.messagesService.listMessages(user.userId, conversationId);
  }

  @Post('reply')
  reply(@CurrentUser() user: AuthUser, @Body() body: PostMessageDto) {
    return this.messagesService.postReply(user.userId, body);
  }

  /** Encrypt plaintext rows in place (after portal org fan-out RPCs). */
  @Post('seal')
  seal(@CurrentUser() user: AuthUser, @Body() body: SealMessagesDto) {
    return this.messagesService.sealMessages(user.userId, body);
  }
}
