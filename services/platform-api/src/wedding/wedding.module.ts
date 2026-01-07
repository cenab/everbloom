import { Module } from '@nestjs/common';
import { WeddingService } from './wedding.service';

@Module({
  providers: [WeddingService],
  exports: [WeddingService],
})
export class WeddingModule {}
