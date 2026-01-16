/**
 * Helper functions for seed script
 */

import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';

/**
 * Generate a unique ID with an optional prefix
 */
export function generateId(prefix?: string): string {
  const bytes = randomBytes(16);
  const hex = bytes.toString('hex');
  const id = hex.substring(0, 24) + hex.substring(30, 34); // 32 char hex (similar to Mongo ObjectId)
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12); // Use same salt rounds as server
}

/**
 * Generate a random date between start and end
 */
export function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Generate a random date within the last N days from today
 */
export function randomDateLastDays(days: number): Date {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return randomDate(start, end);
}

/**
 * Pick a random item from an array
 */
export function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Pick N random items from an array (unique)
 */
export function randomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Convert text to URL-safe slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate avatar URL based on name (using UI Avatars)
 */
export function generateAvatarUrl(name: string): string {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;
}

/**
 * Sleep for ms milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format date as ISO string
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}
