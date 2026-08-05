import { Publisher, Subjects } from '@scott-tickets/common';
import type { TicketCreatedEvent } from '@scott-tickets/common';

export class TicketCreatedPublisher extends Publisher<TicketCreatedEvent> {
  subject: Subjects.TicketCreated = Subjects.TicketCreated;
}
