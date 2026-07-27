import 'reflect-metadata';

import { createGatewayApp } from './bootstrap';

async function bootstrap() {
  const { nestApp } = await createGatewayApp();
  const port = Number(process.env.PORT ?? 3100);
  await nestApp.listen(port);
}

void bootstrap();
