export interface ParsedSpreadsheetRow {
    [key: string]: string;
}

function normalizeHeader(header: string): string {
    return header
        .replace(/^\uFEFF/, '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function columnIndexFromCellRef(cellRef: string): number {
    const match = cellRef.match(/^([A-Z]+)/i);
    if (!match) return 0;
    const letters = match[1].toUpperCase();
    let index = 0;
    for (let i = 0; i < letters.length; i++) {
        index = index * 26 + (letters.charCodeAt(i) - 64);
    }
    return Math.max(0, index - 1);
}

async function inflateRaw(compressed: Uint8Array): Promise<string> {
    if (typeof DecompressionStream === 'undefined') {
        return new TextDecoder().decode(compressed);
    }
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(compressed as unknown as BufferSource);
    writer.close();

    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    let totalLen = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
            chunks.push(value);
            totalLen += value.length;
        }
    }
    const combined = new Uint8Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
        combined.set(c, offset);
        offset += c.length;
    }
    return new TextDecoder('utf-8').decode(combined);
}

async function extractZipEntriesBrowser(buffer: ArrayBuffer): Promise<Record<string, string>> {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const entries: Record<string, string> = {};
    const len = bytes.length;

    // Find End of Central Directory (PK\x05\x06)
    let eocdPos = -1;
    for (let i = len - 22; i >= Math.max(0, len - 65557); i--) {
        if (
            bytes[i] === 0x50 &&
            bytes[i + 1] === 0x4b &&
            bytes[i + 2] === 0x05 &&
            bytes[i + 3] === 0x06
        ) {
            eocdPos = i;
            break;
        }
    }

    if (eocdPos === -1) return entries;

    const totalEntries = view.getUint16(eocdPos + 10, true);
    let pos = view.getUint32(eocdPos + 16, true);
    const decoder = new TextDecoder('utf-8');

    for (let i = 0; i < totalEntries && pos + 46 <= len; i++) {
        if (
            bytes[pos] !== 0x50 ||
            bytes[pos + 1] !== 0x4b ||
            bytes[pos + 2] !== 0x01 ||
            bytes[pos + 3] !== 0x02
        ) {
            break;
        }

        const method = view.getUint16(pos + 10, true);
        const compSize = view.getUint32(pos + 20, true);
        const nameLen = view.getUint16(pos + 28, true);
        const extraLen = view.getUint16(pos + 30, true);
        const commentLen = view.getUint16(pos + 32, true);
        const localOffset = view.getUint32(pos + 42, true);

        const filename = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLen));
        pos += 46 + nameLen + extraLen + commentLen;

        if (localOffset + 30 > len) continue;
        const localNameLen = view.getUint16(localOffset + 26, true);
        const localExtraLen = view.getUint16(localOffset + 28, true);
        const dataStart = localOffset + 30 + localNameLen + localExtraLen;

        if (dataStart + compSize > len) continue;
        const rawSlice = bytes.subarray(dataStart, dataStart + compSize);

        if (
            filename === 'xl/sharedStrings.xml' ||
            (filename.startsWith('xl/worksheets/sheet') && filename.endsWith('.xml'))
        ) {
            if (method === 0) {
                entries[filename] = decoder.decode(rawSlice);
            } else if (method === 8) {
                try {
                    entries[filename] = await inflateRaw(rawSlice);
                } catch {
                    // ignore corrupt entry
                }
            }
        }
    }

    return entries;
}

