import type { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../common/constants';
import { createProblemDetails, sendProblemDetails } from '../common/utils/problem-details';
import { getLatestInvoiceForCompany } from '../services/invoices.service';
import { DbCircuitOpenError } from '../services/circuitBreaker.service';

export async function getLatestInvoice(request: Request, response: Response, next: NextFunction) {
  try {
    const companyId = request.params.companyId! as string;
    const invoice = await getLatestInvoiceForCompany(companyId);

    if (!invoice) {
      return sendProblemDetails(
        response,
        createProblemDetails({
          req: request,
          status: HTTP_STATUS.NOT_FOUND,
          title: 'Not found',
          detail: `No due invoice found for company ${companyId}.`,
          code: 'invoice_not_found',
        })
      );
    }

    response.json({
      label: invoice.label,
      dueDate: invoice.dueDate,
      amount: {
        amountMinor: invoice.amountMinor,
        currency: invoice.currency,
      },
    });
  } catch (error) {
    if (error instanceof DbCircuitOpenError)
      return sendProblemDetails(
        response,
        createProblemDetails({
          req: request,
          status: HTTP_STATUS.SERVICE_UNAVAILABLE,
          title: 'Service unavailable',
          detail: 'The invoice data  is temporarily unavailable. Please retry shortly.',
          code: 'service_unavailable',
        })
      );
    next(error);
  }
}
