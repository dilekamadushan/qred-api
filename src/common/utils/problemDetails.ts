import { randomUUID } from 'crypto';

import type { Request, Response } from 'express';
import type { InvalidField, ProblemDetails } from '../types/types';

export const createProblemDetails = ({
  req,
  status,
  title,
  detail,
  code,
  errors = null,
}: {
  req: Request;
  status: number;
  title: string;
  detail: string;
  code: string;
  errors?: InvalidField[] | null;
}): ProblemDetails => {
  return {
    type: `https://api.qred.example.com/problems/${code}`,
    title,
    status,
    detail,
    instance: `https://api.qred.example.com${req.originalUrl}`,
    requestId: randomUUID(),
    code,
    errors,
  };
};

export const createProblemDetailsWithoutRequest = ({
  status,
  title,
  detail,
  code,
  instance = null,
  errors = null,
}: {
  status: number;
  title: string;
  detail: string;
  code: string;
  instance?: string | null;
  errors?: InvalidField[] | null;
}): ProblemDetails => {
  return {
    type: `https://api.qred.example.com/problems/${code}`,
    title,
    status,
    detail,
    instance,
    requestId: randomUUID(),
    code,
    errors,
  };
};

export const sendProblemDetails = (
  res: Response,
  problem: ProblemDetails,
  headers?: Record<string, string>
) => {
  Object.entries(headers ?? {}).forEach(([name, value]) => {
    res.setHeader(name, value);
  });

  return res.status(problem.status).type('application/problem+json').json(problem);
};
