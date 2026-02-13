// IMPORTANT: Make sure to import `instrument.ts` at the top of your file.
import "./instrument"; 

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefijo global para todas tus rutas
  app.setGlobalPrefix('api'); 

  // Agregamos ValidationPipe (Best Practice para que no rompan tu API)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Server running on port ${port} with prefix /api`);
}
bootstrap();