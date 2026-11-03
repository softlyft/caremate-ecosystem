import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateAiConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

export class PostAiMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;

  /** Client idempotency key — retries with the same id reuse/resume the turn. */
  @IsOptional()
  @IsUUID('4')
  clientRequestId?: string;
}

export class AiFeedbackDto {
  @IsIn(['up', 'down'])
  rating!: 'up' | 'down';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class ConversationIdParam {
  @IsUUID()
  id!: string;
}
