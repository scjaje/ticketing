import { Listener } from '../events/base-listener';
import { Message } from 'node-nats-streaming';
import { TicketCreatedEvent } from '../events/ticket-created-event';
import { Subjects } from '../events/subjects';

export class TicketCreatedListener extends Listener<TicketCreatedEvent> {
  readonly subject: Subjects.TicketCreated = Subjects.TicketCreated;
  queueGroupName = 'payments-service';

  onMessage(data: TicketCreatedEvent['data'], msg: Message): void {
    console.log('Event data', data);
    msg.ack();
  }
}
