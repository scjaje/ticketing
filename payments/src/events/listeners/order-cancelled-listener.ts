import {
  Listener,
  OrderStatus,
  Subjects,
  type OrderCancelledEvent,
} from '@scott-tickets/common';
import { queueGroupName } from './queue-group-name.js';
import type { Message } from 'node-nats-streaming';

import { Order } from '../../models/order.js';

export class OrderCancelledListener extends Listener<OrderCancelledEvent> {
  subject: Subjects.OrderCancelled = Subjects.OrderCancelled;
  queueGroupName = queueGroupName;
  async onMessage(data: OrderCancelledEvent['data'], msg: Message) {
    const order = await Order.findOne({
      _id: data.id,
      version: data.version - 1,
    });

    if (!order) {
      throw new Error('Order not found');
    }

    order.status = OrderStatus.Cancelled;

    await order.save();

    // ack the message
    msg.ack();
  }
}
