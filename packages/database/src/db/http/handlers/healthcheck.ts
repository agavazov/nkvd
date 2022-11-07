import { RequestHandler } from '../../../net/http';

/**
 * Check is the server return http code 200
 * @todo move this handler to different directory
 */
export const healthcheck: RequestHandler = async () => {
  // Response
  return {
    status: 'ok'
  };
};
