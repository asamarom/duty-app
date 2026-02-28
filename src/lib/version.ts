/**
 * Version utility for the Duty Tactical Management System
 *
 * Version and build time are injected at build time via Vite's define plugin.
 */

// These are defined in vite.config.ts and replaced at build time
declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;

export function getAppVersion(): string {
  return __APP_VERSION__;
}

export function getBuildTime(): string {
  return __BUILD_TIME__;
}

export function getBuildDate(): string {
  // Extract just the date part from the ISO timestamp
  return __BUILD_TIME__.split('T')[0];
}

export function getFullVersionString(): string {
  return `v${__APP_VERSION__} (${getBuildDate()})`;
}

export function compareVersions(version1: string, version2: string): number {
  const v1Parts = version1.replace('v', '').split('.').map(Number);
  const v2Parts = version2.replace('v', '').split('.').map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;

    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }

  return 0;
}

export function isNewerVersion(currentVersion: string, newVersion: string): boolean {
  return compareVersions(newVersion, currentVersion) > 0;
}
