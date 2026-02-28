import { describe, it, expect } from 'vitest';
import {
  getAppVersion,
  getBuildDate,
  getFullVersionString,
  compareVersions,
  isNewerVersion,
} from './version';

describe('Version Utility', () => {
  describe('getAppVersion', () => {
    it('returns a valid version string', () => {
      const version = getAppVersion();
      expect(version).toBeDefined();
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('returns consistent version across multiple calls', () => {
      const version1 = getAppVersion();
      const version2 = getAppVersion();
      expect(version1).toBe(version2);
    });
  });

  describe('getBuildDate', () => {
    it('returns a valid date string', () => {
      const buildDate = getBuildDate();
      expect(buildDate).toBeDefined();
      expect(buildDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns a valid ISO date format', () => {
      const buildDate = getBuildDate();
      const date = new Date(buildDate);
      expect(date.toString()).not.toBe('Invalid Date');
    });
  });

  describe('getFullVersionString', () => {
    it('combines version and build date', () => {
      const fullVersion = getFullVersionString();
      const version = getAppVersion();
      const buildDate = getBuildDate();

      expect(fullVersion).toContain(version);
      expect(fullVersion).toContain(buildDate);
      expect(fullVersion).toBe(`v${version} (${buildDate})`);
    });
  });

  describe('compareVersions', () => {
    it('returns 0 for identical versions', () => {
      expect(compareVersions('v1.0.0', 'v1.0.0')).toBe(0);
      expect(compareVersions('v2.5.3', 'v2.5.3')).toBe(0);
    });

    it('returns 1 when first version is greater', () => {
      expect(compareVersions('v2.0.0', 'v1.0.0')).toBe(1);
      expect(compareVersions('v1.1.0', 'v1.0.0')).toBe(1);
      expect(compareVersions('v1.0.1', 'v1.0.0')).toBe(1);
    });

    it('returns -1 when first version is smaller', () => {
      expect(compareVersions('v1.0.0', 'v2.0.0')).toBe(-1);
      expect(compareVersions('v1.0.0', 'v1.1.0')).toBe(-1);
      expect(compareVersions('v1.0.0', 'v1.0.1')).toBe(-1);
    });

    it('handles versions without v prefix', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
    });

    it('handles versions with different lengths', () => {
      expect(compareVersions('v1.0', 'v1.0.0')).toBe(0);
      expect(compareVersions('v1.1', 'v1.0.5')).toBe(1);
      expect(compareVersions('v1.0', 'v1.0.1')).toBe(-1);
    });
  });

  describe('isNewerVersion', () => {
    it('returns true when new version is greater', () => {
      expect(isNewerVersion('v1.0.0', 'v2.0.0')).toBe(true);
      expect(isNewerVersion('v1.0.0', 'v1.1.0')).toBe(true);
      expect(isNewerVersion('v1.0.0', 'v1.0.1')).toBe(true);
    });

    it('returns false when new version is same or older', () => {
      expect(isNewerVersion('v1.0.0', 'v1.0.0')).toBe(false);
      expect(isNewerVersion('v2.0.0', 'v1.0.0')).toBe(false);
      expect(isNewerVersion('v1.1.0', 'v1.0.0')).toBe(false);
    });

    it('handles edge cases correctly', () => {
      expect(isNewerVersion('v1.0.0', 'v1.0.0')).toBe(false);
      expect(isNewerVersion('v0.9.9', 'v1.0.0')).toBe(true);
      expect(isNewerVersion('v1.0.0', 'v0.9.9')).toBe(false);
    });
  });
});
