import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtVerifyService } from './jwt-verify.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminAuthService } from './admin-auth.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtVerifyService,
    AdminAuthGuard,
    AdminAuthService,
  ],
  exports: [
    AuthService,
    JwtVerifyService,
    AdminAuthGuard,
    AdminAuthService,
  ],
})
export class AuthModule {}
