import { config } from './config.js';
import { OrderCreatedListener } from './events/listeners/order-created-listener.js';
import { natsWrapper } from './nats/nats-wrapper.js';

const PORT = 3000;

const applicationStart = async () => {
  try {
    await natsWrapper.connect(
      config.nats_cluster_id,
      config.nats_client_id,
      config.nats_url,
    );

    natsWrapper.client.on('close', () => {
      console.log('NATS connection closed!');
      process.exit();
    });

    process.on('SIGINT', () => natsWrapper.client.close());
    process.on('SIGTERM', () => natsWrapper.client.close());

    new OrderCreatedListener(natsWrapper.client).listen();
  } catch (err) {
    console.error(err);
  }
};

applicationStart();
