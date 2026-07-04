import type {
  TextLine,
  TextRecognitionResult,
} from '@react-native-ml-kit/text-recognition';

export type ScannedItem = {
  name: string;
  price: number;
  quantity: number;
};

export type ScanResult = {
  items: ScannedItem[];
  /** Best guess at the store name, if one was found near the top. */
  place: string | null;
};

/**
 * Price like 1,234.56 or 105.00, optionally preceded by a peso sign (or a
 * standalone "P", how ₱ often OCRs) and followed by a VAT code letter.
 */
const PRICE_RE = /(?:(?:^|\s)[₱P])?\s*(\d{1,3}(?:,\d{3})+\.\d{2}|\d+\.\d{2})\s*[A-Z]?$/;

/** Rows that are receipt bookkeeping, not purchased items. */
const NOISE_RE =
  /sub\s*total|total|gross|amount|cash|change|tender|discount|vat|tax|member\b|comment|balance|invoice|receipt|auth|acnt|acct|acount|account|qty|purchase|code|rate|cashier|tel|tin|bir|min#|sn#|owned|operated|thank|return|exchange|name\s*:|address|business|php|card|bdo|equi/i;

type Row = {
  centerY: number;
  height: number;
  segments: { left: number; text: string }[];
};

function collectLines(result: TextRecognitionResult): TextLine[] {
  return result.blocks.flatMap((block) => block.lines);
}

/**
 * ML Kit often returns receipt columns as separate blocks (all names in one,
 * all prices in another), so lines are regrouped into visual rows using their
 * bounding boxes before pairing names with prices.
 */
function groupIntoRows(lines: TextLine[]): Row[] {
  const positioned = lines.filter((line) => line.frame && line.text.trim().length > 0);
  const rows: Row[] = [];

  const sorted = positioned
    .map((line) => ({
      text: line.text.trim(),
      left: line.frame!.left,
      centerY: line.frame!.top + line.frame!.height / 2,
      height: line.frame!.height,
    }))
    .sort((a, b) => a.centerY - b.centerY);

  for (const line of sorted) {
    const row = rows[rows.length - 1];
    const tolerance = Math.max(line.height, row?.height ?? 0) * 0.6;
    if (row && Math.abs(line.centerY - row.centerY) <= tolerance) {
      row.segments.push({ left: line.left, text: line.text });
    } else {
      rows.push({
        centerY: line.centerY,
        height: line.height,
        segments: [{ left: line.left, text: line.text }],
      });
    }
  }

  for (const row of rows) {
    row.segments.sort((a, b) => a.left - b.left);
  }
  return rows;
}

function cleanItemName(raw: string): string {
  return raw
    .replace(/^\d{3,}\s+/, '') // leading SKU / item code
    .replace(/\s+[A-Z]$/, '') // trailing VAT code letter
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function parseRowText(text: string): ScannedItem | null {
  const priceMatch = PRICE_RE.exec(text);
  if (!priceMatch) return null;

  const price = Number(priceMatch[1].replace(/,/g, ''));
  if (!Number.isFinite(price) || price <= 0) return null;

  const name = cleanItemName(text.slice(0, priceMatch.index));
  // Needs at least a couple of letters to be a product name (filters bare
  // numbers, barcodes, and the price column matched on its own).
  if ((name.match(/[A-Za-z]/g) ?? []).length < 2) return null;
  if (NOISE_RE.test(name)) return null;

  // "2 @ 105.00" style unit-price rows describe the line above, not an item.
  if (/^\d+\s*@/.test(name)) return null;

  return { name, price, quantity: 1 };
}

function guessPlace(rows: Row[]): string | null {
  for (const row of rows.slice(0, 6)) {
    const text = row.segments.map((s) => s.text).join(' ').trim();
    if (PRICE_RE.test(text)) break; // items started, stop looking
    if (NOISE_RE.test(text)) continue;
    const letters = (text.match(/[A-Za-z&]/g) ?? []).length;
    if (letters >= 3 && letters >= text.replace(/\s/g, '').length * 0.6) {
      return text;
    }
  }
  return null;
}

type OcrSpaceWord = {
  WordText: string;
  Left: number;
  Top: number;
  Height: number;
  Width: number;
};

type OcrSpaceLine = {
  LineText: string;
  Words: OcrSpaceWord[];
  MaxHeight: number;
  MinTop: number;
};

export type OcrSpaceResponse = {
  ParsedResults?: {
    TextOverlay?: { Lines?: OcrSpaceLine[] };
    ParsedText?: string;
  }[];
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
};

/** Reshape an OCR.space overlay into ML Kit's result format for the parser. */
function toRecognitionResult(response: OcrSpaceResponse): TextRecognitionResult {
  const parsed = response.ParsedResults?.[0];
  const text = parsed?.ParsedText ?? '';

  let lines: TextLine[] = (parsed?.TextOverlay?.Lines ?? [])
    .filter((line) => line.Words.length > 0)
    .map((line) => {
      const left = Math.min(...line.Words.map((w) => w.Left));
      const right = Math.max(...line.Words.map((w) => w.Left + w.Width));
      return {
        text: line.LineText,
        frame: { left, top: line.MinTop, width: right - left, height: line.MaxHeight },
        elements: [],
        recognizedLanguages: [],
      };
    });

  // No overlay returned: fall back to plain text lines (no bounding boxes).
  if (lines.length === 0 && text) {
    lines = text
      .split(/\r?\n/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((t) => ({ text: t, elements: [], recognizedLanguages: [] }));
  }

  return { text, blocks: [{ text, lines, recognizedLanguages: [] }] };
}

export function parseOcrSpaceResponse(response: OcrSpaceResponse): ScanResult {
  return parseReceipt(toRecognitionResult(response));
}

export function parseReceipt(result: TextRecognitionResult): ScanResult {
  const lines = collectLines(result);
  const rows = groupIntoRows(lines);

  let items: ScannedItem[] = [];
  for (const row of rows) {
    const text = row.segments.map((s) => s.text).join('  ').trim();
    const item = parseRowText(text);
    if (item) items.push(item);
  }

  // Fallback when bounding boxes were unavailable: try each raw line as-is.
  if (items.length === 0) {
    items = lines
      .map((line) => parseRowText(line.text.trim()))
      .filter((item): item is ScannedItem => item !== null);
  }

  // Identical units (same product rung up more than once) become one row
  // with a higher quantity, matching how the items are entered by hand.
  const merged: ScannedItem[] = [];
  for (const item of items) {
    const existing = merged.find((m) => m.name === item.name && m.price === item.price);
    if (existing) {
      existing.quantity += 1;
    } else {
      merged.push(item);
    }
  }

  return { items: merged, place: guessPlace(rows) };
}
