import type { SectionError, SectionWithValue } from '../types/types';

export const mapSection = <T, U = T>(
  section: SectionWithValue<T> | SectionError,
  valueMapper?: (value: T) => U
): { value: U } | { error: string } => {
  if ('value' in section) {
    return { value: valueMapper ? valueMapper(section.value) : (section.value as unknown as U) };
  } else {
    return { error: section.error };
  }
};

export const hasSectionError = (section: { error?: string | null }) =>
  typeof section.error === 'string' && section.error.length > 0;
