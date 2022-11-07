import { RequestHandler } from '../../../net/http';
import { validateKey, validateValue } from '../validators';

/**
 * Set record value
 * mutable: changes the data in the database storage
 * Params:
 * * k - Record key
 * * v - Record value
 */
export const set: RequestHandler = async (db, params) => {
  // Validate input parameters
  validateKey(params);
  validateValue(params);

  // Database actions [no waiting to execute]
  const key = String(params?.k);
  const value = String(params?.v);

  db.set(key, value)
    .catch(console.error);

  // Response
  return {
    success: true
  };
};
