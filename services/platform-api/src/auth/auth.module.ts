import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtVerifyService } from './jwt-verify.service';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminAuthService } from './admin-auth.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtVerifyService,
    AdminService,
    AdminAuthGuard,
    AdminAuthService,
  ],
  exports: [
    AuthService,
    JwtVerifyService,
    AdminService,
    AdminAuthGuard,
    AdminAuthService,
  ],
})
export class AuthModule {}
