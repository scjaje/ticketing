import { Publisher, Subjects } from '@scott-tickets/common';
import type { TicketUpdatedEvent } from '@scott-tickets/common';

export class TicketUpdatedPublisher extends Publisher<TicketUpdatedEvent> {
  subject: Subjects.TicketUpdated = Subjects.TicketUpdated;
}
