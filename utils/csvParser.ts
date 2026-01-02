import { RawTransaction } from '../types';

export const parseCSV = (content: string): RawTransaction[] => {
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  // 1. Detect Delimiter
  const delimiter = detectDelimiter(lines.slice(0, 10));

  // 2. Find Header Row
  const { headerIndex, columnMap } = findHeaders(lines, delimiter);

  if (headerIndex === -1) {
    console.warn("Could not find valid headers. Detected delimiter:", delimiter);
    return [];
  }

  const transactions: RawTransaction[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const row = parseLine(lines[i], delimiter);
    
    // Skip empty rows or rows that don't match the header length roughly
    if (row.length < 2) continue;

    const dateStr = row[columnMap.date];
    
    // Construct Description: Combine Payee and Memo if available
    let fullDescription = '';
    
    const payeeStr = columnMap.payee !== -1 ? row[columnMap.payee] : '';
    const memoStr = columnMap.memo !== -1 ? row[columnMap.memo] : '';

    if (columnMap.payee !== -1 && columnMap.memo !== -1 && columnMap.payee !== columnMap.memo) {
        // If we have distinct columns, join them
        fullDescription = `${payeeStr} ${memoStr}`.trim();
    } else {
        // Otherwise take whichever exists
        fullDescription = payeeStr || memoStr;
    }

    // Fallback: If empty, check for any substantial text column
    if (!fullDescription || fullDescription.length < 3) {
       const fallbackIndex = row.findIndex((col, idx) => 
         idx !== columnMap.date && 
         idx !== columnMap.amount && 
         idx !== columnMap.debit && 
         idx !== columnMap.credit && 
         col.length > 5 &&
         isNaN(parseFloat(col))
       );
       if (fallbackIndex !== -1) fullDescription = row[fallbackIndex];
    }
    
    if (!fullDescription) fullDescription = 'Unknown Transaction';

    // Calculate Amount
    let amount = 0;
    if (columnMap.amount !== -1) {
      amount = parseAmount(row[columnMap.amount]);
    } else if (columnMap.debit !== -1 && columnMap.credit !== -1) {
      const debit = parseAmount(row[columnMap.debit]);
      const credit = parseAmount(row[columnMap.credit]);
      // Normalize: Expense = negative, Income = positive
      if (debit !== 0) amount -= Math.abs(debit);
      if (credit !== 0) amount += Math.abs(credit);
    }

    if (dateStr) {
      const normalizedDate = normalizeDate(cleanString(dateStr));
      if (normalizedDate) {
        transactions.push({
          date: normalizedDate,
          description: cleanString(fullDescription),
          amount
        });
      }
    }
  }

  return transactions;
};

// --- Helpers ---

const detectDelimiter = (sampleLines: string[]): string => {
  const delimiters = [';', ',', '\t', '|'];
  const scores = delimiters.map(d => {
    const counts = sampleLines.map(line => line.split(d).length - 1);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    const boost = d === ';' ? 0.1 : 0;
    return { d, avg: avg + boost };
  });
  
  return scores.sort((a, b) => b.avg - a.avg)[0].d;
};

