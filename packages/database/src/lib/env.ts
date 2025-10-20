/**
 * Centralized object with all environment variables used in the project
 */
export const env = {
  port: Number(process.env.PORT) || 80,
  hostname: String(process.env.HOSTNAME) || 'localhost',
  meshNetworkUrl: String(process.env.MESH_NETWORK_URL) || undefined
};
