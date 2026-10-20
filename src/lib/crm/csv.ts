import { TenantAccessError } from '@/lib/auth/tenant-access';
import type { ContactInput } from './types';
export const crmCsvHeaders = ['display_name','company','phones','emails','tags','status','identities','custom_fields'] as const;
/** RFC4180 quoting; cells may contain commas, quotes and newlines. */
export function parseCrmCsv(csv: string): string[][] {
  if (typeof csv !== 'string' || csv.length > 2_000_000) throw new TenantAccessError(400, 'CSV must be at most 2MB.');
  const rows: string[][] = [], row: string[] = []; let cell = '', quoted = false, endedQuote = false;
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (quoted) { if (char === '"' && csv[i+1] === '"') { cell += '"'; i++; } else if (char === '"') { quoted=false;endedQuote=true; } else cell+=char; continue; }
    if (char === '"') { if (cell || endedQuote) throw new TenantAccessError(400,'Invalid CSV quoting.'); quoted=true;continue; }
    if (char === ',' || char === '\n' || char === '\r') { row.push(cell);cell='';endedQuote=false;if(char!==','){if(char==='\r'&&csv[i+1]==='\n')i++;rows.push([...row]);row.length=0;}continue; }
    if (endedQuote) throw new TenantAccessError(400,'Unexpected text after a quoted CSV cell.');cell+=char;
  }
  if (quoted) throw new TenantAccessError(400,'CSV has an unclosed quote.');
  if (cell || row.length || endedQuote) {row.push(cell);rows.push([...row]);}
  if (rows.length > 501) throw new TenantAccessError(400,'Import at most 500 contacts at a time.');
  return rows;
}
export function crmCsvInputs(csv: string): { row:number; input?:ContactInput; error?:string }[] {
  const rows=parseCrmCsv(csv.replace(/^\uFEFF/,'')); const headers=rows.shift();
  if (!headers?.includes('display_name') || new Set(headers).size !== headers.length || headers.some(header=>!crmCsvHeaders.includes(header as typeof crmCsvHeaders[number]))) throw new TenantAccessError(400,'CSV needs display_name and supported unique headers: '+crmCsvHeaders.join(', '));
  return rows.flatMap<{row:number;input?:ContactInput;error?:string}>((row,index)=>{
    if(!row.some(Boolean))return [];
    try {
      if(row.length!==headers.length)throw new Error('Column count does not match headers.');
      const value:Record<string,unknown>={}; headers.forEach((header,i)=>{ if(['phones','emails','tags'].includes(header))value[header]=row[i]?row[i].split(';').map(item=>item.trim()).filter(Boolean):[];else if(['identities','custom_fields'].includes(header))value[header]=row[i]?JSON.parse(row[i]):header==='identities'?[]:{};else if(row[i])value[header]=row[i]; });
      return [{row:index+2,input:value as ContactInput}];
    }catch(error){return [{row:index+2,error:error instanceof Error?error.message:'Invalid row.'}];}
  });
}
function cell(value: unknown) { let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"'; }
export function exportCrmCsv(contacts: Record<string, any>[]) {
  const headers=[...crmCsvHeaders,'do_not_contact','consents','notes','inbox_links','owner_user_id','archived_at'];
  return '\uFEFF'+headers.map(cell).join(',')+'\r\n'+contacts.map(contact=>headers.map(header=>cell(['phones','emails','tags'].includes(header)?(contact[header]||[]).join(';'):['identities','custom_fields','consents','notes','inbox_links'].includes(header)?JSON.stringify(contact[header]??(header==='custom_fields'?{}:[])):contact[header])).join(',')).join('\r\n');
}
