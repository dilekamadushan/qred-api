import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../common/constants';
import { createProblemDetails, sendProblemDetails } from '../common/utils/problemDetails';
import { getLatestInvoiceForCompany } from '../services/invoices.service';

export async function getLatestInvoice(request: Request, response: Response) {
  // Errors are intentionally allowed to bubble to the global error handler middleware.
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
}
