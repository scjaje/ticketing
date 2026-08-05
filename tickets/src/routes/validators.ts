import { body } from 'express-validator';

export const ticketValidators = [
  body('title')
    .trim()
    .isString()
    .notEmpty()
    .withMessage('Title must be provided'),
  body('price')
    .trim()
    .isFloat({ gt: 0 })
    .notEmpty()
    .withMessage('A price must be supplied and greater than 0.'),
];
