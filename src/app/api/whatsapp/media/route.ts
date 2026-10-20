import { requireTenantAccess } from '@/lib/auth/tenant-access';
import { downloadWhatsAppMedia } from '@/lib/whatsapp/media';
import { whatsAppError } from '@/lib/whatsapp/actions';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
export async function GET(request: Request) {
 try {
  const query = new URL(request.url).searchParams;
  const { session } = await requireTenantAccess(request, query.get('organizationId'));
  const result = await downloadWhatsAppMedia({ organizationId: session.tenant.organizationId, accountId: query.get('accountId') || '', conversationId: query.get('conversationId') || '', messageId: query.get('messageId') || '', attachmentIndex: query.has('attachmentIndex') ? Number(query.get('attachmentIndex')) : 0 });
  return new Response(result.bytes.buffer as ArrayBuffer, { headers: { ...headers, 'Content-Type': result.contentType, 'Content-Length': String(result.bytes.length), 'Content-Disposition': `${result.disposition}; filename="${result.filename}"` } });
 } catch (error) { const failure = whatsAppError(error); return Response.json(failure.payload, { status: failure.status, headers }); }
}
