import type { Request, Response } from 'express';
import {
  createProblemDetailsWithoutRequest,
  sendProblemDetails,
} from '../common/utils/problem-details';
import { HTTP_STATUS } from '../common/constants';

export function notFoundHandler(_req: Request, res: Response) {
  sendProblemDetails(
    res,
    createProblemDetailsWithoutRequest(
      HTTP_STATUS.NOT_FOUND,
      'Not found',
      'The requested resource could not be found.',
      'not_found'
    )
  );
}
