import { Module, forwardRef } from '@nestjs/common';
import { GuestController } from './guest.controller';
import { GuestService } from './guest.service';
import { AuthModule } from '../auth/auth.module';
import { WeddingModule } from '../wedding/wedding.module';

@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => WeddingModule)],
  controllers: [GuestController],
  providers: [GuestService],
  exports: [GuestService],
})
export class GuestModule {}
