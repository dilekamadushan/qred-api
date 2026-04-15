import { Invoice } from '../db/models/invoice';
import { sharedDbCircuitBreaker } from './circuitBreaker.service';
import { logError } from '../common/utils/logUtils';
import { InternalServerError, NotFoundError } from '../common/errors/appHttpError';
import { SORT_ORDER } from '../common/constants';

export function getLatestInvoiceForCompany(companyId: string) {
  return sharedDbCircuitBreaker.execute(() => queryLatestInvoice(companyId));
}

async function queryLatestInvoice(companyId: string) {
  try {
    const invoice = await Invoice.findOne({
      where: {
        companyId,
        status: 'due',
      },
      order: [['dueDate', SORT_ORDER.DESC]],
      raw: true,
    });
    if (!invoice) {
      throw new NotFoundError({
        detail: `No due invoice found for company ${companyId}.`,
        code: 'invoice_not_found',
      });
    }

    return invoice;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }

    logError('InvoiceService', `Error querying latest invoice for companyId: ${companyId}`, error);

    throw new InternalServerError({ detail: 'Failed to load latest invoice data.' });
  }
}
