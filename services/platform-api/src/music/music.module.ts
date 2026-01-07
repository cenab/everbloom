import { Module, forwardRef } from '@nestjs/common';
import { MusicService } from './music.service';
import { MusicAdminController, MusicPublicController } from './music.controller';
import { WeddingModule } from '../wedding/wedding.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => WeddingModule), forwardRef(() => AuthModule)],
  providers: [MusicService],
  controllers: [MusicAdminController, MusicPublicController],
  exports: [MusicService],
})
export class MusicModule {}
