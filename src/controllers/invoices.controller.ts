import type { Request, Response } from 'express';
import { getLatestInvoiceForCompany } from '../services/invoices.service';

export async function getLatestInvoice(request: Request, response: Response) {
  // Errors are intentionally allowed to bubble to the global error handler middleware.
  const companyId = request.params.companyId! as string;
  const invoice = await getLatestInvoiceForCompany(companyId);

  response.json({
    label: invoice.label,
    dueDate: invoice.dueDate,
    amount: {
      amountMinor: invoice.amountMinor,
      currency: invoice.currency,
    },
  });
}
