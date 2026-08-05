import * as nats from 'node-nats-streaming';
import { randomBytes } from 'node:crypto';
import { TicketCreatedListener } from './events/ticket-created-listener';

const stan = nats.connect('ticketing', randomBytes(5).toString('hex'), {
  url: 'http://localhost:4222',
});

stan.on('connect', () => {
  console.log('Listener connected to NATS');

  stan.on('close', () => {
    console.log('Nats connection closed!');
    process.exit();
  });

  new TicketCreatedListener(stan).listen();
});

// To let the publisher know that we are going down and to stop trying to send messages to these subscribers
process.on('SIGINT', () => stan.close());
process.on('SIGTERM', () => stan.close());
