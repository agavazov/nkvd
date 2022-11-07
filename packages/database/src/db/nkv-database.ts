export type StorageRecord = { [key: string]: string }

export const dbMaxKeyLength = 64;
export const dbMaxValueLength = 256;

export interface NkvDatabase {
  set(key: string, value: string): Promise<void>;

  get(key: string): Promise<string | undefined>;

  clear(): Promise<void>;

  getAll<R>(callback: (records: StorageRecord) => R[]): Promise<R[]>;

  exist(key: string): Promise<boolean>;

  rm(key: string): Promise<void>;

  size(): Promise<number>;
}
