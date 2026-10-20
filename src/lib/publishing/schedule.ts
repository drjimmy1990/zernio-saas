/** Convert explicit IANA wall times without relying on the browser's own timezone. */
function formatter(timeZone: string) {
  if (typeof timeZone !== 'string' || !timeZone.trim()) throw new Error('Choose a valid IANA timezone.');
  try { return new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }); }
  catch { throw new Error('Choose a valid IANA timezone.'); }
}
function parts(format: Intl.DateTimeFormat, instant: number) {
  const result: Record<string, string> = {};
  for (const item of format.formatToParts(new Date(instant))) if (item.type !== 'literal') result[item.type] = item.value;
  return result;
}
function wall(format: Intl.DateTimeFormat, instant: number) {
  const p = parts(format, instant);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function publishingScheduleInstant(wallTime: string, timeZone: string): string {
  const format = formatter(timeZone);
  if (typeof wallTime !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(wallTime)) throw new Error('Choose a valid date and time.');
  const naive = Date.parse(`${wallTime}:00Z`);
  if (!Number.isFinite(naive) || new Date(naive).toISOString().slice(0, 16) !== wallTime) throw new Error('Choose a valid date and time.');
  // Sample both sides of nearby DST changes to discover every possible UTC offset.
  const offsets = new Set<number>();
  for (let hours = -48; hours <= 48; hours += 6) {
    const probe = naive + hours * 3600000, p = parts(format, probe);
    const asUtc = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
    offsets.add(asUtc - probe);
  }
  const candidates = [...offsets].map(offset => naive - offset).filter(instant => wall(format, instant) === wallTime);
  if (candidates.length === 0) throw new Error('This local time does not exist because the clocks move forward. Choose another time.');
  if (candidates.length !== 1) throw new Error('This local time occurs twice because the clocks move backward. Choose an unambiguous time.');
  return new Date(candidates[0]).toISOString();
}
export function publishingWallTime(instant: string, timeZone: string): string {
  const format = formatter(timeZone);
  if (typeof instant !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/i.test(instant) || !Number.isFinite(Date.parse(instant))) throw new Error('Use a valid ISO datetime with a timezone offset.');
  const localPart = instant.slice(0, 16), localDate = Date.parse(`${localPart}:00Z`);
  if (!Number.isFinite(localDate) || new Date(localDate).toISOString().slice(0, 16) !== localPart) throw new Error('Use a valid ISO date and time.');
  return wall(format, Date.parse(instant));
}
