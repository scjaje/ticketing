import {
  Listener,
  Subjects,
  type OrderCreatedEvent,
} from '@scott-tickets/common';
import { queueGroupName } from './queue-group-name.js';
import type { Message } from 'node-nats-streaming';
import { expirationQueue } from '../../queues/expiration-queue.js';

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
  subject: Subjects.OrderCreated = Subjects.OrderCreated;
  queueGroupName = queueGroupName;

  async onMessage(data: OrderCreatedEvent['data'], msg: Message) {
    // This takes the time from the event and converts it to milliseconds with getTime()
    // it then gets the current time, and then subtracts it to get the remaining milliseconds
    // from when the event was actually made from the time we processed it.
    const delay = new Date(data.expiresAt).getTime() - new Date().getTime();

    console.log(`Waiting ${delay} milliseconds before processing the job.`);

    // create a new job
    await expirationQueue.add(
      { orderId: data.id },
      {
        delay,
      },
    );

    msg.ack();
  }
}
