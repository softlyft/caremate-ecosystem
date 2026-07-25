import { Callback, Context, Handler } from 'aws-lambda';
import { configure as serverlessExpress } from '@codegenie/serverless-express';
import { createGatewayApp } from './bootstrap';

let cachedServer: Handler | undefined;

async function bootstrapServer(): Promise<Handler> {
  if (cachedServer) {
    return cachedServer;
  }

  const { expressApp } = await createGatewayApp();
  cachedServer = serverlessExpress({ app: expressApp });
  return cachedServer;
}

/**
 * AWS Lambda entry (API Gateway HTTP API / REST / Function URL).
 * Handler path after package: `dist-lambda/lambda.handler`
 */
export const handler: Handler = async (
  event: unknown,
  context: Context,
  callback: Callback,
) => {
  // Reuse the Nest app across warm invocations.
  context.callbackWaitsForEmptyEventLoop = false;
  const server = await bootstrapServer();
  return server(event, context, callback);
};
