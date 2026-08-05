import {
  Listener,
  Subjects,
  type OrderCancelledEvent,
} from '@scott-tickets/common';
import { queueGroupName } from './queue-group-name.js';
import type { Message } from 'node-nats-streaming';
import { Ticket } from '../../models/ticket.js';
import { TicketUpdatedPublisher } from '../publishers/ticket-updated-publisher.js';

export class OrderCancelledListener extends Listener<OrderCancelledEvent> {
  subject: Subjects.OrderCancelled = Subjects.OrderCancelled;
  queueGroupName = queueGroupName;
  async onMessage(data: OrderCancelledEvent['data'], msg: Message) {
    const { ticket } = data;

    // Find the ticket that the order is reserving
    const existingTicket = await Ticket.findById(ticket.id);

    // If no ticket, throw error
    if (!existingTicket) {
      throw new Error('Ticket not found.');
    }

    // Mark the ticket as being unreserved by unsetting the order id
    existingTicket.orderId = undefined;

    // Save the ticket
    await existingTicket.save();

    await new TicketUpdatedPublisher(this.client).publish({
      id: existingTicket.id,
      version: existingTicket.version,
      title: existingTicket.title,
      price: existingTicket.price,
      userId: existingTicket.userId,
      orderId: existingTicket.orderId,
    });

    // ack the message
    msg.ack();
  }
}
