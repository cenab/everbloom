import { Module, forwardRef } from '@nestjs/common';
import { SeatingController } from './seating.controller';
import { SeatingService } from './seating.service';
import { WeddingModule } from '../wedding/wedding.module';
import { AuthModule } from '../auth/auth.module';
import { GuestModule } from '../guest/guest.module';

@Module({
  imports: [
    forwardRef(() => WeddingModule),
    forwardRef(() => AuthModule),
    forwardRef(() => GuestModule),
  ],
  controllers: [SeatingController],
  providers: [SeatingService],
  exports: [SeatingService],
})
export class SeatingModule {}
