import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Enable raw body parsing for Stripe webhook signature verification
    rawBody: true,
  });

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Enable CORS for platform-ui dev server
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Platform API running on http://localhost:${port}`);
}

bootstrap();
