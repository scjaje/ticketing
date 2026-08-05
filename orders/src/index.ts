import mongoose from 'mongoose';
import { app } from './app.js';
import { config } from './config.js';
import { natsWrapper } from './nats/nats-wrapper.js';
import { TicketCreatedListener } from './events/listeners/ticket-created-listener.js';
import { TicketUpdatedListener } from './events/listeners/ticket-updated-listener.js';
import { ExpirationCompleteListener } from './events/listeners/expiration-complete-listener.js';
import { PaymentCreatedListener } from './events/listeners/payment-created-listener.js';

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

    new TicketCreatedListener(natsWrapper.client).listen();
    new TicketUpdatedListener(natsWrapper.client).listen();
    new ExpirationCompleteListener(natsWrapper.client).listen();
    new PaymentCreatedListener(natsWrapper.client).listen();

    await mongoose.connect(config.mongo_uri);
    console.log('Connected to MongoDO successfully.');
  } catch (err) {
    console.error(err);
  }

  app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
  });
};

applicationStart();
