// All required environment variables. Add new ones here as strings.
// The app will throw at startup — before handling any requests — if any are missing.
// To add a new var: add its name to this array, then expose it on the config object below.
const requiredEnvVars = [
  'NATS_URL',
  'NATS_CLUSTER_ID',
  'NATS_CLIENT_ID',
  'REDIS_HOST',
] as const;

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`Environment variable ${key} must be defined.`);
  }
}

// Single source of truth for env vars throughout the app.
// Import config and reference config.jwtKey (etc.) instead of process.env directly.
// The ! assertion is safe here because the loop above already threw if the value was missing.
// To add a new var: add a new property below using process.env.YOUR_VAR_NAME!
export const config = {
  nats_url: process.env.NATS_URL!,
  nats_cluster_id: process.env.NATS_CLUSTER_ID!,
  nats_client_id: process.env.NATS_CLIENT_ID!,
  redis_host: process.env.REDIS_HOST!,
};
