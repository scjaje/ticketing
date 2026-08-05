import {
  Listener,
  Subjects,
  type OrderCreatedEvent,
} from '@scott-tickets/common';
import { queueGroupName } from './queue-group-name.js';
import type { Message } from 'node-nats-streaming';

import { Order } from '../../models/order.js';

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
  subject: Subjects.OrderCreated = Subjects.OrderCreated;
  queueGroupName = queueGroupName;
  async onMessage(data: OrderCreatedEvent['data'], msg: Message) {
    const order = Order.build({
      id: data.id,
      price: data.ticket.price,
      status: data.status,
      userId: data.userId,
      version: data.version,
    });

    await order.save();

    // ack the message
    msg.ack();
  }
}
