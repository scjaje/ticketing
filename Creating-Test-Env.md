# Creating a Test Env for the `payments` Stripe Tests

This documents the setup added to the `payments` service so we could add a
test that hits Stripe's **real** test-mode API (`charge-real-stripe.test.ts`)
without ever committing a secret key or breaking the normal test loop.

## The problem

Most of `payments`' tests mock the Stripe client (`stripe/__mocks__/stripe.ts`),
which proves our code *calls* `stripe.charges.create` with the right
arguments — but a mock can't catch mistakes in how we're actually talking to
Stripe's API (wrong field name, bad currency format, API version drift). To
catch those, we added one test that skips the mock and makes a real call to
Stripe's test-mode API using their `tok_visa` test token.

That test needs a real Stripe **test-mode** secret key (`sk_test_...`) to
run. That key must never end up in a tracked file or command history.

## What was set up

- **`payments/src/stripe/__mocks__/stripe.ts`** — the manual mock. Jest's
  automatic `__mocks__`-folder pickup only works for `node_modules`
  packages, not our own modules, under this project's ESM Jest setup
  (`--experimental-vm-modules`). So it isn't auto-applied — it has to be
  registered explicitly.

- **`payments/src/routes/__tests__/new.test.ts`** registers that mock itself,
  locally, at the top of the file:
  ```ts
  jest.unstable_mockModule('../../stripe/stripe', () => import('../../stripe/__mocks__/stripe.js'));
  ```
  This used to live in the shared `test/setup.ts` (applied to every test
  file), but that meant *no* test file could ever reach the real Stripe
  module. Moving it into `new.test.ts` only means the mock is scoped to the
  file that wants it, and any other test file — like
  `charge-real-stripe.test.ts` — naturally imports the real module instead,
  no `jest.unmock()` tricks needed (those don't reliably undo an
  `unstable_mockModule` registration anyway — we tried).

- **`payments/src/routes/__tests__/charge-real-stripe.test.ts`** — the real
  test. Builds an order, signs in as its owner, posts to `/api/payments`
  with `token: 'tok_visa'`, then calls the real `stripe.charges.list()` and
  asserts a charge exists with the right amount/currency.

- **`payments/src/test/env.ts`** loads a local secrets file before setting
  its usual placeholder env vars:
  ```ts
  import { config } from 'dotenv';
  config({ path: '.env.test.local', quiet: true });
  ```
  If `.env.test.local` doesn't exist, this does nothing — everyone else's
  tests keep using the `'placeholder'` `STRIPE_KEY` fallback exactly as
  before. `STRIPE_KEY` itself now uses `??=` instead of `=`, so a real key
  loaded from the file isn't stomped on by the placeholder default.

- **`payments/.env.test.local.example`** (committed) — documents the
  expected format (`STRIPE_KEY=sk_test_...`) with no real value.

- **`payments/.env.test.local`** (gitignored, **not** committed) — your
  actual real key goes here.

- **`payments/.gitignore`** (new — `payments` wasn't a git repo before)
  excludes `.env`, `.env.local`, `.env.*.local` so this can never
  accidentally get committed once the project is pushed to GitHub.

## How to use it

```bash
cd payments
cp .env.test.local.example .env.test.local
# edit .env.test.local, replace sk_test_... with your real Stripe test key
npm run test:stripe
```

## Why a separate `test:stripe` script instead of just `npm test`

`payments/package.json`'s normal `test` script runs `jest --watchAll`, which
picks up every `*.test.ts` file on every save. If `charge-real-stripe.test.ts`
ran as part of that:

- It would fail constantly for anyone without `.env.test.local` set up
  (including CI, and you on a fresh clone).
- It makes a real network call to Stripe on every file save, which is slow
  and unnecessary noise for routine dev work.

So the normal `test` script explicitly excludes it:
```json
"test": "NODE_OPTIONS=--experimental-vm-modules jest --watchAll --no-cache --testPathIgnorePatterns=/node_modules/ --testPathIgnorePatterns=charge-real-stripe.test.ts",
```
(Note: this couldn't be done via the static `jest` config block in
`package.json` — `testPathIgnorePatterns` there applies to *every* Jest
invocation, including one deliberately targeting the file by name, which
would make it impossible to ever run. It has to be a CLI flag on the `test`
script specifically.)

And `test:stripe` is the deliberate, manual way to run just that one test:
```json
"test:stripe": "NODE_OPTIONS=--experimental-vm-modules jest charge-real-stripe --no-cache"
```

This isn't something you run as part of routine testing — reach for it when
you've touched the payment route or Stripe integration and want to confirm
it still works against the real API, not just the mock.
