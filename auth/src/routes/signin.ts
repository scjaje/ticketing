import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { User } from '../models/user.js';
import { BadRequestError, validateRequest } from '@scott-tickets/common';
import { Password } from '../services/password.js';
import { body } from 'express-validator';
import { createJwt } from '../services/create-jwt.js';

const router = express.Router();

router.post(
  '/api/users/signin',
  [
    body('email').isEmail().withMessage('Email must be valid'),
    body('password')
      .trim()
      .notEmpty()
      .withMessage('A password must be supplied.'),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return next(new BadRequestError('This email is not registered.'));
    }

    if (await Password.compare(existingUser.password, password)) {
      // Generate JWT
      const userJwt = createJwt(existingUser);

      // Store it on a session object
      req.session = { jwt: userJwt };

      res.status(201).send('Successful');
    } else {
      res.status(401).send('Invalid password.');
    }
  },
);

export { router as signInRouter };
