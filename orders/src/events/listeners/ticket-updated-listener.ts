import { type Message } from 'node-nats-streaming';
import {
  Subjects,
  Listener,
  type TicketUpdatedEvent,
  NotFoundError,
} from '@scott-tickets/common';
import { queueGroupName } from './queue-group-name.js';
import { Ticket } from '../../models/ticket.js';

export class TicketUpdatedListener extends Listener<TicketUpdatedEvent> {
  subject: Subjects.TicketUpdated = Subjects.TicketUpdated;
  queueGroupName = queueGroupName;

  async onMessage(data: TicketUpdatedEvent['data'], msg: Message) {
    const { title, price, version } = data;
    const ticket = await Ticket.findByEvent(data);

    if (!ticket) {
      return new NotFoundError();
    }

    ticket.title = title;
    ticket.price = price;
    ticket.version = version;

    await ticket.save();

    msg.ack();
  }
}
