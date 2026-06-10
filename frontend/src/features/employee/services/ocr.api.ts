// src/features/employee/services/ocr.api.ts
import { createWorker } from 'tesseract.js';
import { OCRExtractionResult, ExtractedData } from '../types/ocr.types';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert Khmer digits (០-៩) and extended Arabic variants to ASCII digits */
function normalizeDigits(str: string): string {
    const khmer = '០១២៣៤៥៦៧៨៩';
    const arabic = '٠١٢٣٤٥٦٧٨٩';
    return str
        .split('')
        .map(ch => {
            const ki = khmer.indexOf(ch);
            if (ki !== -1) return ki.toString();
            const ai = arabic.indexOf(ch);
            if (ai !== -1) return ai.toString();
            return ch;
        })
        .join('');
}

/** Capitalize each word */
function toTitleCase(s: string): string {
    return s
        .toLowerCase()
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

/**
 * Remove OCR noise words from a Latin name string.
 * Noise patterns on Cambodian ID card backgrounds:
 *   - 4+ consecutive repeated letters: "Llllllllhoe", "Xxxxxxx"
 *   - Words with non-alpha characters (digits, symbols)
 *   - Single-character artifacts
 *   - Unrealistically long words (>20 chars)
 */
function cleanEnglishName(name: string): string {
    return name
        .split(/\s+/)
        .filter(word => {
            if (word.length < 2) return false;
            if (/[^A-Za-z'\-]/.test(word)) return false;        // digits or symbols
            if (word.length > 20) return false;                  // too long for a real name word
            if (/([a-z])\1{3,}/.test(word)) return false;       // 4+ same lowercase in a row: "llll", "oooo"
            if (/([A-Z])\1{3,}/.test(word)) return false;       // 4+ same uppercase in a row: "LLLL"
            return true;
        })
        .join(' ')
        .trim();
}

// ─── MRZ Parser ─────────────────────────────────────────────────────────────

interface MrzData {
    employeeCode: string;
    dateOfBirth: string; // YYYY-MM-DD
    expiryDate: string;  // YYYY-MM-DD
    surname: string;
    givenNames: string;
    sex: string;
    nationality: string;
}

/**
 * Parse 3-line TD1 MRZ (Cambodian national ID format):
 *   Line 1: IDKHM<employeeCode><<...
 *   Line 2: YYMMDD<sex><YYMMDD><nationality><<<...<checkDigit
 *   Line 3: SURNAME<<GIVENNAME<...
 */
function parseMrz(lines: string[]): MrzData | null {
    // Find MRZ block: lines starting with IDKHM
    const mrzStart = lines.findIndex(l => /^IDKHM/.test(l.replace(/\s/g, '')));
    if (mrzStart === -1) return null;

    const raw = lines.slice(mrzStart, mrzStart + 3).map(l => l.replace(/\s/g, '').toUpperCase());
    if (raw.length < 3) return null;

    const [line1, line2, line3] = raw;

    // ── Line 1: IDKHM + ID number ──
    // Format: ID + KHM + <9-digit-id> + check + <optional padding>
    const line1Match = line1.match(/^IDKHM(\d{9})/);
    const employeeCode = line1Match ? line1Match[1] : '';

    // ── Line 2: YYMMDD + sex + expiry YYMMDD + nationality ──
    // e.g. 8409126M2509127KHM<<<<<<<<<<4
    const line2Match = line2.match(/^(\d{6})\d([MF<])(\d{6})\d([A-Z]{3})/);
    let dateOfBirth = '';
    let expiryDate = '';
    let sex = '';
    let nationality = '';

    if (line2Match) {
        const dobRaw = line2Match[1];   // YYMMDD
        const sexChar = line2Match[2];
        const expRaw = line2Match[3];   // YYMMDD
        nationality = line2Match[4];

        sex = sexChar === 'M' ? 'Male' : sexChar === 'F' ? 'Female' : '';

        const parseMrzDate = (yymmdd: string, isBirth: boolean): string => {
            const yy = parseInt(yymmdd.slice(0, 2), 10);
            const mm = parseInt(yymmdd.slice(2, 4), 10);
            const dd = parseInt(yymmdd.slice(4, 6), 10);
            // Birth year: if yy > current 2-digit year + 1, assume 1900s
            const currentYY = new Date().getFullYear() % 100;
            const yyyy = isBirth
                ? (yy > currentYY + 1 ? 1900 + yy : 2000 + yy)
                : (yy < currentYY - 5 ? 2000 + yy : 2000 + yy); // expiry always 2000s
            if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return '';
            return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
        };

        dateOfBirth = parseMrzDate(dobRaw, true);
        expiryDate = parseMrzDate(expRaw, false);
    }

    // ── Line 3: SURNAME<<GIVEN<NAMES ──
    // e.g. TIT<<SAMOL<<<<<<<<<<<<<<<<<<<<<
    let surname = '';
    let givenNames = '';
    const namePart = line3.replace(/<+$/, ''); // strip trailing fillers
    const nameSegments = namePart.split('<<');
    if (nameSegments.length >= 1) surname = nameSegments[0].replace(/</g, ' ').trim();
    if (nameSegments.length >= 2) givenNames = nameSegments.slice(1).join(' ').replace(/<+/g, ' ').trim();

    return { employeeCode, dateOfBirth, expiryDate, surname, givenNames, sex, nationality };
}

// ─── OCR Text Parser ─────────────────────────────────────────────────────────

function parseOcrText(rawText: string): ExtractedData {
    const lines = rawText
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

    const normalizedLines = lines.map(normalizeDigits);
    const fullNormalized = normalizedLines.join('\n');

    // ── 1. MRZ — most reliable source of truth ──
    const mrz = parseMrz(normalizedLines);

    // ── 2. ID Number ──
    // Primary: from MRZ; fallback: 9-digit sequence in text
    let employeeCode = mrz?.employeeCode ?? '';
    if (!employeeCode) {
        const m = fullNormalized.match(/\b(\d{9})\b/);
        if (m) employeeCode = m[1];
    }

    // ── 3. English Name ──
    // Primary: MRZ line 3 — SURNAME<<GIVEN<<< format.
    // After parseMrz splits on "<<", each segment must contain ONLY A-Z letters.
    // Any segment with non-alpha chars is OCR noise and is discarded.
    let englishName = '';

    const isCleanMrzNameSegment = (s: string): boolean =>
        s.length > 0 && /^[A-Z]+$/.test(s); // pure uppercase letters only, no digits or symbols

    if (mrz?.surname && isCleanMrzNameSegment(mrz.surname)) {
        const parts: string[] = [mrz.surname];
        // Given names: may be multiple "<"-separated tokens inside the segment
        if (mrz.givenNames) {
            mrz.givenNames
                .split(/\s+/)
                .filter(isCleanMrzNameSegment)
                .forEach(p => parts.push(p));
        }
        englishName = cleanEnglishName(toTitleCase(parts.join(' ')));
    }

    // Fallback: scan OCR lines for an ALL-CAPS Latin line that looks like a name.
    // Strict rules to avoid picking up background watermark text or MRZ padding.
    if (!englishName) {
        const latinLine = lines.find(line => {
            const trimmed = line.trim();
            // Must be 2–40 chars, all uppercase letters and spaces only
            if (!/^[A-Z][A-Z\s]{1,38}[A-Z]$/.test(trimmed)) return false;
            // Must have at least 2 words
            const words = trimmed.split(/\s+/);
            if (words.length < 2) return false;
            // Each word: 2–20 chars, no repeated single-character runs (e.g. "LLLLL")
            return words.every(w => w.length >= 2 && w.length <= 20 && !/(.)\1{3,}/.test(w));
        });
        if (latinLine) englishName = cleanEnglishName(toTitleCase(latinLine.trim()));
    }

    // ── 4. Khmer Name ──
    // Label variants OCR produces for "គោត្តនាមនិងនាម":
    //   គោគ្តនាមនិងនាម / គោក្គនាម / គោត្តនាម / នាម  (all contain "នាម")
    // The value (e.g. "ទិត សំអុល") may be:
    //   (a) same line after "ៈ" or ":" → "គោគ្តនាមនិងនាមៈ ទិត សំអុល"
    //   (b) same line with no separator  → "គោគ្តនាមនិងនាម ទិត សំអុល"
    //   (c) next line entirely           → "គោគ្តនាមនិងនាម\nទិត សំអុល"
    let khmerName = '';

    const isKhmerNameLabel = (line: string): boolean => {
        if (!/នាម/.test(line)) return false;
        // Exclude lines that are clearly other field labels
        if (/ថ្ងៃខែ|ទីកន្លែង|កំណើត|ភេទ|ភូមិ|ឃុំ|ស្រុក|ខណ្ឌ|ខេត្ត|សញ្ជាតិ|ដល់ថ្ងៃ/.test(line)) return false;
        return true;
    };

    // Known label word fragments to strip from a line before reading the name value.
    // Covers all OCR variants of "គោត្តនាមនិងនាម" and "នាមត្រកូល".
    const labelStripRe = /គោ[^\s]*នាម(?:និងនាម)?[ៈ:\s]*/g;

    // Given a raw line, strip the label portion and return only the Khmer name chars.
    const extractKhmerName = (line: string): string => {
        let val = line
            .replace(labelStripRe, ' ')               // remove label words
            .replace(/^.*[៖:ៈ]\s*/, '')              // fallback: strip up to any colon
            .replace(/[^\u1780-\u17FF\s]/g, '')       // keep Khmer chars + spaces only
            .replace(/\s+/g, ' ')
            .trim();

        // A valid Khmer name has at least 2 words (family + given) and no label fragments
        // Reject if it still looks like label text only (e.g. "នាម" alone)
        const words = val.split(/\s+/).filter(w => w.length > 0);
        if (words.length < 1 || val.length < 3) return '';
        return val;
    };

    for (let i = 0; i < lines.length; i++) {
        if (!isKhmerNameLabel(lines[i])) continue;

        // Case (a) & (b): value on the same line
        const fromSameLine = extractKhmerName(lines[i]);
        if (fromSameLine.length > 2) { khmerName = fromSameLine; break; }

        // Case (c): value on the next line (check up to 2 lines ahead)
        for (let offset = 1; offset <= 2; offset++) {
            const nextLine = lines[i + offset] ?? '';
            // Skip blank or non-Khmer lines
            if (!nextLine || !/[\u1780-\u17FF]/.test(nextLine)) continue;
            // Skip if the next line is itself another label
            if (isKhmerNameLabel(nextLine)) break;
            // Skip if it contains digits (date line)
            if (/[0-9០១២៣៤៥៦៧៨៩]/.test(nextLine)) continue;

            const fromNext = extractKhmerName(nextLine);
            if (fromNext.length > 2) { khmerName = fromNext; break; }
        }
        if (khmerName) break;
    }

    // Fallback: find a line with enough Khmer characters that isn't a label or date line
    if (!khmerName) {
        const excludeKhmer = /ភេទ|កំពស់|ទម្ងន់|សញ្ជាតិ|ថ្ងៃខែ|ទីកន្លែង|ភូមិ|ឃុំ|សង្កាត់|ស្រុក|ខណ្ឌ|អត្តលេខ|លេខ|ដល់ថ្ងៃ|សុពលភាព|កាលបរិច្ឆេទ/;
        const candidate = lines.find(line => {
            const khmerChars = line.match(/[\u1780-\u17FF]/g) ?? [];
            if (khmerChars.length < 4) return false;
            if (excludeKhmer.test(line)) return false;
            // Reject lines with digits — date/ID lines always have them
            if (/[0-9០១២៣៤៥៦៧៨៩]/.test(line)) return false;
            // Reject lines that are themselves labels (contain "នាម" with field context)
            if (isKhmerNameLabel(line) && extractKhmerName(line).length < 3) return false;
            return true;
        });
        if (candidate) khmerName = extractKhmerName(candidate);
    }

    // ── 5. Date of Birth ──
    // Primary: MRZ (most accurate)
    let dateOfBirth = mrz?.dateOfBirth ?? '';

    // Fallback: parse Khmer/Arabic date formats from OCR lines
    if (!dateOfBirth) {
        // Match dd.mm.yyyy or dd/mm/yyyy after converting Khmer digits
        const dateRe = /(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})/;
        const dobLabelRe = /ថ្ងៃខែ(?:ឆ្នាំ)?កំណើត|DOB/i;
        const placeRe = /ទីកន្លែង/;

        for (let i = 0; i < normalizedLines.length; i++) {
            if (dobLabelRe.test(normalizedLines[i]) && !placeRe.test(normalizedLines[i])) {
                const searchText = normalizedLines[i] + ' ' + (normalizedLines[i + 1] ?? '');
                const m = searchText.match(dateRe);
                if (m) {
                    const [, d, mo, y] = m;
                    const day = parseInt(d, 10);
                    const month = parseInt(mo, 10);
                    const year = parseInt(y, 10);
                    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1930 && year <= 2025) {
                        dateOfBirth = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        break;
                    }
                }
            }
        }
    }

    // ── 6. Place of Birth ──
    let placeOfBirth = '';
    const pobLabelRe = /ទីកន្លែងកំណើត|កន្លែងកំណើត/;
    for (let i = 0; i < lines.length; i++) {
        if (pobLabelRe.test(lines[i])) {
            // Value may be on same line or next
            const after = lines[i].replace(pobLabelRe, '').replace(/^[^\u1780-\u17FFa-zA-Z]+/, '').trim();
            if (after.length > 2) { placeOfBirth = after; break; }
            if (lines[i + 1]) { placeOfBirth = lines[i + 1].trim(); break; }
        }
    }

    // ── 7. Address ──
    // Cambodian addresses contain village/commune/district/province keywords
    let address = '';
    const addrKeywords = ['ភូមិ', 'ឃុំ', 'សង្កាត់', 'ស្រុក', 'ខណ្ឌ', 'ក្រុង', 'ខេត្ត'];
    const addrLine = lines.find(line => addrKeywords.some(kw => line.includes(kw)));
    if (addrLine) {
        address = addrLine
            .replace(/^[^ក-៩\u1780-\u17FF]+/, '') // strip leading non-Khmer
            .replace(/iE|IE|lE/g, '')               // OCR noise
            .trim();
    }

    // ── 8. Sex ──
    const sex = mrz?.sex ?? (/ប្រុស/.test(rawText) ? 'Male' : /ស្រី/.test(rawText) ? 'Female' : '');

    return {
        khmerName,
        englishName,
        employeeCode,
        dateOfBirth,
        placeOfBirth,
        address,
        sex,
        expiryDate: mrz?.expiryDate ?? '',
        nationality: mrz?.nationality ?? 'KHM',
    };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const ocrApi = {
    async extractFromIdCard(file: File): Promise<OCRExtractionResult> {
        try {
            // Run Khmer + English recognition together
            const worker = await createWorker(['khm', 'eng']);

            // Improve accuracy: hint the engine that this is a structured document
            await worker.setParameters({
                tessedit_pageseg_mode: '3', // PSM_AUTO — auto page segmentation, no OSD
            });

            const { data: { text } } = await worker.recognize(file);
            await worker.terminate();

            const extracted = parseOcrText(text);

            return { success: true, data: extracted };
        } catch (err) {
            console.error('Tesseract OCR error:', err);
            return {
                success: false,
                data: {
                    khmerName: '',
                    englishName: '',
                    employeeCode: '',
                    dateOfBirth: '',
                    placeOfBirth: '',
                    address: '',
                    sex: '',
                    expiryDate: '',
                    nationality: '',
                },
                error: 'OCR processing failed. Please try a clearer image.',
            };
        }
    },
};
