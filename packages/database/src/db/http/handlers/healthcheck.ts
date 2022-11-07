import { RequestHandler } from '../../../net/http';

// . Check is the server return http code 200
export const healthcheck: RequestHandler = async () => {
  // Response
  return {
    status: 'ok'
  };
};
