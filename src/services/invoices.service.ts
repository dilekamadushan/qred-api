import { Invoice } from '../db/models/invoice';
import { sharedDbCircuitBreaker } from './circuitBreaker.service';
import { logError, logWarn } from '../common/utils/logUtils';

async function queryLatestInvoice(companyId: string) {
  try {
    const invoice = await Invoice.findOne({
      where: {
        companyId,
        status: 'due',
      },
      order: [['dueDate', 'DESC']],
      raw: true,
    });
    if (!invoice) {
      logWarn('InvoiceService', `No due invoice found for companyId: ${companyId}`);
      return null;
    }
    return invoice;
  } catch (error) {
    logError('InvoiceService', `Error querying latest invoice for companyId: ${companyId}`, error);
    throw error;
  }
}

export const latestInvoiceCircuitBreaker = sharedDbCircuitBreaker;

export async function getLatestInvoiceForCompany(companyId: string) {
  try {
    return await latestInvoiceCircuitBreaker.execute(() => queryLatestInvoice(companyId));
  } catch (error) {
    logError('InvoiceService', `Database error for companyId: ${companyId}`, error);

    throw error;
  }
}
