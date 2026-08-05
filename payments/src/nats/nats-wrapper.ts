import nats from 'node-nats-streaming';
import type { Stan } from 'node-nats-streaming';

class NatsWrapper {
  private _client?: Stan;

  get client() {
    if (!this._client) {
      throw new Error('Cannot access NATS client before connecting!');
    }
    return this._client;
  }

  connect(clusterId: string, clientId: string, url: string) {
    // Without this, a failed first connection attempt (e.g. the nats-depl
    // pod isn't ready yet during k8s startup) immediately emits 'error' and
    // rejects below. waitOnFirstConnect makes the client retry internally
    // until it succeeds, instead of giving up on one bad attempt.
    this._client = nats.connect(clusterId, clientId, {
      url,
      waitOnFirstConnect: true,
    });

    return new Promise<void>((resolve, reject) => {
      this.client.on('connect', () => {
        console.log('Connected to NATS');
        resolve();
      });
      this.client.on('error', (err) => {
        reject(err);
      });
    });
  }
}

export const natsWrapper = new NatsWrapper();
