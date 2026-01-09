import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Enable raw body parsing for Stripe webhook signature verification
    rawBody: true,
  });

  // Register global exception filter for structured error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // Set global API prefix
  app.setGlobalPrefix('api');

  const corsOrigins = [
    'http://localhost:3000',
    'http://localhost:4321',
    'http://localhost:8888',
    process.env.PLATFORM_URL,
    process.env.WEDDING_SITE_URL,
  ].filter((origin): origin is string => Boolean(origin));

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Platform API running on http://localhost:${port}`);
}

bootstrap();
