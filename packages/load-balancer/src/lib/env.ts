/**
 * Centralised object with all environment variables used in the project
 */
export const env = {
  dockerApiLocation: process.env.DOCKER_API_LOCATION || '/var/run/docker.sock',
  servicePort: Number(process.env.SERVICE_PORT),
  groupPort: Number(process.env.GROUP_PORT),
  groupName: String(process.env.GROUP_NAME),
  showErrors: process.env.SHOW_ERRORS,
};
