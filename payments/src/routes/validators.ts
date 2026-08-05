import { body } from 'express-validator';
import mongoose from 'mongoose';

export const newValidators = [
  body('paymentMethodId')
    .trim()
    .isString()
    .notEmpty()
    .withMessage('A payment method is required.'),
  body('orderId')
    .trim()
    .notEmpty()
    .custom((input: string) => mongoose.Types.ObjectId.isValid(input))
    .withMessage('A valid order ID is required.'),
];
