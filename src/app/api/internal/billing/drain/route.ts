import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { BillingWorkspaceService } from '@/lib/billing/workspace';
export const maxDuration=60;
export async function POST(request:Request){
  const secret=process.env.WEBHOOK_DRAIN_SECRET?.trim(),token=request.headers.get('authorization')?.replace(/^Bearer /,'')??'';
  if(!secret||secret.length<32)return NextResponse.json({error:'Billing worker is not configured.'},{status:503});
  const expected=Buffer.from(secret),actual=Buffer.from(token);
  if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return NextResponse.json({error:'Unauthorized.'},{status:401});
  try{return NextResponse.json(await BillingWorkspaceService.drain(),{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'Billing renewal requires review. No success is assumed.'},{status:503});}
}
