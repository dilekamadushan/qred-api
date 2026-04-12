import { Invoice } from '../../src/db/models/invoice';
import { getLatestInvoiceForCompany } from '../../src/services/invoices.service';
import { latestInvoiceCircuitBreaker } from '../../src/services/invoices.service';
import { logError } from '../../src/common/utils/logUtils';
import { DbCircuitOpenError } from '../../src/services/circuitBreaker.service';

jest.mock('../../src/db/models/invoice');
jest.mock('../../src/common/utils/logUtils');

const mockBreaker = {
  execute: jest.fn(),
};

describe('invoices.service', () => {
  describe('getLatestInvoiceForCompany (direct DB)', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return the latest due invoice for a company', async () => {
      const companyId = 'company-1';
      const mockInvoice = { id: 'inv-1', companyId, dueDate: '2099-12-31', status: 'due' };
      (Invoice.findOne as jest.Mock).mockResolvedValue(mockInvoice);

      const result = await getLatestInvoiceForCompany(companyId);
      expect(Invoice.findOne).toHaveBeenCalledWith({
        where: { companyId, status: 'due' },
        order: [['dueDate', 'DESC']],
        raw: true,
      });
      expect(result).toBe(mockInvoice);
    });

    it('should return null if there are no due invoices', async () => {
      const companyId = 'company-2';
      (Invoice.findOne as jest.Mock).mockResolvedValue(null);

      const result = await getLatestInvoiceForCompany(companyId);
      expect(result).toBeNull();
    });
  });

  describe('getLatestInvoiceForCompany (with circuit breaker)', () => {
    const companyId = 'company-1';
    const mockInvoice = { id: 'inv-1', companyId, dueDate: '2099-12-31', status: 'due' };

    beforeEach(() => {
      jest.clearAllMocks();
      latestInvoiceCircuitBreaker.execute = mockBreaker.execute;
    });

    it('returns invoice when circuit breaker succeeds', async () => {
      mockBreaker.execute.mockResolvedValueOnce(mockInvoice);
      const result = await getLatestInvoiceForCompany(companyId);
      expect(mockBreaker.execute).toHaveBeenCalled();
      expect(result).toBe(mockInvoice);
    });

    it('logs and throws when circuit breaker throws', async () => {
      const error = new Error('db error');
      mockBreaker.execute.mockRejectedValueOnce(error);
      await expect(getLatestInvoiceForCompany(companyId)).rejects.toThrow('db error');
      expect(logError).toHaveBeenCalledWith(
        'InvoiceService',
        expect.stringContaining('Database error for companyId'),
        error
      );
    });

    it('logs warning if no invoice found', async () => {
      // Simulate queryLatestInvoice returning null
      mockBreaker.execute.mockResolvedValueOnce(null);
      const result = await getLatestInvoiceForCompany(companyId);
      expect(result).toBeNull();
      // logWarn is called inside queryLatestInvoice, which is not directly tested here
    });

    it('throws DbCircuitOpenError if breaker is open', async () => {
      const error = new DbCircuitOpenError();
      mockBreaker.execute.mockRejectedValueOnce(error);
      await expect(getLatestInvoiceForCompany(companyId)).rejects.toThrow(DbCircuitOpenError);
    });
  });
});
