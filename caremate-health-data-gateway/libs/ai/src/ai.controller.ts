import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthUser, CurrentUser, SupabaseJwtGuard } from '@caremate/common';
import { AiService } from './ai.service';
import {
  AiFeedbackDto,
  CreateAiConversationDto,
  PostAiMessageDto,
} from './dto/ai.dto';

@Controller('v1/ai')
@UseGuards(SupabaseJwtGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('conversations')
  createConversation(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateAiConversationDto,
  ) {
    return this.aiService.createConversation(user.userId, body);
  }

  @Get('conversations')
  listConversations(@CurrentUser() user: AuthUser) {
    return this.aiService.listConversations(user.userId);
  }

  @Get('conversations/:id')
  getConversation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.aiService.getConversation(user.userId, id);
  }

  @Post('conversations/:id/messages')
  postMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: PostAiMessageDto,
  ) {
    return this.aiService.postMessage(user.userId, id, body);
  }

  @Post('messages/:id/feedback')
  feedback(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: AiFeedbackDto,
  ) {
    return this.aiService.submitFeedback(user.userId, id, body);
  }

  @Delete('conversations/:id')
  deleteConversation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.aiService.deleteConversation(user.userId, id);
  }
}
