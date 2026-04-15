import { Invoice } from '../../src/db/models/invoice';
import { getLatestInvoiceForCompany } from '../../src/services/invoices.service';
import { sharedDbCircuitBreaker } from '../../src/services/circuitBreaker.service';
import {
  DbCircuitOpenError,
  InternalServerError,
  NotFoundError,
} from '../../src/common/errors/appHttpError';

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
      sharedDbCircuitBreaker.execute = mockBreaker.execute;
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
      it('throws DbCircuitOpenError if breaker is open', async () => {
        const error = new DbCircuitOpenError();
        mockBreaker.execute.mockRejectedValueOnce(error);

        await expect(getLatestInvoiceForCompany(companyId)).rejects.toThrow(DbCircuitOpenError);
      });

      it('propagates non-circuit-breaker errors', async () => {
        mockBreaker.execute.mockRejectedValueOnce(new Error('db error'));

        await expect(getLatestInvoiceForCompany(companyId)).rejects.toThrow('db error');
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
        order: [['dueDate', 'desc']],
        raw: true,
      });
      expect(result).toBe(mockInvoice);
    });

    it('should throw NotFoundError if there are no due invoices', async () => {
      const companyId = 'company-3';
      mockBreaker.execute.mockImplementationOnce(async (operation) => operation());
      (Invoice.findOne as jest.Mock).mockResolvedValueOnce(null);

      await expect(getLatestInvoiceForCompany(companyId)).rejects.toBeInstanceOf(NotFoundError);
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
