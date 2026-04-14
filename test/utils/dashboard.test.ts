import { hasSectionError, mapSection } from '../../src/common/utils/dashboard';

describe('dashboard utils', () => {
  describe('hasSectionError', () => {
    it('returns true for section with non-empty error string', () => {
      expect(hasSectionError({ error: 'Something went wrong' })).toBe(true);
    });

    it('returns false for section with empty error string', () => {
      expect(hasSectionError({ error: '' })).toBe(false);
    });

    it('returns false for section with null error', () => {
      expect(hasSectionError({ error: null })).toBe(false);
    });

    it('returns false for section with undefined error', () => {
      expect(hasSectionError({})).toBe(false);
    });
  });

  describe('mapSection', () => {
    it('should map a SectionWithValue to a value object', () => {
      const section = { value: { foo: 'bar' } };
      const result = mapSection(section);
      expect(result).toEqual({ value: { foo: 'bar' } });
    });

    it('should map a SectionWithValue to a mapped value object', () => {
      const section = { value: { foo: 'bar' } };
      const result = mapSection<typeof section.value, { baz: string }>(section, (v) => ({
        baz: v.foo,
      }));
      expect(result).toEqual({ value: { baz: 'bar' } });
    });

    it('should map a SectionError to an error object', () => {
      const section = { error: 'Something went wrong' };
      const result = mapSection(section);
      expect(result).toEqual({ error: 'Something went wrong' });
    });
  });
});
