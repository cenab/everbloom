import { Module, forwardRef } from '@nestjs/common';
import { WeddingController } from './wedding.controller';
import { WeddingService } from './wedding.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [WeddingController],
  providers: [WeddingService],
  exports: [WeddingService],
})
export class WeddingModule {}
