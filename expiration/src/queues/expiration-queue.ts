import Queue from 'bull';
import { config } from '../config.js';
import { ExpirationCompletePublisher } from '../events/publishers/expiration-complete-publisher.js';
import { natsWrapper } from '../nats/nats-wrapper.js';

interface Payload {
  orderId: string;
}

const expirationQueue = new Queue<Payload>('order:expiration', {
  redis: {
    host: config.redis_host,
  },
});

expirationQueue.process(async (job) => {
  new ExpirationCompletePublisher(natsWrapper.client).publish({
    orderId: job.data.orderId,
  });
});

export { expirationQueue };
