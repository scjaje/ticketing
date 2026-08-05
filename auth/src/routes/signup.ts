import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { User } from '../models/user.js';
import { body } from 'express-validator';
import { BadRequestError, validateRequest } from '@scott-tickets/common';
import { createJwt } from '../services/create-jwt.js';

const router = express.Router();

router.post(
  '/api/users/signup',
  [
    body('email').isEmail().withMessage('Email must be valid'),
    body('password')
      .trim()
      .isLength({ min: 4, max: 30 })
      .withMessage('Password must be within 4 and 30 characters.'),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return next(new BadRequestError('This email is already in use.'));
    }

    const newUser = User.build({ email, password });
    // To save to the database
    await newUser.save();

    // Generate JWT
    const userJwt = createJwt(newUser);

    // Store it on a session object
    req.session = { jwt: userJwt };

    res.status(201).send(newUser);
  },
);

export { router as signUpRouter };
