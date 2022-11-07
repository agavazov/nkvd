import { NotFoundError, RequestHandler } from '../../../net/http';
import { validateKey } from '../validators';

// . Remove record ?k=KEY [mutable]
export const rm: RequestHandler = async (db, params) => {
  // Validate input parameters
  validateKey(params);

  const key = String(params?.k);

  // Check if the record exists
  if (!await db.exist(key)) {
    throw new NotFoundError('MISSING_RECORD');
  }

  // Database actions [no waiting to execute]
  db.rm(key)
    .catch(console.error);

  // Response
  return {
    success: true
  };
};
