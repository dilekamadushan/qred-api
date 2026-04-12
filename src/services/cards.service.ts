import { Op } from 'sequelize';
import type { GenericError } from '../common/types';
import type { components } from '../generated/openapi';
import { Card } from '../db/models/card';
import { sharedDbCircuitBreaker } from './circuitBreaker.service';
import { logError, logWarn } from '../common/utils/logUtils';
import { ERROR_CODES } from '../common/constants';

type CardSummary = components['schemas']['CardSummary'];

async function queryDefaultCard(companyId: string, userId: string): Promise<CardSummary | null> {
  try {
    const card = await Card.findOne({
      where: {
        companyId,
        userId,
        isDefault: true,
        status: { [Op.not]: 'closed' },
      },
      attributes: [
        'id',
        'status',
        'displayName',
        'maskedPan',
        'brand',
        'cardholderName',
        'artworkUrl',
      ],
      raw: true,
    });

    if (!card) {
      logWarn('CardService', `No default card found for companyId: ${companyId}`);

      return null;
    }

    return card as CardSummary;
  } catch (error) {
    logError('CardService', `Error querying default card for companyId: ${companyId}`, error);

    throw error;
  }
}

export const defaultCardCircuitBreaker = sharedDbCircuitBreaker;

export async function getDefaultCardForCompany(
  companyId: string,
  userId: string
): Promise<CardSummary | null> {
  try {
    return await defaultCardCircuitBreaker.execute(() => queryDefaultCard(companyId, userId));
  } catch (error) {
    const genericError = error as GenericError;
    if (genericError.code === ERROR_CODES.CIRCUIT_BREAKER_OPEN_CODE) {
      logWarn('CardService', `Circuit breaker is OPEN for companyId: ${companyId}`);
    } else {
      logError('CardService', `Database error for companyId: ${companyId}`, error);
    }
    throw error;
  }
}
