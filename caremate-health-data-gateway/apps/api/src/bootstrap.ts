import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { NestExpressApplication } from '@nestjs/platform-express';
import express, { Express } from 'express';
import { AppModule } from './app.module';

export type GatewayHttpApp = {
  nestApp: NestExpressApplication;
  expressApp: Express;
};

/**
 * Shared Nest bootstrap for local HTTP and AWS Lambda.
 * Does not call listen() — caller decides how to serve.
 */
export async function createGatewayApp(): Promise<GatewayHttpApp> {
  const expressApp = express();
  const nestApp = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(expressApp),
    {
      logger: process.env.NODE_ENV === 'production' ? ['error', 'warn', 'log'] : undefined,
    },
  );

  nestApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await nestApp.init();
  return { nestApp, expressApp };
}
