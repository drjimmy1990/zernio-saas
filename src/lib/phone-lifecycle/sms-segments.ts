const gsmBasic = new Set(Array.from('@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'));
const gsmExtension = new Set(Array.from('\f^{}\\[~]|€'));

/** Count transmitted alphabet units, including GSM escape pairs and UTF-16 surrogate pairs. */
export function smsSegments(text: string) {
  const characters = Array.from(text);
  const gsm = characters.every(character => gsmBasic.has(character) || gsmExtension.has(character));
  const widths = characters.map(character => gsm ? (gsmExtension.has(character) ? 2 : 1) : character.length);
  const units = widths.reduce((sum, width) => sum + width, 0);
  if (!units) return { encoding: gsm ? 'GSM-7' : 'UCS-2', units, segments: 0 };
  if (units <= (gsm ? 160 : 70)) return { encoding: gsm ? 'GSM-7' : 'UCS-2', units, segments: 1 };
  const capacity = gsm ? 153 : 67;
  let segments = 1, occupied = 0;
  for (const width of widths) {
    if (occupied + width > capacity) { segments += 1; occupied = 0; }
    occupied += width;
  }
  return { encoding: gsm ? 'GSM-7' : 'UCS-2', units, segments };
}
