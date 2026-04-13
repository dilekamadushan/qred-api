import { Invoice } from '../../src/db/models/invoice';
import { getLatestInvoiceForCompany } from '../../src/services/invoices.service';
import { latestInvoiceCircuitBreaker } from '../../src/services/invoices.service';
import { logWarn } from '../../src/common/utils/logUtils';
import { DbCircuitOpenError, InternalServerError } from '../../src/common/errors/appHttpError';

jest.mock('../../src/db/models/invoice');
jest.mock('../../src/common/utils/logUtils');

const mockBreaker = {
  execute: jest.fn(),
};

describe('invoices.service', () => {
  describe('getLatestInvoiceForCompany', () => {
    const companyId = 'company-1';

    beforeEach(() => {
      jest.clearAllMocks();
      latestInvoiceCircuitBreaker.execute = mockBreaker.execute;
    });

    describe('when circuit breaker execution succeeds', () => {
      it('returns the latest due invoice for a company', async () => {
        const mockInvoice = { id: 'inv-1', companyId, dueDate: '2099-12-31', status: 'due' };
        mockBreaker.execute.mockResolvedValueOnce(mockInvoice);

        const result = await getLatestInvoiceForCompany(companyId);

        expect(mockBreaker.execute).toHaveBeenCalled();
        expect(result).toBe(mockInvoice);
      });

      it('returns null if there are no due invoices', async () => {
        mockBreaker.execute.mockResolvedValueOnce(null);

        const result = await getLatestInvoiceForCompany(companyId);

        expect(result).toBeNull();
      });
    });

    describe('when circuit breaker execution fails', () => {
      it('throws DbCircuitOpenError if breaker is open and logs warning', async () => {
        const error = new DbCircuitOpenError();
        mockBreaker.execute.mockRejectedValueOnce(error);

        await expect(getLatestInvoiceForCompany(companyId)).rejects.toThrow(DbCircuitOpenError);
        expect(logWarn).toHaveBeenCalledWith(
          'InvoiceService',
          expect.stringContaining(`Circuit breaker is OPEN for companyId: ${companyId}`)
        );
      });

      it('throws InternalServerError for non-circuit-breaker errors', async () => {
        mockBreaker.execute.mockRejectedValueOnce(new Error('db error'));

        await expect(getLatestInvoiceForCompany(companyId)).rejects.toBeInstanceOf(
          InternalServerError
        );
      });
    });
  });

  describe('query behavior through breaker callback', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return the latest due invoice for a company', async () => {
      const companyId = 'company-2';
      const mockInvoice = { id: 'inv-1', companyId, dueDate: '2099-12-31', status: 'due' };
      mockBreaker.execute.mockImplementationOnce(async (operation) => operation());
      (Invoice.findOne as jest.Mock).mockResolvedValueOnce(mockInvoice);

      const result = await getLatestInvoiceForCompany(companyId);
      expect(Invoice.findOne).toHaveBeenCalledWith({
        where: { companyId, status: 'due' },
        order: [['dueDate', 'DESC']],
        raw: true,
      });
      expect(result).toBe(mockInvoice);
    });

    it('should return null if there are no due invoices', async () => {
      const companyId = 'company-3';
      mockBreaker.execute.mockImplementationOnce(async (operation) => operation());
      (Invoice.findOne as jest.Mock).mockResolvedValueOnce(null);

      const result = await getLatestInvoiceForCompany(companyId);
      expect(result).toBeNull();
    });

    it('should throw InternalServerError when invoice query fails', async () => {
      mockBreaker.execute.mockImplementationOnce(async (operation) => operation());
      (Invoice.findOne as jest.Mock).mockRejectedValueOnce(new Error('db error'));

      await expect(getLatestInvoiceForCompany('company-4')).rejects.toBeInstanceOf(
        InternalServerError
      );
    });
  });
});
