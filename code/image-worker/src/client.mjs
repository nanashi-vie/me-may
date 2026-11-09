export class WorkerResponseError extends Error {
  constructor(status) {
    super('worker_request_failed');
    this.status = status;
  }
}

export function createClient(origin, token, request = fetch) {
  const url = new URL(origin);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
      || url.pathname !== '/' || url.search || url.hash || !token) throw new Error('invalid_worker_configuration');
  const endpoint = new URL('/actuator/imagejobs', url);
  async function send(command, fields, signal) {
    const timeout = AbortSignal.timeout(10_000);
    const response = await request(endpoint, {
      method: 'POST', redirect: 'error',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, ...fields }),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new WorkerResponseError(response.status);
    }
    return response.status === 204 ? null : response.json();
  }
  return {
    claim: signal => send('CLAIM', {}, signal),
    heartbeat: (job, signal) => send('HEARTBEAT', { jobId: job.jobId, token: job.token }, signal),
    complete: (job, manifest, signal) => send('COMPLETE', {
      jobId: job.jobId, token: job.token, manifest: JSON.stringify(manifest),
    }, signal),
    fail: (job, code, retryable, signal) => send('FAIL', {
      jobId: job.jobId, token: job.token, code, retryable,
    }, signal),
  };
}
