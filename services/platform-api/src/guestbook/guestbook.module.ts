import { Module, forwardRef } from '@nestjs/common';
import { GuestbookService } from './guestbook.service';
import { GuestbookAdminController, GuestbookPublicController } from './guestbook.controller';
import { WeddingModule } from '../wedding/wedding.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    forwardRef(() => WeddingModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [GuestbookAdminController, GuestbookPublicController],
  providers: [GuestbookService],
  exports: [GuestbookService],
})
export class GuestbookModule {}
