import { Op } from 'sequelize';
import type { GenericError } from '../common/types';

import { Card } from '../db/models/card';
import { createDbCircuitBreaker } from './circuitBreaker.service';
import { logError, logWarn } from '../common/utils/logUtils';
import { ERROR_CODES } from '../common/constants';

type DefaultCardSummary = {
  id: string;
  status: string;
  displayName: string;
  maskedPan: string;
  brand: string;
  cardholderName: string;
  artworkUrl: string;
};

async function queryDefaultCard(
  companyId: string,
  userId: string
): Promise<DefaultCardSummary | null> {
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

    return card as DefaultCardSummary;
  } catch (error) {
    logError('CardService', `Error querying default card for companyId: ${companyId}`, error);

    throw error;
  }
}

export const defaultCardCircuitBreaker = createDbCircuitBreaker(queryDefaultCard, {
  timeout: 2500,
  errorThresholdPercentage: 50,
  resetTimeout: 5000,
  volumeThreshold: 2,
});

export async function getDefaultCardForCompany(
  companyId: string,
  userId: string
): Promise<DefaultCardSummary | null> {
  try {
    return await defaultCardCircuitBreaker.execute(companyId, userId);
  } catch (error) {
    const err = error as GenericError;
    if (err.code === ERROR_CODES.CIRCUIT_BREAKER_OPEN_CODE) {
      logWarn('CardService', `Circuit breaker is OPEN for companyId: ${companyId}`);
    } else {
      logError('CardService', `Database error for companyId: ${companyId}`, error);
    }
    throw error;
  }
}
