import { NotFoundError, RequestHandler } from '../../../net/http';
import { validateKey } from '../validators';

/**
 * Check if the record exists
 * Params:
 * * k - Record key
 */
export const is: RequestHandler = async (db, params) => {
  // Validate input parameters
  validateKey(params);

  // Database actions & missing record check
  const key = String(params?.k);
  if (!await db.exist(key)) {
    throw new NotFoundError('MISSING_RECORD');
  }

  // Response
  return {
    success: true
  };
};
