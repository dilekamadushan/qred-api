export const hasSectionError = (section: { error?: string | null }) =>
  typeof section.error === 'string' && section.error.length > 0;
