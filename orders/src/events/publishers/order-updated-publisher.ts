import {
  Publisher,
  Subjects,
  type OrderUpdatedEvent,
} from '@scott-tickets/common';

export class OrderUpdatedPublisher extends Publisher<OrderUpdatedEvent> {
  subject: Subjects.OrderUpdated = Subjects.OrderUpdated;
}
