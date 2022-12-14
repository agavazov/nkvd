import { RequestHandler } from '../../../net/http';

/**
 * Get all records from the storage
 */
export const getAll: RequestHandler = async (db) => {
  // Response
  return db.getAll(records => Object.entries(records).map(([k, v]) => ({ k, v })));
};
