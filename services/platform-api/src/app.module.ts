import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { WeddingModule } from './wedding/wedding.module';

@Module({
  imports: [AuthModule, BillingModule, WeddingModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
