import { NotFoundError, RequestHandler } from '../../../net/http';
import { validateKey } from '../validators';

/**
 * Get specific record
 * Params:
 * * k - Record key
 */
export const get: RequestHandler = async (db, params) => {
  // Validate input parameters
  validateKey(params);

  // Database actions
  const key = String(params?.k);
  const value = await db.get(key);

  // If the record is missing
  if (typeof value === 'undefined') {
    throw new NotFoundError('MISSING_RECORD');
  }

  // Response
  return value;
};
