import type { Request, Response } from 'express';
import {
  createProblemDetailsWithoutRequest,
  sendProblemDetails,
} from '../common/utils/problemDetails';
import { HTTP_STATUS } from '../common/constants';

export function notFoundHandler(request: Request, response: Response) {
  sendProblemDetails(
    response,
    createProblemDetailsWithoutRequest({
      status: HTTP_STATUS.NOT_FOUND,
      title: 'Not found',
      detail: 'The requested resource could not be found.',
      code: 'not_found',
      requestId: request.requestId,
    })
  );
}
