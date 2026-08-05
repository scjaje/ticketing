import { config } from 'dotenv';

// Loads a real STRIPE_KEY from a local, gitignored file if you have one
// (see .env.test.local.example for the format). Does nothing if the file
// doesn't exist, so this is a no-op for everyone else — it never touches
// process.env unless you've actually created the file yourself.
config({ path: '.env.test.local', quiet: true });

process.env.JWT_KEY = 'asdfasdf';
process.env.MONGO_URI = 'placeholder';
process.env.NATS_URL = 'placeholder';
process.env.NATS_CLUSTER_ID = 'placeholder';
process.env.NATS_CLIENT_ID = 'placeholder';
// Only default this if it isn't already set. Most tests mock the stripe
// module, so 'placeholder' is fine for them. The one test that hits the
// real Stripe test API needs a real secret key (sk_test_...), which you
// supply yourself by exporting STRIPE_KEY before running the tests —
// this must not stomp on that.
process.env.STRIPE_KEY ??= 'placeholder';
