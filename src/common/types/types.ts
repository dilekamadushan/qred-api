import type { components } from '../../generated/openapi';
import type { SORT_ORDER } from '../constants';

export type TransactionSummary = components['schemas']['TransactionSummary'];
type PageInfo = components['schemas']['PageInfo'];
type TransactionListResponse = components['schemas']['TransactionListResponse'];
export type CursorPayload = { createdAt: string; id: string };
export type TransactionListData = TransactionListResponse['data'];
type SortBy = 'createdAt' | 'amount' | 'merchantName';
type SortOrder = [keyof typeof SORT_ORDER][number];
type TransactionStatus = 'pending' | 'booked' | 'declined' | 'reversed';

export type TransactionQueryOptions = {
  cursor?: string;
  status?: TransactionStatus;
  dateFrom?: string;
  dateTo?: string;
  pageSize?: number;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  search?: string;
}; // User info attached to req.user by auth middleware
export type User = {
  userId: string;
  [key: string]: unknown;
};
// Common types for reuse across the codebase

export type HttpStatusCode =
  (typeof import('../constants').HTTP_STATUS)[keyof typeof import('../constants').HTTP_STATUS];

export type InvalidField = {
  field: string;
  reason: string;
};

export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string | null;
  requestId: string;
  code: string;
  errors: InvalidField[] | null;
};

export type RemainingSpendSummary = components['schemas']['RemainingSpendSummary'];

export interface GenericError {
  code?: string;
  [key: string]: unknown;
}

// Company types
export type CompanySummary = components['schemas']['CompanySummary'];
// PageInfo type only exported once below
export type CompanyListData = {
  items: CompanySummary[];
  page: PageInfo;
};

// Dashboard types
export type DashboardData = components['schemas']['DashboardResponse']['data'];
export type CardValue = NonNullable<DashboardData['card']['value']>;
export type TransactionsValue = NonNullable<DashboardData['transactions']['value']>;
export type ViewMoreValue = NonNullable<DashboardData['viewMore']['value']>;
export type SectionWithValue<T> = { value: T };
export type SectionError = { error: string };
export type SelectedCompanyResult = {
  companyId: string;
  section: DashboardData['company'];
};

// Transaction types
export type TransactionPreviewResult = {
  items: TransactionSummary[];
  remainingTransactions: number;
};

// Card types
export type CardSummary = components['schemas']['CardSummary'];
export type CardActivationResult = components['schemas']['CardActivationResponse']['data'];
export type CardStatus = CardSummary['status'];

// Circuit breaker types
export type DbCircuitBreakerOptions = {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  volumeThreshold?: number;
};

// Company  types
export type CompanyQueryOptions = {
  search?: string;
  pageSize?: number;
  sortBy?: 'name' | 'legalName' | 'isSelected';
  isSelected?: boolean;
  cursor?: string;
};

export type CompanyCursorPayload = {
  sortField: 'name' | 'legalName' | 'isSelected';
  sortValue: string | boolean;
  id: string;
};

export type CompanyMembershipLike = {
  companyId: string;
  isSelected?: boolean | null;
  company?: {
    id: string;
    name: string;
    legalName: string;
    logoUrl: string;
  } | null;
};

export interface RequestContext {
  requestId?: string;
  [key: string]: unknown;
}
