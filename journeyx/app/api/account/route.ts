import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { currentUser, createSession, hashPassword, verifyPassword, sameOrigin, allow, digest } from '@/lib/auth';
export async function GET() { try { const u = await currentUser(); return Response.json({ user: u ? {name:u.name,email:u.email}:null }); } catch { return Response.json({error:'Database is unavailable.'},{status:503}); } }
export async function POST(request: Request) {
 if (!sameOrigin(request)) return Response.json({error:'Invalid origin'},{status:403});
 if (!process.env.DATABASE_URL) return Response.json({error:'Set DATABASE_URL and run the database migration first.'},{status:503});
 if (!allow('account',30)) return Response.json({error:'Too many attempts. Try again in a minute.'},{status:429});
 try {
 const b = await request.json();
 if (b.action === 'logout') { const jar=await cookies();const token=jar.get('journeyx-session')?.value;if(token)await db.session.deleteMany({where:{tokenHash:digest(token)}});jar.delete('journeyx-session');return Response.json({user:null}); }
 const email=typeof b.email==='string'?b.email.trim().toLowerCase():''; const password=typeof b.password==='string'?b.password:'';
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<10||password.length>128||!['login','register'].includes(b.action)) return Response.json({error:'Use a valid email and a password of 10–128 characters.'},{status:400});
 if(!allow('email:'+email,5))return Response.json({error:'Too many attempts. Try again in a minute.'},{status:429});
 let u=await db.user.findUnique({where:{email}});
 if(b.action==='register') {
 if(u) return Response.json({error:'Unable to register with these details. Try signing in.'},{status:409});
 if(typeof b.name!=='string'||!b.name.trim()||b.name.length>80)return Response.json({error:'Enter a name (1–80 characters).'},{status:400});
 u=await db.user.create({data:{email,name:b.name.trim(),passwordHash:hashPassword(password)}});
 } else if(!u||!verifyPassword(password,u.passwordHash)) return Response.json({error:'Email or password is incorrect.'},{status:401});
 await createSession(u!.id);return Response.json({user:{name:u!.name,email:u!.email}});
 } catch {return Response.json({error:'Account service unavailable. Check your database setup.'},{status:503});}
}
