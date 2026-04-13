import type { Request, Response } from 'express';
import { getLatestInvoiceForCompany } from '../services/invoices.service';
import { NotFoundError } from '../common/errors/appHttpError';

export async function getLatestInvoice(request: Request, response: Response) {
  // Errors are intentionally allowed to bubble to the global error handler middleware.
  const companyId = request.params.companyId! as string;
  const invoice = await getLatestInvoiceForCompany(companyId);

  if (!invoice) {
    throw new NotFoundError({
      detail: `No due invoice found for company ${companyId}.`,
      code: 'invoice_not_found',
    });
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
