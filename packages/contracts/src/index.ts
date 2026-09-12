export const apiVersion = 'v1' as const;

export interface HealthResponse {
  service: 'api' | 'worker';
  status: 'ok';
}
