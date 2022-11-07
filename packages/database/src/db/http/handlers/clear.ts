import { RequestHandler } from '../../../net/http';

/**
 * Clear all records
 * mutable: changes the data in the database storage
 */
export const clear: RequestHandler = async (db) => {
  // Database actions [no waiting to execute]
  db.clear()
    .catch(console.error);

  // Response
  return {
    success: true
  };
};
