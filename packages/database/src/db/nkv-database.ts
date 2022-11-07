export type StorageRecord = { [key: string]: string }

export const dbMaxKeyLength = 64;
export const dbMaxValueLength = 256;

export interface NkvDatabase {
  /**
   * Add new record or update existing one
   */
  set(key: string, value: string): Promise<void>;

  /**
   * Get a record
   */
  get(key: string): Promise<string | undefined>;

  /**
   * Clear the storage
   */
  clear(): Promise<void>;

  /**
   * Get all records
   */
  getAll<R>(callback: (records: StorageRecord) => R[]): Promise<R[]>;

  /**
   * Check if the record exists
   */
  exist(key: string): Promise<boolean>;

  /**
   * Remove a record
   */
  rm(key: string): Promise<void>;

  /**
   * Return the number of the stored records
   */
  size(): Promise<number>;
}
