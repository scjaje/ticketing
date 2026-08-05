import { Publisher } from '@scott-tickets/common';
import { Subjects, type OrderCancelledEvent } from '@scott-tickets/common';

export class OrderCancelledPublisher extends Publisher<OrderCancelledEvent> {
  subject: Subjects.OrderCancelled = Subjects.OrderCancelled;
}
