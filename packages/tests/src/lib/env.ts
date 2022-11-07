/**
 * Centralised object with all environment variables used in the project
 */
export const env = {
  serviceUrl: process.env.SERVICE_URL,
  stressAmount: Number(process.env.STRESS_AMOUNT) || 1000,
  stressClusters: Number(process.env.STRESS_CLUSTERS) || 20,
  stressWorkers: Number(process.env.STERSS_WORKERS) || 10
};
