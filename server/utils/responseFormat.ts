/**
 * Transform Prisma snake_case fields to camelCase for API responses
 * 
 * Prisma returns snake_case (e.g., avatar_url, created_at, updated_at)
 * API standard should be camelCase (e.g., avatarUrl, createdAt, updatedAt)
 */

export function toCamelCase(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }

  const newObj: any = {};
  for (const key in obj) {
    // Convert snake_case to camelCase
    // e.g., "avatar_url" → "avatarUrl", "created_at" → "createdAt"
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    newObj[camelKey] = toCamelCase(obj[key]);
  }
  return newObj;
}

/**
 * Transform array of objects to camelCase
 */
export function transformArray<T>(items: T[]): T[] {
  return items.map(toCamelCase);
}
