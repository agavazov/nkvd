import { RequestHandler } from '../../../net/http';

/**
 * Get all values from the storage
 */
export const getValues: RequestHandler = async (db) => {
  // Response
  return db.getAll(records => Object.values(records));
};
