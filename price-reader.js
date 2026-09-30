/* Price extraction is independent of the OCR engine and UI. */
(function (root) {
  'use strict';
  const normalize = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  function currencies(text) {
    const s = normalize(text), found = [];
    if (/\bCLP\b|\bCL\s*\$|PESOS?\s+CHILENOS?/.test(s)) found.push('CLP');
    if (/\bARS\b|\bAR\s*\$|PESOS?\s+ARGENTINOS?/.test(s)) found.push('ARS');
    if (/\bUSD\b|\bUS\s*\$|\bU\s*\$\s*S\b|DOLARES?\s+(?:ESTADOUNIDENSES?|AMERICANOS?)/.test(s)) found.push('USD');
    if (/\b(?:EUR|BRL|MXN|COP|UYU|CAD|AUD|NZD|GBP|PEN)\b|€|£|\b(?:R|CA|AU|NZ)\s*\$|PESOS?\s+(?:MEXICANOS?|COLOMBIANOS?|URUGUAYOS?)/.test(s)) found.push('OTHER');
    return found;
  }
  function number(raw) {
    let s = raw.trim().replace(/[\s\u00a0]/g, '');
    if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(s)) s = s.replace(/,/g, '');
    else if (/^\d+(?:[.,]\d{1,2})?$/.test(s)) s = s.replace(',', '.');
    else return null;
    const value = Number(s);
    return Number.isFinite(value) && value > 0 && value <= 1e12 ? value : null;
  }
  function extract(text) {
    const globalCodes = currencies(text), results = [];
    for (const original of String(text).split(/[\r\n]+/)) {
      const line = original.trim();
      if (!line) continue;
      // One candidate per number; never infer a currency from number punctuation.
      const pattern = /\d+(?:[.,]\d+)*(?:[ \u00a0]\d{3})*(?:[.,]\d{1,2})?/g;
      for (const match of line.matchAll(pattern)) {
        const before = line.slice(0, match.index), after = line.slice(match.index + match[0].length);
        const value = number(match[0]);
        if (value === null || /^\s*(?:%|KG\b|G\b|ML\b|L\b|CM\b|MM\b)/i.test(after)) continue;
        if (/[\d/:-]$/.test(before) || /^[/:]/.test(after)) continue;
        if (/\b(?:SKU|EAN|COD(?:IGO)?|MODELO|TEL|RUT|CUIT)\s*[:#.-]?\s*$/i.test(normalize(before))) continue;
        if (/[A-Z]$/i.test(before) && !/(?:CLP|ARS|USD)$/.test(normalize(before))) continue;
        if (/^[A-Z]/i.test(after) && !/^(?:CLP|ARS|USD)\b/.test(normalize(after))) continue;
        if (match[0].replace(/\D/g, '').length >= 12) continue;
        const prefix = before.match(/(?:CLP|ARS|USD|EUR|BRL|MXN|COP|UYU|CAD|AUD|NZD|GBP|PEN|US\s*\$|U\s*\$\s*S|CL\s*\$|AR\s*\$|CA\s*\$|AU\s*\$|NZ\s*\$|R\s*\$|€|£|\$)\s*$/i)?.[0] || '';
        const suffix = after.match(/^\s*(?:CLP\b|ARS\b|USD\b|EUR\b|BRL\b|MXN\b|CAD\b|AUD\b|COP\b|UYU\b|GBP\b|PEN\b|PESOS?\s+\w+|DOLARES?\s+\w+)/i)?.[0] || '';
        let codes = currencies(prefix + ' ' + suffix);
        if (!codes.length) codes = currencies(line);
        if (!codes.length && globalCodes.length === 1) codes = globalCodes;
        const unsupported = codes.includes('OTHER');
        const code = !unsupported && codes.length === 1 ? codes[0] : null;
        const monetary = !!prefix || !!suffix || /PRECIO|PRICE|TOTAL|OFERTA|AHORA|ANTES/i.test(line);
        // Ignore incidental integers (years, counts) when they have no price context.
        if (!monetary && !code && !/[.,]/.test(match[0])) continue;
        const score = (prefix || suffix ? 5 : 0) + (code ? 3 : 0) + (/\bTOTAL\b|\bAHORA\b|\bOFERTA\b/i.test(before) ? 2 : 0);
        const key = value + ':' + code + ':' + unsupported;
        if (!results.some(item => item.key === key)) results.push({key,amount:value,currency:code,unsupported,line:line.slice(0,160),score});
      }
    }
    return results.sort((a,b) => b.score - a.score).slice(0,12);
  }
  const api = { extract, number, currencies };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PriceReader = api;
})(globalThis);
