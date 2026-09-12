import { createServer, type ServerResponse } from 'node:http';

import type { HealthResponse } from '@pcc/contracts';
import { parseServiceEnvironment } from '@pcc/validation';

export const workerName = 'pcc-background-worker';

export function getWorkerHealth(): HealthResponse {
  return {
    service: 'worker',
    status: 'ok',
  };
}

export function writeHealthResponse(response: ServerResponse): void {
  response.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(getWorkerHealth()));
}

function startWorker(): void {
  const environment = parseServiceEnvironment(process.env, 3003);
  const server = createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      writeHealthResponse(response);
      return;
    }

    response.writeHead(404, {
      'content-type': 'application/json; charset=utf-8',
    });
    response.end(JSON.stringify({ error: 'not_found' }));
  });

  server.listen(environment.PORT, () => {
    console.info(`${workerName} listening on port ${environment.PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startWorker();
}
