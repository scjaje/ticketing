import { body } from 'express-validator';
import mongoose from 'mongoose';

export const orderValidators = [
  body('ticketId')
    .trim()
    .notEmpty()
    .custom((input: string) => mongoose.Types.ObjectId.isValid(input))
    .withMessage('Ticket ID must be provided'),
];
