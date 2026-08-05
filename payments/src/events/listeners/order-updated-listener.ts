import {
  Listener,
  Subjects,
  type OrderUpdatedEvent,
} from '@scott-tickets/common';
import { queueGroupName } from './queue-group-name.js';
import type { Message } from 'node-nats-streaming';

import { Order } from '../../models/order.js';

export class OrderUpdatedListener extends Listener<OrderUpdatedEvent> {
  subject: Subjects.OrderUpdated = Subjects.OrderUpdated;
  queueGroupName = queueGroupName;
  async onMessage(data: OrderUpdatedEvent['data'], msg: Message) {
    const order = await Order.findOne({
      _id: data.id,
      version: data.version - 1,
    });

    if (!order) {
      throw new Error('Order not found');
    }

    order.status = data.status;

    await order.save();

    // ack the message
    msg.ack();
  }
}
