import { User } from './../models/user.js';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

interface User {
  id: string;
  email: string;
}

function createJwt(user: User) {
  const userJwt = jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    config.jwtKey,
    { expiresIn: '30m' },
  );

  return userJwt;
}

export { createJwt };
