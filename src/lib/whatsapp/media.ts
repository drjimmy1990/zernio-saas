import { WhatsAppService } from '@/lib/whatsapp/service';
import { zernioClient, ZernioApiException } from '@/lib/zernio/client';
export interface WhatsAppMediaParams { organizationId: string; accountId: string; conversationId: string; messageId: string; attachmentIndex: number }
const maxBytes = 25 * 1024 * 1024;
const mediaExtensions: Record<string, string> = {
 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif',
 'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov',
 'audio/mpeg':'mp3','audio/mp4':'m4a','audio/ogg':'ogg','audio/wav':'wav','audio/webm':'webm',
 'application/pdf':'pdf','application/octet-stream':'bin','text/plain':'txt','text/csv':'csv','application/zip':'zip','application/x-zip-compressed':'zip',
 'application/msword':'doc','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'docx',
 'application/vnd.ms-excel':'xls','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'xlsx',
 'application/vnd.ms-powerpoint':'ppt','application/vnd.openxmlformats-officedocument.presentationml.presentation':'pptx',
};
function error(status: number, message: string): never { throw new ZernioApiException({ status, code: 'media_unavailable', error: message }); }
/** Resolve media only from a tenant-verified message; never proxy a caller URL. */
export async function downloadWhatsAppMedia(params: WhatsAppMediaParams) {
 if (typeof params.messageId !== 'string' || !params.messageId || !Number.isInteger(params.attachmentIndex) || params.attachmentIndex < 0) error(400, 'Select a valid message attachment.');
 await WhatsAppService.getConversation({ organizationId: params.organizationId, accountId: params.accountId, conversationId: params.conversationId });
 const { data: attachment } = await zernioClient.request<{ url?: string }>({ path: `/inbox/conversations/${encodeURIComponent(params.conversationId)}/messages/${encodeURIComponent(params.messageId)}/attachments/${params.attachmentIndex}`, query: { accountId: params.accountId, format: 'json' } });
 if (!attachment || typeof attachment.url !== 'string') error(404, 'Attachment not found in this conversation.');
 const base = new URL(zernioClient.getBaseUrl()), expectedPrefix = `${base.pathname.replace(/\/$/, '')}/whatsapp/media/`;
 let canonical: URL; try { canonical = new URL(attachment.url, `${base.origin}/`); } catch { error(502, 'The provider returned an invalid media reference.'); }
 if (canonical!.origin !== base.origin || !canonical!.pathname.startsWith(expectedPrefix) || canonical!.username || canonical!.password) error(400, 'This attachment is not an authenticated WhatsApp media download.');
 const mediaId = canonical!.pathname.slice(expectedPrefix.length);
 if (!/^[a-zA-Z0-9_-]{1,200}$/.test(mediaId)) error(502, 'Invalid provider media identifier.');
 if (!zernioClient.isConfigured()) error(503, 'Media provider is not configured.');
 // Construct the destination ourselves; query strings and redirects from attachment URLs never receive credentials.
 const target = new URL(`${base.origin}${expectedPrefix}${mediaId}`); target.searchParams.set('accountId', params.accountId);
 const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
 try {
  const response = await fetch(target, { headers: { Authorization: `Bearer ${zernioClient.getMasterApiKey()}` }, redirect: 'manual', cache: 'no-store', signal: controller.signal });
  if (!response.ok) error(response.status >= 300 && response.status < 400 ? 502 : response.status, 'WhatsApp media is unavailable or expired.');
  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() || '';
  if (!Object.hasOwn(mediaExtensions, contentType)) error(415, 'Unsupported media content type.');
  if (Number(response.headers.get('content-length')) > maxBytes) error(413, 'Media exceeds the 25MB download limit.');
  if (!response.body) error(502, 'Media response has no body.');
  const reader = response.body!.getReader(), chunks: Uint8Array[] = []; let length = 0;
  while (true) { const next = await reader.read(); if (next.done) break; length += next.value.byteLength; if (length > maxBytes) { await reader.cancel(); error(413, 'Media exceeds the 25MB download limit.'); } chunks.push(next.value); }
  const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return { bytes, contentType, filename: `whatsapp-media.${mediaExtensions[contentType]}`,
   disposition: /^(image|audio|video)\//.test(contentType) || contentType === 'application/pdf' ? 'inline' : 'attachment' };
 } catch (caught) { if (caught instanceof ZernioApiException) throw caught; error(controller.signal.aborted ? 504 : 503, 'Media download could not be completed.'); }
 finally { clearTimeout(timer); }
}
