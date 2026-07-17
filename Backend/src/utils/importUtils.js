// utils/importUtils.js

// ─── Month maps ──────────────────────────────────────────────
const monthMap = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

const fullMonthMap = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

// ─── Clean placeholder values ──────────────────────────────
function cleanValue(value) {
    if (value == null) return "";
    const str = String(value).trim();
    // Only clear these placeholder values; "Vacancy" is treated as a valid value
    if (["#n/a", "n/a", "-", "null", "undefined"].includes(str.toLowerCase())) {
        return "";
    }
    return str;
}

// ─── Date helpers ───────────────────────────────────────────
function buildLocalDate(year, monthIndex, day, rowNumber) {
    const date = new Date(year, monthIndex, day);
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== monthIndex ||
        date.getDate() !== day
    ) {
        throw new Error(`Invalid date value at row ${rowNumber}`);
    }
    return date;
}

function toFullYear(yearStr) {
    const year = Number(yearStr);
    if (yearStr.length === 2) {
        return year >= 50 ? 1900 + year : 2000 + year;
    }
    return year;
}

function parseMonthToken(token) {
    if (/^\d{1,2}$/.test(token)) {
        const month = Number(token);
        if (month >= 1 && month <= 12) return month - 1;
        return undefined;
    }
    const lower = token.toLowerCase();
    if (fullMonthMap[lower] !== undefined) return fullMonthMap[lower];
    const abbrev = lower.charAt(0).toUpperCase() + lower.slice(1, 3);
    return monthMap[abbrev];
}

function parseNumericDateParts(part1, part2, yearStr, rowNumber) {
    const a = Number(part1);
    const b = Number(part2);
    const year = toFullYear(yearStr);

    let day, month;
    if (a > 12) {
        day = a;
        month = b;
    } else if (b > 12) {
        month = a;
        day = b;
    } else {
        // Default to DD/MM/YYYY (Cambodia / Excel)
        day = a;
        month = b;
    }
    return buildLocalDate(year, month - 1, day, rowNumber);
}

// ─── Parse import dates (multiple common spreadsheet formats) ──
export function parseImportDate(value, rowNumber) {
    if (value == null || value === "") return null;
    if (value instanceof Date) {
        if (isNaN(value.getTime())) {
            throw new Error(`Invalid date value at row ${rowNumber}`);
        }
        return value;
    }

    let trimmed = String(value).trim().replace(/^['"]+|['"]+$/g, "");
    if (!trimmed) return null;

    // Drop time portion
    trimmed = trimmed.split(/[T\s]/)[0];

    // D/MMM/YYYY or D-MMM-YYYY (case-insensitive month)
    const namedMonthMatch = trimmed.match(/^(\d{1,2})[\/\-.]([A-Za-z]{3,9})[\/\-.](\d{2,4})$/);
    if (namedMonthMatch) {
        const [, dayStr, monthStr, yearStr] = namedMonthMatch;
        const month = parseMonthToken(monthStr);
        if (month === undefined) {
            throw new Error(`Invalid month "${monthStr}" at row ${rowNumber}`);
        }
        return buildLocalDate(toFullYear(yearStr), month, Number(dayStr), rowNumber);
    }

    // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
    const numericMatch = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (numericMatch) {
        const [, part1, part2, yearStr] = numericMatch;
        return parseNumericDateParts(part1, part2, yearStr, rowNumber);
    }

    // "15 Jul 2025"
    const spacedMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})$/);
    if (spacedMatch) {
        const [, dayStr, monthStr, yearStr] = spacedMatch;
        const month = parseMonthToken(monthStr);
        if (month === undefined) {
            throw new Error(`Invalid month "${monthStr}" at row ${rowNumber}`);
        }
        return buildLocalDate(toFullYear(yearStr), month, Number(dayStr), rowNumber);
    }

    // ISO YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
        const [, yearStr, monthStr, dayStr] = isoMatch;
        return buildLocalDate(Number(yearStr), Number(monthStr) - 1, Number(dayStr), rowNumber);
    }

    // YYYY/MM/DD or YYYY.MM.DD
    const yearFirstMatch = trimmed.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if (yearFirstMatch) {
        const [, yearStr, monthStr, dayStr] = yearFirstMatch;
        return buildLocalDate(Number(yearStr), Number(monthStr) - 1, Number(dayStr), rowNumber);
    }

    // Excel serial number
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
        const serial = parseFloat(trimmed);
        if (serial > 1000 && serial < 100000) {
            const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
            if (!isNaN(date.getTime())) {
                return buildLocalDate(
                    date.getUTCFullYear(),
                    date.getUTCMonth(),
                    date.getUTCDate(),
                    rowNumber
                );
            }
        }
    }

    // Last resort: native parse
    const parsedMs = Date.parse(trimmed);
    if (!isNaN(parsedMs)) {
        const parsed = new Date(parsedMs);
        return buildLocalDate(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), rowNumber);
    }

    throw new Error(
        `Invalid date format at row ${rowNumber}. Use D/MMM/YYYY (e.g. 1/Jan/2026), DD/MM/YYYY, or YYYY-MM-DD`
    );
}

// ─── Normalize sex ───────────────────────────────────────────
export function normalizeSex(value) {
    if (!value?.trim()) return null;
    const s = value.trim().toLowerCase();
    if (s === "m" || s === "male") return "male";
    if (s === "f" || s === "female") return "female";
    if (s === "other") return "other";
    return null;
}

// ─── Normalize field aliases and clean values ──────────────
export function normalizeImportRow(data) {
    const result = { ...data };

    // 1. Clean all string values
    for (const key of Object.keys(result)) {
        result[key] = cleanValue(result[key]);
    }

    // 2. Alias mapping (after cleaning)
    const findValue = (aliases) => {
        for (const key of Object.keys(result)) {
            const normalizedKey = key.toLowerCase().replace(/[\s_-]+/g, "");
            if (aliases.includes(normalizedKey)) return result[key];
        }
        return undefined;
    };

    if (!result.dob) {
        const dob = findValue(["dob", "dateofbirth"]);
        if (dob) result.dob = dob;
    }
    if (!result.expiryDate) {
        const expiry = findValue(["expirydate", "expireddate", "expired"]);
        if (expiry) result.expiryDate = expiry;
    }
    if (!result.sex) {
        const sex = findValue(["sex", "gender"]);
        if (sex) result.sex = sex;
    }
    if (!result.depotNumber) {
        const depotNumber = findValue(["depotnumber", "depoidnumber", "depoid"]);
        if (depotNumber) result.depotNumber = depotNumber;
    }
    if (!result.provinceName) {
        const province = findValue(["province"]);
        if (province) result.provinceName = province;
    }
    if (!result.districtName) {
        const district = findValue(["district"]);
        if (district) result.districtName = district;
    }
    if (!result.employeeName) {
        const supervisor = findValue(["supervisorname", "employeesupervisor"]);
        if (supervisor) result.employeeName = supervisor;
    }

    return result;
}