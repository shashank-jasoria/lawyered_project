import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
    app.enableCors({
      origin: 'http://localhost:3000', 
      credentials: true,               
    });
  await app.listen(process.env.PORT ?? 5000);
  app.useGlobalPipes(new ValidationPipe());
}
bootstrap();
