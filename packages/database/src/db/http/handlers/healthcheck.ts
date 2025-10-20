import { RequestHandler } from '../../../net/http';

/**
 * Check if the server returns HTTP code 200
 * @todo move this handler to different directory
 */
export const healthcheck: RequestHandler = async () => {
  // Response
  return {
    status: 'ok'
  };
};
