import { MetaCommentsService } from './service';
import { TenantAccessError } from '@/lib/auth/tenant-access';

export async function runMetaCommentsAction(organizationId: string, action: string, input: Record<string, any>) {
  const params = { organizationId, accountId: input.accountId, postId: input.postId, commentId: input.commentId,
    cursor: input.cursor, limit: input.limit == null || input.limit === '' ? undefined : Number(input.limit),
    since: input.since, minComments: input.minComments == null || input.minComments === '' ? undefined : Number(input.minComments) };
  switch (action) {
    case 'accounts': return MetaCommentsService.listAccounts(organizationId);
    case 'posts': return MetaCommentsService.listPosts(params);
    case 'comments': return MetaCommentsService.listComments(params);
    case 'reply': return MetaCommentsService.reply({ ...params, text: input.text ?? input.message, idempotencyKey: input.idempotencyKey });
    case 'private_reply':
      if (['attachments', 'attachmentUrl', 'buttons', 'quickReplies'].some(field => input[field] !== undefined)) throw new TenantAccessError(400, 'Private replies support plain text only.');
      return MetaCommentsService.privateReply({ ...params, text: input.text ?? input.message, idempotencyKey: input.idempotencyKey });
    case 'hide': return MetaCommentsService.hide({ ...params, hidden: input.hidden });
    case 'delete': return MetaCommentsService.deleteComment(params);
    default: throw new TenantAccessError(501, 'This comment operation is not available.');
  }
}

export async function runMetaCommentsPublicApi(organizationId: string, method: string, path: string[], input: Record<string, any>) {
  let action = '';
  if (path.length === 2 && method === 'GET') action = 'posts';
  if (path.length === 3) {
    input = { ...input, postId: path[2] };
    action = method === 'GET' ? 'comments' : method === 'DELETE' ? 'delete' : method === 'POST' && input.commentId ? 'reply' : '';
  }
  if (path.length === 5) {
    input = { ...input, postId: path[2], commentId: path[3] };
    if (path[4] === 'private-reply' && method === 'POST') action = 'private_reply';
    if (path[4] === 'hide' && ['POST', 'DELETE'].includes(method)) { action = 'hide'; input = { ...input, hidden: method === 'POST' }; }
  }
  if (!action) throw new TenantAccessError(501, 'Use the account, post and comment identifiers with a supported moderation operation.');
  return runMetaCommentsAction(organizationId, action, input);
}
