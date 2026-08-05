import { Publisher } from '@scott-tickets/common';
import { Subjects, type ExpirationCompleteEvent } from '@scott-tickets/common';

export class ExpirationCompletePublisher extends Publisher<ExpirationCompleteEvent> {
  subject: Subjects.ExpirationComplete = Subjects.ExpirationComplete;
}
