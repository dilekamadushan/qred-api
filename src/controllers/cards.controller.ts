import type { Request, Response } from 'express';
import type { components } from '../generated/openapi';
import {
  activateCardForCompany,
  blockCardForCompany,
  getCardByIdForCompany,
  getDefaultCardForCompany,
  unblockCardForCompany,
} from '../services/cards.service';
import { HTTP_STATUS } from '../common/constants';

export async function getDefaultCard(request: Request, response: Response) {
  // Errors are intentionally forwarded to the global error handler middleware.
  const companyId = request.params.companyId;
  const userId = request.user!.userId;
  const card = await getDefaultCardForCompany(companyId as string, userId);

  return response.status(HTTP_STATUS.OK).json(card as components['schemas']['CardSummary']);
}

export async function getCardById(request: Request, response: Response) {
  const companyId = request.params.companyId;
  const cardId = request.params.cardId;
  const userId = request.user!.userId;
  const card = await getCardByIdForCompany(companyId as string, cardId as string, userId);

  return response.status(HTTP_STATUS.OK).json(card as components['schemas']['CardSummary']);
}

export async function blockCard(request: Request, response: Response) {
  const companyId = request.params.companyId;
  const cardId = request.params.cardId;
  const userId = request.user!.userId;
  const card = await blockCardForCompany(companyId as string, cardId as string, userId);

  return response.status(HTTP_STATUS.OK).json(card as components['schemas']['CardSummary']);
}

export async function unblockCard(request: Request, response: Response) {
  const companyId = request.params.companyId;
  const cardId = request.params.cardId;
  const userId = request.user!.userId;
  const card = await unblockCardForCompany(companyId as string, cardId as string, userId);

  return response.status(HTTP_STATUS.OK).json(card as components['schemas']['CardSummary']);
}

export async function activateCard(request: Request, response: Response) {
  const companyId = request.params.companyId;
  const cardId = request.params.cardId;
  const userId = request.user!.userId;
  const activatedCard = await activateCardForCompany(companyId as string, cardId as string, userId);

  return response.status(HTTP_STATUS.OK).json({
    data: activatedCard,
  } as components['schemas']['CardActivationResponse']);
}
