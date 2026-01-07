import { Module, forwardRef } from '@nestjs/common';
import { RsvpController } from './rsvp.controller';
import { GuestModule } from '../guest/guest.module';
import { WeddingModule } from '../wedding/wedding.module';
import { SeatingModule } from '../seating/seating.module';

@Module({
  imports: [
    forwardRef(() => GuestModule),
    forwardRef(() => WeddingModule),
    forwardRef(() => SeatingModule),
  ],
  controllers: [RsvpController],
})
export class RsvpModule {}
