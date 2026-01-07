import { Module, forwardRef } from '@nestjs/common';
import { GuestController } from './guest.controller';
import { TagController } from './tag.controller';
import { GuestService } from './guest.service';
import { TagService } from './tag.service';
import { AuthModule } from '../auth/auth.module';
import { WeddingModule } from '../wedding/wedding.module';

@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => WeddingModule)],
  controllers: [GuestController, TagController],
  providers: [GuestService, TagService],
  exports: [GuestService, TagService],
})
export class GuestModule {}
