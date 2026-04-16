import { Op, type Transaction } from 'sequelize';
import { Card } from '../db/models/card';
import { sequelize } from '../db/sequelize';
import { sharedDbCircuitBreaker } from './circuitBreaker.service';
import { logError } from '../common/utils/logUtils';
import {
  InternalServerError,
  NotFoundError,
  ResourceConflictError,
} from '../common/errors/appHttpError';
import type { CardActivationResult, CardStatus, CardSummary } from '../common/types/types';
import { CARD_STATUS, CARD_SUMMARY_ATTRIBUTES } from '../common/constants';

export function getDefaultCardForCompany(companyId: string, userId: string): Promise<CardSummary> {
  return sharedDbCircuitBreaker.execute(() => queryDefaultCard(companyId, userId));
}

export function getCardByIdForCompany(
  companyId: string,
  cardId: string,
  userId: string
): Promise<CardSummary> {
  return sharedDbCircuitBreaker.execute(() => queryCardById(companyId, cardId, userId));
}

export function blockCardForCompany(
  companyId: string,
  cardId: string,
  userId: string
): Promise<CardSummary> {
  return sharedDbCircuitBreaker.execute(() =>
    queryUpdateTransitionCardStatus({
      companyId,
      cardId,
      userId,
      requiredStatus: CARD_STATUS.ACTIVE,
      nextStatus: CARD_STATUS.BLOCKED,
      detail: 'Only active cards can be blocked.',
    })
  );
}

export function unblockCardForCompany(
  companyId: string,
  cardId: string,
  userId: string
): Promise<CardSummary> {
  return sharedDbCircuitBreaker.execute(() =>
    queryUpdateTransitionCardStatus({
      companyId,
      cardId,
      userId,
      requiredStatus: CARD_STATUS.BLOCKED,
      nextStatus: CARD_STATUS.ACTIVE,
      detail: 'Only blocked cards can be unblocked.',
    })
  );
}

export function activateCardForCompany(
  companyId: string,
  cardId: string,
  userId: string
): Promise<CardActivationResult> {
  return sharedDbCircuitBreaker.execute(() => queryActivateCard(companyId, cardId, userId));
}

async function queryDefaultCard(companyId: string, userId: string): Promise<CardSummary> {
  try {
    // if no default card is set, the most recently  card will be returned
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

    if (!card)
      throw new NotFoundError({
        detail: `No default card exists for company ${companyId}.`,
        code: 'default_card_not_found',
        title: 'default_card_not_found',
      });

    return card as CardSummary;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;

    logError('CardService', `Error querying default card for companyId: ${companyId}`, error);

    throw new InternalServerError({
      detail: 'Failed to load default card data.',
    });
  }
}

async function queryUpdateTransitionCardStatus({
  companyId,
  cardId,
  userId,
  requiredStatus,
  nextStatus,
  detail,
}: {
  companyId: string;
  cardId: string;
  userId: string;
  requiredStatus: CardStatus;
  nextStatus: CardStatus;
  detail: string;
}): Promise<CardSummary> {
  const transaction = await sequelize.transaction();

  try {
    const card = await findCardByRequiredStatus({
      companyId,
      cardId,
      userId,
      transaction,
      requiredStatus,
      detail,
    });

    const blockedAt = nextStatus === CARD_STATUS.BLOCKED ? new Date() : null;

    await card.update(
      {
        status: nextStatus,
        blockedAt,
      },
      { transaction }
    );

    await transaction.commit();

    card.status = nextStatus;
    card.blockedAt = blockedAt;

    return mapCardToSummary(card);
  } catch (error) {
    await transaction.rollback();

    if (error instanceof NotFoundError || error instanceof ResourceConflictError) throw error;

    logError('CardService', `Error updating card ${cardId} for companyId: ${companyId}`, error);

    throw new InternalServerError({
      detail: 'Failed to update card status.',
    });
  }
}

async function queryCardById(
  companyId: string,
  cardId: string,
  userId: string
): Promise<CardSummary> {
  try {
    const card = await findCardByRequiredStatus({
      companyId,
      cardId,
      userId,
      detail: 'Card not found.',
    });

    return mapCardToSummary(card);
  } catch (error) {
    if (error instanceof NotFoundError) throw error;

    logError('CardService', `Error querying card ${cardId} for companyId: ${companyId}`, error);

    throw new InternalServerError({
      detail: 'Failed to load card data.',
    });
  }
}

// dedicated function since the response is unique
async function queryActivateCard(
  companyId: string,
  cardId: string,
  userId: string
): Promise<CardActivationResult> {
  const transaction = await sequelize.transaction();

  try {
    const card = await findCardByRequiredStatus({
      companyId,
      cardId,
      userId,
      transaction,
      requiredStatus: CARD_STATUS.PENDING_ACTIVATION,
      detail: 'Card not found for activation.',
    });

    // other business logic can go here
    const activatedAt = new Date();
    await card.update(
      {
        status: CARD_STATUS.ACTIVE,
        activatedAt,
        blockedAt: null,
      },
      { transaction }
    );

    await transaction.commit();

    return {
      cardId,
      status: CARD_STATUS.ACTIVE,
      activatedAt: activatedAt.toISOString(),
    };
  } catch (error) {
    await transaction.rollback();

    if (error instanceof NotFoundError || error instanceof ResourceConflictError) throw error;

    logError('CardService', `Error activating card ${cardId} for companyId: ${companyId}`, error);

    throw new InternalServerError({
      detail: 'Failed to activate card.',
    });
  }
}

async function findCardByRequiredStatus({
  companyId,
  cardId,
  userId,
  transaction,
  requiredStatus,
  detail,
}: {
  companyId: string;
  cardId: string;
  userId: string;
  transaction?: Transaction;
  requiredStatus?: CardStatus;
  detail: string;
}): Promise<Card> {
  const card = await Card.findOne({
    where: {
      id: cardId,
      companyId,
      userId,
    },
    attributes: [...CARD_SUMMARY_ATTRIBUTES, 'activatedAt', 'blockedAt'],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  if (!card)
    throw new NotFoundError({
      detail: `Card ${cardId} not found for company ${companyId}.`,
    });

  if (requiredStatus && card.status !== requiredStatus) {
    logError(
      'CardService',
      `Card ${cardId} for company ${companyId} is in status ${card.status} but expected ${requiredStatus}.`
    );

    throw new ResourceConflictError(detail);
  }

  return card;
}

function mapCardToSummary(card: Card): CardSummary {
  return {
    id: card.id,
    status: card.status,
    displayName: card.displayName,
    maskedPan: card.maskedPan,
    brand: card.brand,
    cardholderName: card.cardholderName,
    artworkUrl: card.artworkUrl,
  };
}
