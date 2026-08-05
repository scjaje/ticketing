import { Publisher } from '@scott-tickets/common';
import { Subjects, type OrderCreatedEvent } from '@scott-tickets/common';

export class OrderCreatedPublisher extends Publisher<OrderCreatedEvent> {
  subject: Subjects.OrderCreated = Subjects.OrderCreated;
}
