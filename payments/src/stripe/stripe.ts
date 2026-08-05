import Stripe from 'stripe';
import { config } from '../config.js';

export const stripe = new Stripe(config.stripe_key, {
  apiVersion: '2026-07-29.dahlia',
});
