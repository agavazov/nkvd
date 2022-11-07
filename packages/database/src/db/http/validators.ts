import { IncomeParams, InvalidInputResponse } from '../../net/http';
import { dbMaxKeyLength, dbMaxValueLength } from '../nkv-database';

// Validate the query params for the requirements for the `k` param
export function validateKey(params: IncomeParams) {
  if (typeof params?.k === 'undefined') {
    throw new InvalidInputResponse('MISSING_KEY_PARAM');
  }

  if (params?.k?.length <= 0) {
    throw new InvalidInputResponse('EMPTY_KEY');
  }

  if (params?.k?.length >= dbMaxKeyLength) {
    throw new InvalidInputResponse('MAXIMUM_KEY_LENGTH_REACHED');
  }
}

// Validate the query params for the requirements for the `v` param
export function validateValue(params: IncomeParams) {
  if (typeof params?.v === 'undefined') {
    throw new InvalidInputResponse('MISSING_VALUE_PARAM');
  }

  if (params?.v?.length >= dbMaxValueLength) {
    throw new InvalidInputResponse('MAXIMUM_VALUE_LENGTH_REACHED');
  }
}
