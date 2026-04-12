import type { Request, Response } from 'express';
import {
  createProblemDetailsWithoutRequest,
  sendProblemDetails,
} from '../common/utils/problemDetails';
import { HTTP_STATUS } from '../common/constants';

export function notFoundHandler(_req: Request, res: Response) {
  sendProblemDetails(
    res,
    createProblemDetailsWithoutRequest({
      status: HTTP_STATUS.NOT_FOUND,
      title: 'Not found',
      detail: 'The requested resource could not be found.',
      code: 'not_found',
    })
  );
}
