import { Op } from 'sequelize';
import { Card } from '../db/models/card';
import { sharedDbCircuitBreaker } from './circuitBreaker.service';
import { logError, logWarn } from '../common/utils/logUtils';
import { InternalServerError } from '../common/errors/appHttpError';

import type { CardSummary } from '../common/types/types';

export function getDefaultCardForCompany(
  companyId: string,
  userId: string
): Promise<CardSummary | null> {
  return sharedDbCircuitBreaker.execute(() => queryDefaultCard(companyId, userId));
}

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
    throw new InternalServerError({
      detail: 'Failed to load default card data.',
    });
  }
}