async function parseXlsxBuffer(buffer: ArrayBuffer): Promise<string[][]> {
    const entries = await extractZipEntriesBrowser(buffer);
    const domParser = new DOMParser();

    const sharedStrings: string[] = [];
    if (entries['xl/sharedStrings.xml']) {
        const sstDoc = domParser.parseFromString(entries['xl/sharedStrings.xml'], 'application/xml');
        const siNodes = Array.from(sstDoc.getElementsByTagName('si'));
        for (const si of siNodes) {
            const tNodes = Array.from(si.getElementsByTagName('t'));
            sharedStrings.push(tNodes.map((n) => n.textContent ?? '').join(''));
        }
    }

    const sheetKey =
        'xl/worksheets/sheet1.xml' in entries
            ? 'xl/worksheets/sheet1.xml'
            : Object.keys(entries).find(
                  (k) => k.startsWith('xl/worksheets/sheet') && k.endsWith('.xml'),
              );

    if (!sheetKey || !entries[sheetKey]) return [];

    const sheetDoc = domParser.parseFromString(entries[sheetKey], 'application/xml');
    const rowNodes = Array.from(sheetDoc.getElementsByTagName('row'));
    const rows: string[][] = [];

    for (const rowEl of rowNodes) {
        const cellNodes = Array.from(rowEl.getElementsByTagName('c'));
        const rowCells: Record<number, string> = {};
        let maxCol = -1;
        let nextCol = 0;

        for (const c of cellNodes) {
            const ref = c.getAttribute('r') || '';
            const colIdx = ref ? columnIndexFromCellRef(ref) : nextCol;
            nextCol = colIdx + 1;
            if (colIdx > maxCol) maxCol = colIdx;

            const type = c.getAttribute('t') || '';
            let val = '';
            if (type === 's') {
                const vEl = c.getElementsByTagName('v')[0];
                const sstIdx = parseInt(vEl?.textContent ?? '0', 10);
                val = sharedStrings[sstIdx] ?? '';
            } else if (type === 'inlineStr') {
                const tNodes = Array.from(c.getElementsByTagName('t'));
                val = tNodes.map((n) => n.textContent ?? '').join('');
            } else {
                const vEl = c.getElementsByTagName('v')[0];
                val = vEl?.textContent ?? '';
            }
            rowCells[colIdx] = val.trim();
        }

        if (maxCol >= 0) {
            const arr: string[] = [];
            for (let i = 0; i <= maxCol; i++) {
                arr.push(rowCells[i] ?? '');
            }
            rows.push(arr);
        }
    }

    return rows;
}

function parseCsvText(text: string): string[][] {
    const clean = text.replace(/^\uFEFF/, '').trim();
    if (!clean) return [];
    const lines = clean.split(/\r\n|\r|\n/);
    const first = lines[0] || '';
    const commas = (first.match(/,/g) || []).length;
    const semis = (first.match(/;/g) || []).length;
    const tabs = (first.match(/\t/g) || []).length;

    let delimiter = ',';
    if (semis > commas && semis >= tabs) delimiter = ';';
    else if (tabs > commas && tabs > semis) delimiter = '\t';

    return lines.map((line) => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch === delimiter && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
        result.push(current.trim());
        return result;
    });
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheetRow[]> {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let rawRows: string[][] = [];

    const isZip =
        bytes.length > 4 &&
        bytes[0] === 0x50 &&
        bytes[1] === 0x4b &&
        bytes[2] === 0x03 &&
        bytes[3] === 0x04;

    if (isZip || file.name.toLowerCase().endsWith('.xlsx')) {
        rawRows = await parseXlsxBuffer(buffer);
    } else {
        const text = new TextDecoder('utf-8').decode(bytes);
        if (text.toLowerCase().includes('<table')) {
            const doc = new DOMParser().parseFromString(text, 'text/html');
            const trs = Array.from(doc.querySelectorAll('tr'));
            rawRows = trs.map((tr) =>
                Array.from(tr.querySelectorAll('th, td')).map((td) => (td.textContent ?? '').trim()),
            );
        } else {
            rawRows = parseCsvText(text);
        }
    }

    const nonEmpty = rawRows.filter((r) => r.some((c) => c.trim() !== ''));
    if (nonEmpty.length < 2) return [];

    const headers = nonEmpty[0].map((h, i) => normalizeHeader(h) || `col_${i}`);
    const result: ParsedSpreadsheetRow[] = [];

    for (let i = 1; i < nonEmpty.length; i++) {
        const row = nonEmpty[i];
        const obj: ParsedSpreadsheetRow = {};
        let hasData = false;
        headers.forEach((key, colIdx) => {
            const val = (row[colIdx] ?? '').trim();
            if (val !== '') hasData = true;
            obj[key] = val;
        });
        if (hasData) {
            obj._row_number = String(i + 1);
            result.push(obj);
        }
    }

    return result;
}
