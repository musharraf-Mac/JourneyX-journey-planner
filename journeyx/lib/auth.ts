import { cookies } from 'next/headers';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
async function getDb() {
 const { db } = await import('./db');
 return db as PrismaClient;
}
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export function hashPassword(value: string) { const salt = randomBytes(16).toString('hex'); return salt + ':' + scryptSync(value, salt, 64).toString('hex'); }
export function verifyPassword(value: string, encoded: string) { const [salt, hash] = encoded.split(':'); const expected = Buffer.from(hash, 'hex'); const actual = scryptSync(value, salt, 64); return expected.length === actual.length && timingSafeEqual(expected, actual); }
export async function currentUser() {
 if (!process.env.DATABASE_URL) return null;
 const db = await getDb();
 const token = (await cookies()).get('journeyx-session')?.value;
 if (!token) return null;
 const session = await db.session.findUnique({ where: { tokenHash: digest(token) }, include: { user: true } });
 return session && session.expiresAt > new Date() ? session.user : null;
}
export async function createSession(userId: string) {
 const db = await getDb();
 const jar = await cookies(); const old = jar.get('journeyx-session')?.value;
 if (old) await db.session.deleteMany({ where: { tokenHash: digest(old) } });
 const token = randomBytes(32).toString('hex'); const expires = new Date(Date.now() + 7*86400000);
 await db.session.create({ data: { tokenHash: digest(token), userId, expiresAt: expires } });
 jar.set('journeyx-session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires });
}
export function sameOrigin(request: Request) { return request.headers.get('origin') === new URL(request.url).origin; }
const attempts = new Map<string, { count: number; until: number }>();
export function allow(key: string, limit = 10) {
 const now = Date.now(); for (const [k,v] of attempts) if (v.until < now) attempts.delete(k);
 const value = attempts.get(key) ?? { count: 0, until: now + 60000 };
 value.count++; attempts.set(key,value); return value.count <= limit;
}
