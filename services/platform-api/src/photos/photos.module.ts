import { Module } from '@nestjs/common';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';
import { WeddingModule } from '../wedding/wedding.module';

@Module({
  imports: [WeddingModule],
  controllers: [PhotosController],
  providers: [PhotosService],
})
export class PhotosModule {}
