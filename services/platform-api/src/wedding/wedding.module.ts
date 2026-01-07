import { Module, forwardRef } from '@nestjs/common';
import { WeddingController } from './wedding.controller';
import { SiteConfigController } from './site-config.controller';
import { CalendarController } from './calendar.controller';
import { WeddingService } from './wedding.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [WeddingController, SiteConfigController, CalendarController],
  providers: [WeddingService],
  exports: [WeddingService],
})
export class WeddingModule {}
