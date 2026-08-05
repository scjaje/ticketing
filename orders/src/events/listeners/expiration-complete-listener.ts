import { type Message } from 'node-nats-streaming';
import {
  Subjects,
  Listener,
  type OrderCancelledEvent,
  type ExpirationCompleteEvent,
} from '@scott-tickets/common';
import { queueGroupName } from './queue-group-name.js';
import { Order, OrderStatus } from '../../models/order.js';
import { OrderCancelledPublisher } from '../publishers/order-cancelled-publisher.js';

export class ExpirationCompleteListener extends Listener<ExpirationCompleteEvent> {
  subject: Subjects.ExpirationComplete = Subjects.ExpirationComplete;
  queueGroupName = queueGroupName;

  async onMessage(data: ExpirationCompleteEvent['data'], msg: Message) {
    const { orderId } = data;
    const order = await Order.findById(orderId).populate('ticket');

    if (!order || !order.ticket) {
      throw new Error('The order was not found');
    }

    if (order.status === OrderStatus.Complete) {
      return msg.ack();
    }

    order.status = OrderStatus.Cancelled;

    await order.save();

    new OrderCancelledPublisher(this.client).publish({
      id: order.id,
      version: order.version,
      ticket: {
        id: order.ticket.id,
      },
    });

    msg.ack();
  }
}
