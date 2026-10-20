import { NextResponse } from 'next/server';

// An optional human-readable product summary. This is not a search-engine
// verification mechanism or a guarantee that an AI service will use the file.
export async function GET() {
  const content = `# Asra3 (https://asra3.com)

> Asra3 provides tenant-scoped manual customer management, Facebook/Instagram publishing and inbox tools, WhatsApp conversations and reviewed campaigns, activity reports, and phone tools subject to provider approval and spending allocation.

## Current launch scope
- Durable manual CRM stores contacts, multiple scoped identities, typed fields, tags, notes, status, owner, consent/withdrawal and do-not-contact. CSV import requires preview and explicit duplicate decisions. Local CRM UUIDs are never provider contact IDs.
- Facebook and Instagram support connection, manual publishing, scheduled posts, messages, comments and selected messaging settings. Instagram baseline feed/Reel/carousel/Story options have explicit validation limits.
- WhatsApp supports manual conversations, approved template messaging and reviewed campaigns. Recipient consent is rechecked before dispatch; schedules remain controlled by Asra3.
- Reports show available provider metrics; missing costs, delivery evidence and timestamps remain unavailable.
- Provider phone-number purchase, rental, SMS and call operations require current ownership, consent, provider approval and administrator spending allocation.
- Workspace membership, roles, verified sessions and expiring hashed API keys protect access. Current keys begin with asra3_; legacy local keys are retired.

## Coming soon
Customer automation, automatic replies, provider contact synchronization, payment collection, top-ups, paid upgrades, advertising and commerce are not enabled in this launch. Paid plan prices and future capabilities are not current purchase offers. Provider resource catalog entries and illustrative demos do not establish launch availability. Real production acceptance is a separate owner-operated gate.

## Key links
- [Homepage](https://asra3.com/)
- [English product guide](https://asra3.com/en)
- [دليل المنتج بالعربية](https://asra3.com/ar)
- [Customer CRM](https://asra3.com/en/crm)
- [إدارة العملاء](https://asra3.com/ar/crm)
- [WhatsApp](https://asra3.com/en/whatsapp)
- [واتساب](https://asra3.com/ar/whatsapp)
- [Facebook and Instagram](https://asra3.com/en/facebook-instagram)
- [فيسبوك وإنستجرام](https://asra3.com/ar/facebook-instagram)
- [Reports](https://asra3.com/en/reports)
- [التقارير](https://asra3.com/ar/reports)
- [Resource documentation and availability](https://asra3.com/docs)
`;
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
