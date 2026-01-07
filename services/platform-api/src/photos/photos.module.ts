import { Module } from '@nestjs/common';
import { PhotosController } from './photos.controller';
import { PhotosAdminController } from './photos.admin.controller';
import { PhotosService } from './photos.service';
import { AuthModule } from '../auth/auth.module';
import { WeddingModule } from '../wedding/wedding.module';

@Module({
  imports: [AuthModule, WeddingModule],
  controllers: [PhotosController, PhotosAdminController],
  providers: [PhotosService],
})
export class PhotosModule {}
