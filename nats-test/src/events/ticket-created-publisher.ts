import { Publisher } from '../events/base-publisher';
import { TicketCreatedEvent } from '../events/ticket-created-event';
import { Subjects } from '../events/subjects';

export class TicketCreatedPublisher extends Publisher<TicketCreatedEvent> {
  subject: Subjects.TicketCreated = Subjects.TicketCreated;
}
