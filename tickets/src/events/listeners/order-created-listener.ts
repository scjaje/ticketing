import {
  Listener,
  Subjects,
  type OrderCreatedEvent,
} from '@scott-tickets/common';
import { queueGroupName } from './queue-group-name.js';
import type { Message } from 'node-nats-streaming';
import { Ticket } from '../../models/ticket.js';
import { TicketUpdatedPublisher } from '../publishers/ticket-updated-publisher.js';

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
  subject: Subjects.OrderCreated = Subjects.OrderCreated;
  queueGroupName = queueGroupName;
  async onMessage(data: OrderCreatedEvent['data'], msg: Message) {
    const { id, ticket } = data;

    // Find the ticket that the order is reserving
    const existingTicket = await Ticket.findById(ticket.id);

    // If no ticket, throw error
    if (!existingTicket) {
      throw new Error('Ticket not found.');
    }

    // Mark the ticket as being reserved by setting the order id
    existingTicket.orderId = id;

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