const findHeaders = (lines: string[], delimiter: string) => {
  const KEYWORDS = {
    date: ['date', 'time', 'datum', 'buchungstag', 'valuta', 'zeit'],
    // Payee: Who the money went to
    payee: ['payee', 'merchant', 'beguenstigter', 'empfaenger', 'name', 'partei', 'auftraggeber', 'counterparty'],
    // Memo: What it was for (often contains codes, ref numbers)
    memo: ['description', 'desc', 'memo', 'narrative', 'details', 'verwendungszweck', 'buchungstext', 'text', 'referenz', 'purpose'],
    amount: ['amount', 'value', 'amt', 'net', 'betrag', 'umsatz', 'saldo', 'amount (eur)'],
    debit: ['debit', 'withdrawal', 'paid out', 'soll', 'ausgang', 'belastung'],
    credit: ['credit', 'deposit', 'paid in', 'hab', 'eingang', 'gutschrift']
  };

  let bestHeaderIndex = -1;
  let bestScore = 0;
  let bestMap = { date: -1, payee: -1, memo: -1, amount: -1, debit: -1, credit: -1 };

  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    const row = parseLine(lines[i], delimiter).map(c => c.toLowerCase().trim());
    let score = 0;
    const map = { date: -1, payee: -1, memo: -1, amount: -1, debit: -1, credit: -1 };

    row.forEach((col, index) => {
      if (KEYWORDS.date.some(k => col.includes(k))) { map.date = index; score += 3; }
      else if (KEYWORDS.amount.some(k => col === k || col.includes(k))) { map.amount = index; score += 3; }
      
      // Check Payee vs Memo
      else if (KEYWORDS.payee.some(k => col.includes(k))) { 
          if (map.payee === -1) map.payee = index; 
          score += 2; 
      }
      else if (KEYWORDS.memo.some(k => col.includes(k))) { 
          if (map.memo === -1) map.memo = index; 
          score += 2; 
      }
      
      else if (KEYWORDS.debit.some(k => col.includes(k))) { map.debit = index; score += 2; }
      else if (KEYWORDS.credit.some(k => col.includes(k))) { map.credit = index; score += 2; }
    });
    
    // Fallback: If we found a generic "description" but no specific payee/memo, assign it to payee for simplicity
    // Note: The KEYWORDS.memo includes 'description', so it's likely caught there.
    
    // Validation: Needs Date + Money
    const hasMoney = map.amount !== -1 || (map.debit !== -1 && map.credit !== -1) || (map.debit !== -1) || (map.credit !== -1);
    
    if (map.date !== -1 && hasMoney && score > bestScore) {
      bestScore = score;
      bestHeaderIndex = i;
      bestMap = map;
    }
  }

  return { headerIndex: bestHeaderIndex, columnMap: bestMap };
};

const parseLine = (line: string, delimiter: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuote = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuote = !inQuote;
    } else if (char === delimiter && !inQuote) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(val => val.replace(/^"|"$/g, '').trim());
};

const parseAmount = (str: string | undefined): number => {
  if (!str) return 0;
  let clean = str.trim();
  
  const isParenNegative = clean.startsWith('(') && clean.endsWith(')');
  if (isParenNegative) {
    clean = clean.slice(1, -1);
  }

  // Heuristic for German format (1.200,50) vs US (1,200.50)
  const lastComma = clean.lastIndexOf(',');
  const lastDot = clean.lastIndexOf('.');
  let isGermanFormat = false;

  if ((lastComma > lastDot && lastComma !== -1) || (lastComma !== -1 && lastDot === -1)) {
     isGermanFormat = true;
  }

  clean = clean.replace(/[^0-9.,-]/g, '');

  if (isGermanFormat) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else {
    clean = clean.replace(/,/g, '');
  }

  let val = parseFloat(clean);
  if (isNaN(val)) return 0;
  if (isParenNegative) val = -Math.abs(val);
  
  return val;
};

const cleanString = (str: string): string => {
  if (!str) return '';
  // Remove excessive whitespace and quotes
  return str.replace(/\s+/g, ' ').trim();
};

// Normalize date to YYYY-MM-DD format for consistent filtering
export const normalizeDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const cleaned = dateStr.trim();

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // Try parsing with Date object
  let parsed: Date | null = null;

  // Common formats to try
  // DD/MM/YYYY or DD.MM.YYYY (European)
  const euMatch = cleaned.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (euMatch) {
    const [, day, month, year] = euMatch;
    // Check if first number > 12, it's definitely day-first
    if (parseInt(day) > 12) {
      parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else if (parseInt(month) > 12) {
      // MM/DD/YYYY (US format)
      parsed = new Date(parseInt(year), parseInt(day) - 1, parseInt(month));
    } else {
      // Ambiguous - assume DD/MM/YYYY (more common globally)
      parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
  }

  // MM/DD/YYYY or MM-DD-YYYY (US with 2-digit year or full)
  const usMatch = cleaned.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (!parsed && usMatch) {
    let [, first, second, year] = usMatch;
    let fullYear = year.length === 2 ? (parseInt(year) > 50 ? `19${year}` : `20${year}`) : year;
    // If first > 12, it's day/month, otherwise month/day
    if (parseInt(first) > 12) {
      parsed = new Date(parseInt(fullYear), parseInt(second) - 1, parseInt(first));
    } else {
      parsed = new Date(parseInt(fullYear), parseInt(first) - 1, parseInt(second));
    }
  }

  // YYYY/MM/DD or YYYY.MM.DD
  const isoLikeMatch = cleaned.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (!parsed && isoLikeMatch) {
    const [, year, month, day] = isoLikeMatch;
    parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Fallback: let JS try to parse it
  if (!parsed) {
    parsed = new Date(cleaned);
  }

  // Validate and format
  if (parsed && !isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // If all else fails, return original
  return cleaned;
};