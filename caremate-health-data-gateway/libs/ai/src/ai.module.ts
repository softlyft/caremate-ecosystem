import { Module } from '@nestjs/common';
import { CommonModule } from '@caremate/common';
import { SupabaseClientModule } from '@caremate/supabase-client';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [CommonModule, SupabaseClientModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
