import { Op } from 'sequelize';
import { Card } from '../db/models/card';
import { sharedDbCircuitBreaker } from './circuitBreaker.service';
import { logError } from '../common/utils/logUtils';
import { InternalServerError, NotFoundError } from '../common/errors/appHttpError';

import type { CardSummary } from '../common/types/types';

export function getDefaultCardForCompany(companyId: string, userId: string): Promise<CardSummary> {
  return sharedDbCircuitBreaker.execute(() => queryDefaultCard(companyId, userId));
}

async function queryDefaultCard(companyId: string, userId: string): Promise<CardSummary> {
  try {
    const card = await Card.findOne({
      where: {
        companyId,
        userId,
        status: { [Op.not]: 'closed' },
      },
      order: [
        ['isDefault', 'DESC'],
        ['createdAt', 'DESC'],
      ],
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
      throw new NotFoundError({
        detail: `No default card exists for company ${companyId}.`,
        code: 'default_card_not_found',
        title: 'default_card_not_found',
      });
    }

    return card as CardSummary;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;

    logError('CardService', `Error querying default card for companyId: ${companyId}`, error);

    throw new InternalServerError({
      detail: 'Failed to load default card data.',
    });
  }
}
