import { Module, forwardRef } from '@nestjs/common';
import { RsvpController } from './rsvp.controller';
import { GuestModule } from '../guest/guest.module';
import { WeddingModule } from '../wedding/wedding.module';

@Module({
  imports: [forwardRef(() => GuestModule), forwardRef(() => WeddingModule)],
  controllers: [RsvpController],
})
export class RsvpModule {}
