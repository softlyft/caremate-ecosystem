import { ArrayNotEmpty, IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class PostMessageDto {
  @IsUUID()
  conversation_id!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsString()
  subject?: string | null;
}

export class SealMessagesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID(undefined, { each: true })
  message_ids!: string[];
}
