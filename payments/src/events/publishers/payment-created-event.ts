import { Publisher, Subjects } from '@scott-tickets/common';
import type { PaymentCreatedEvent } from '@scott-tickets/common';

export class PaymentCreatedPublisher extends Publisher<PaymentCreatedEvent> {
  subject: Subjects.PaymentCreated = Subjects.PaymentCreated;
}
