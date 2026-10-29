<?php

namespace App\Support;

use SimpleXMLElement;

class SpreadsheetReader
{
    /**
     * Parse an uploaded spreadsheet file (.xlsx, .xls, .csv) into an array of associative rows
     * keyed by normalized header names.
     *
     * @return array<int, array<string, string>>
     */
    public static function parseFile(string $filePath, ?string $originalExtension = null): array
    {
        if (! is_file($filePath) || ! is_readable($filePath)) {
            return [];
        }

        $content = file_get_contents($filePath);
        if ($content === false || $content === '') {
            return [];
        }

        $ext = strtolower((string) ($originalExtension ?: pathinfo($filePath, PATHINFO_EXTENSION)));

        // Detect ZIP/XLSX magic bytes "PK\x03\x04"
        if (str_starts_with($content, "PK\x03\x04") || $ext === 'xlsx') {
            $rawRows = self::parseXlsxBinary($content);
        } elseif (stripos($content, '<table') !== false) {
            $rawRows = self::parseHtmlTable($content);
        } elseif (stripos($content, '<Workbook') !== false || stripos($content, '<Row') !== false) {
            $rawRows = self::parseXmlSpreadsheet($content);
        } else {
            $rawRows = self::parseCsvContent($content);
        }

        return self::rowsToAssociative($rawRows);
    }

    /**
     * Parse raw 2D array (first row = headers) into associative rows.
     *
     * @param  array<int, array<int, string>>  $rawRows
     * @return array<int, array<string, string>>
     */
    public static function rowsToAssociative(array $rawRows): array
    {
        // Filter out completely empty rows
        $nonEmptyRows = array_values(array_filter($rawRows, function (array $row) {
            foreach ($row as $cell) {
                if (trim((string) $cell) !== '') {
                    return true;
                }
            }

            return false;
        }));

        if (count($nonEmptyRows) < 2) {
            return [];
        }

        $headerRow = $nonEmptyRows[0];
        $headers = [];
        foreach ($headerRow as $idx => $h) {
            $normalized = self::normalizeHeader((string) $h);
            $headers[$idx] = $normalized !== '' ? $normalized : 'col_'.$idx;
        }

        $result = [];
        $count = count($nonEmptyRows);
        for ($i = 1; $i < $count; $i++) {
            $row = $nonEmptyRows[$i];
            $assoc = [];
            $hasData = false;
            foreach ($headers as $colIdx => $key) {
                $val = isset($row[$colIdx]) ? trim((string) $row[$colIdx]) : '';
                if ($val !== '') {
                    $hasData = true;
                }
                $assoc[$key] = $val;
            }
            if ($hasData) {
                $assoc['_row_number'] = (string) ($i + 1);
                $result[] = $assoc;
            }
        }

        return $result;
    }

    public static function normalizeHeader(string $header): string
    {
        // Strip UTF-8 BOM if present
        $clean = preg_replace('/^\xEF\xBB\xBF/', '', $header) ?? $header;
        $clean = strtolower(trim($clean));
        $clean = preg_replace('/[^a-z0-9]+/', '_', $clean) ?? $clean;

        return trim($clean, '_');
    }

    /**
     * Parse an .xlsx binary buffer using pure PHP (Central Directory + gzinflate + SimpleXML).
     * Does NOT require ext-zip.
     *
     * @return array<int, array<int, string>>
     */
    public static function parseXlsxBinary(string $binary): array
    {
        $entries = self::extractZipEntries($binary);
        if (empty($entries)) {
            return [];
        }

        // 1. Parse sharedStrings.xml if available
        $sharedStrings = [];
        if (isset($entries['xl/sharedStrings.xml'])) {
            $sstXml = @simplexml_load_string($entries['xl/sharedStrings.xml']);
            if ($sstXml instanceof SimpleXMLElement) {
                foreach ($sstXml->si as $si) {
                    if (isset($si->t)) {
                        $sharedStrings[] = (string) $si->t;
                    } elseif (isset($si->r)) {
                        $text = '';
                        foreach ($si->r as $run) {
                            $text .= (string) $run->t;
                        }
                        $sharedStrings[] = $text;
                    } else {
                        $sharedStrings[] = '';
                    }
                }
            }
        }

        // 2. Find first worksheet XML
        $sheetXmlContent = $entries['xl/worksheets/sheet1.xml'] ?? null;
        if ($sheetXmlContent === null) {
            foreach ($entries as $name => $data) {
                if (str_starts_with($name, 'xl/worksheets/sheet') && str_ends_with($name, '.xml')) {
                    $sheetXmlContent = $data;
                    break;
                }
            }
        }

        if ($sheetXmlContent === null) {
            return [];
        }

        $sheetXml = @simplexml_load_string($sheetXmlContent);
        if (! $sheetXml instanceof SimpleXMLElement || ! isset($sheetXml->sheetData)) {
            return [];
        }

        $rows = [];
        foreach ($sheetXml->sheetData->row as $rowEl) {
            $rowCells = [];
            $maxColIndex = -1;
            $nextColIndex = 0;

            foreach ($rowEl->c as $c) {
                $cellRef = (string) ($c['r'] ?? '');
                $colIndex = $cellRef !== '' ? self::columnIndexFromCellRef($cellRef) : $nextColIndex;
                $nextColIndex = $colIndex + 1;
                if ($colIndex > $maxColIndex) {
                    $maxColIndex = $colIndex;
                }

                $type = (string) ($c['t'] ?? '');
                $val = '';

                if ($type === 's') {
                    $sstIdx = (int) ((string) $c->v);
                    $val = $sharedStrings[$sstIdx] ?? '';
                } elseif ($type === 'inlineStr') {
                    if (isset($c->is->t)) {
                        $val = (string) $c->is->t;
                    } elseif (isset($c->is->r)) {
                        foreach ($c->is->r as $run) {
                            $val .= (string) $run->t;
                        }
                    }
                } elseif ($type === 'str' || $type === 'b') {
                    $val = (string) $c->v;
                } else {
                    $val = isset($c->v) ? (string) $c->v : '';
                }

                $rowCells[$colIndex] = trim($val);
            }

            if ($maxColIndex >= 0) {
                $normalizedRow = [];
                for ($cIdx = 0; $cIdx <= $maxColIndex; $cIdx++) {
                    $normalizedRow[$cIdx] = $rowCells[$cIdx] ?? '';
                }
                $rows[] = $normalizedRow;
            }
        }

        return $rows;
    }

    /**
     * Extract files from a ZIP archive binary buffer using Central Directory headers or Local File headers.
     *
     * @return array<string, string>
     */
    private static function extractZipEntries(string $binary): array
    {
        $entries = [];
        $len = strlen($binary);

        // Locate End of Central Directory (EOCD) signature PK\x05\x06
        $eocdPos = strrpos($binary, "PK\x05\x06");
        if ($eocdPos !== false && $eocdPos + 22 <= $len) {
            $eocd = unpack('vdisk/vstartDisk/vnumEntriesDisk/vtotalEntries/VcdSize/VcdOffset', substr($binary, $eocdPos + 4, 16));
            if (is_array($eocd)) {
                $cdOffset = (int) $eocd['cdOffset'];
                $totalEntries = (int) $eocd['totalEntries'];
                $pos = $cdOffset;

                for ($i = 0; $i < $totalEntries && $pos + 46 <= $len; $i++) {
                    if (substr($binary, $pos, 4) !== "PK\x01\x02") {
                        break;
                    }

                    $cd = unpack(
                        'vverMade/vverNeed/vflags/vmethod/vmodTime/vmodDate/Vcrc/VcompSize/VuncompSize/vnameLen/vextraLen/vcommentLen/vdiskStart/vintAttr/VextAttr/VlocalOffset',
                        substr($binary, $pos + 4, 42)
                    );
                    if (! is_array($cd)) {
                        break;
                    }

                    $nameLen = (int) $cd['nameLen'];
                    $extraLen = (int) $cd['extraLen'];
                    $commentLen = (int) $cd['commentLen'];
                    $filename = substr($binary, $pos + 46, $nameLen);
                    $pos += 46 + $nameLen + $extraLen + $commentLen;

                    $localOffset = (int) $cd['localOffset'];
                    if ($localOffset + 30 > $len || substr($binary, $localOffset, 4) !== "PK\x03\x04") {
                        continue;
                    }

                    $local = unpack('vnameLen/vextraLen', substr($binary, $localOffset + 26, 4));
                    if (! is_array($local)) {
                        continue;
                    }

                    $dataStart = $localOffset + 30 + (int) $local['nameLen'] + (int) $local['extraLen'];
                    $compSize = (int) $cd['compSize'];
                    $method = (int) $cd['method'];

                    if ($dataStart + $compSize > $len) {
                        continue;
                    }

                    $rawData = substr($binary, $dataStart, $compSize);
                    if ($method === 0) {
                        $entries[$filename] = $rawData;
                    } elseif ($method === 8) {
                        $inflated = @gzinflate($rawData);
                        if ($inflated !== false) {
                            $entries[$filename] = $inflated;
                        }
                    }
                }
            }
        }

        return $entries;
    }

    private static function columnIndexFromCellRef(string $cellRef): int
    {
        if (! preg_match('/^([A-Z]+)/i', $cellRef, $matches)) {
            return 0;
        }
        $letters = strtoupper($matches[1]);
        $index = 0;
        $len = strlen($letters);
        for ($i = 0; $i < $len; $i++) {
            $index = $index * 26 + (ord($letters[$i]) - ord('A') + 1);
        }

        return max(0, $index - 1);
    }

    private static function columnLettersFromIndex(int $index): string
    {
        $n = $index + 1;
        $letters = '';
        while ($n > 0) {
            $rem = ($n - 1) % 26;
            $letters = chr(65 + $rem).$letters;
            $n = intdiv($n - 1, 26);
        }

        return $letters;
    }

    /**
     * Parse CSV / semicolon / tab-separated content.
     *
     * @return array<int, array<int, string>>
     */
    public static function parseCsvContent(string $content): array
    {
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content) ?? $content;
        $lines = preg_split('/\r\n|\r|\n/', trim($content)) ?: [];
        if (empty($lines)) {
            return [];
        }

        // Auto-detect delimiter from first non-empty line
        $firstLine = $lines[0];
        $commaCount = substr_count($firstLine, ',');
        $semiCount = substr_count($firstLine, ';');
        $tabCount = substr_count($firstLine, "\t");

        $delimiter = ',';
        if ($semiCount > $commaCount && $semiCount >= $tabCount) {
            $delimiter = ';';
        } elseif ($tabCount > $commaCount && $tabCount > $semiCount) {
            $delimiter = "\t";
        }

        $rows = [];
        $stream = fopen('php://temp', 'r+');
        if ($stream === false) {
            return [];
        }
        fwrite($stream, $content);
        rewind($stream);

        while (($row = fgetcsv($stream, 0, $delimiter, '"', '\\')) !== false) {
            if ($row === [null]) {
                continue;
            }
            $rows[] = array_map(fn ($v) => trim((string) $v), $row);
        }
        fclose($stream);

        return $rows;
    }

    /**
     * Parse HTML table-based .xls content.
     *
     * @return array<int, array<int, string>>
     */
    private static function parseHtmlTable(string $html): array
    {
        $rows = [];
        if (preg_match_all('/<tr[^>]*>(.*?)<\/tr>/is', $html, $trMatches)) {
            foreach ($trMatches[1] as $trHtml) {
                if (preg_match_all('/<t[dh][^>]*>(.*?)<\/t[dh]>/is', $trHtml, $tdMatches)) {
                    $row = [];
                    foreach ($tdMatches[1] as $cellHtml) {
                        $row[] = trim(html_entity_decode(strip_tags($cellHtml), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
                    }
                    $rows[] = $row;
                }
            }
        }

        return $rows;
    }

    /**
     * Parse XML Spreadsheet 2003 (.xls) content.
     *
     * @return array<int, array<int, string>>
     */
    private static function parseXmlSpreadsheet(string $xmlContent): array
    {
        $rows = [];
        if (preg_match_all('/<Row[^>]*>(.*?)<\/Row>/is', $xmlContent, $rowMatches)) {
            foreach ($rowMatches[1] as $rowXml) {
                if (preg_match_all('/<Data[^>]*>(.*?)<\/Data>/is', $rowXml, $dataMatches)) {
                    $row = [];
                    foreach ($dataMatches[1] as $cellText) {
                        $row[] = trim(html_entity_decode(strip_tags($cellText), ENT_QUOTES | ENT_XML1, 'UTF-8'));
                    }
                    $rows[] = $row;
                }
            }
        }

        return $rows;
    }

    /**
     * Generate a genuine .xlsx binary file in pure PHP (without requiring ext-zip).
     *
     * @param  array<int, string>  $headers
     * @param  array<int, array<int, string|int|float>>  $rows
     */
    public static function generateXlsx(array $headers, array $rows, string $sheetName = 'Sheet1'): string
    {
        $allRows = array_merge([$headers], $rows);

        $sheetRowsXml = '';
        foreach ($allRows as $rIdx => $row) {
            $rowNum = $rIdx + 1;
            $sheetRowsXml .= '<row r="'.$rowNum.'">';
            foreach (array_values($row) as $cIdx => $val) {
                $colRef = self::columnLettersFromIndex($cIdx).$rowNum;
                if (is_int($val) || is_float($val) || (is_string($val) && preg_match('/^-?\d+(\.\d+)?$/', $val) && ! str_starts_with($val, '0'))) {
                    $sheetRowsXml .= '<c r="'.$colRef.'" t="n"><v>'.$val.'</v></c>';
                } else {
                    $escaped = htmlspecialchars((string) $val, ENT_XML1 | ENT_QUOTES, 'UTF-8');
                    $sheetRowsXml .= '<c r="'.$colRef.'" t="inlineStr"><is><t>'.$escaped.'</t></is></c>';
                }
            }
            $sheetRowsXml .= '</row>';
        }

        $safeSheetName = htmlspecialchars($sheetName, ENT_XML1 | ENT_QUOTES, 'UTF-8');

        $files = [
            '[Content_Types].xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                .'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                .'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                .'<Default Extension="xml" ContentType="application/xml"/>'
                .'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
                .'<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
                .'</Types>',
            '_rels/.rels' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                .'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
                .'</Relationships>',
            'xl/workbook.xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                .'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
                .'<sheets><sheet name="'.$safeSheetName.'" sheetId="1" r:id="rId1"/></sheets>'
                .'</workbook>',
            'xl/_rels/workbook.xml.rels' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                .'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
                .'</Relationships>',
            'xl/worksheets/sheet1.xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                .'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
                .'<sheetData>'.$sheetRowsXml.'</sheetData>'
                .'</worksheet>',
        ];

        return self::buildZipBinary($files);
    }

    /**
     * Build a standard ZIP binary archive from an associative array of filename => content.
     *
     * @param  array<string, string>  $files
     */
    private static function buildZipBinary(array $files): string
    {
        $localParts = '';
        $centralParts = '';
        $offset = 0;
        $count = 0;

        foreach ($files as $name => $content) {
            $uncompSize = strlen($content);
            $crc = crc32($content);
            $compressed = gzdeflate($content, 6);
            if ($compressed === false) {
                $compressed = $content;
                $method = 0;
            } else {
                $method = 8;
            }
            $compSize = strlen($compressed);
            $nameLen = strlen($name);

            $localHeader = "PK\x03\x04".pack(
                'vvvvvVVVvv',
                20,         // version needed
                0,          // flags
                $method,    // compression method
                0,          // mod time
                0,          // mod date
                $crc,
                $compSize,
                $uncompSize,
                $nameLen,
                0           // extra len
            ).$name;

            $localParts .= $localHeader.$compressed;

            $centralHeader = "PK\x01\x02".pack(
                'vvvvvvVVVvvvvvVV',
                20,         // version made by
                20,         // version needed
                0,          // flags
                $method,    // method
                0,          // mod time
                0,          // mod date
                $crc,
                $compSize,
                $uncompSize,
                $nameLen,
                0,          // extra len
                0,          // comment len
                0,          // disk start
                0,          // internal attr
                0,          // external attr
                $offset     // local header offset
            ).$name;

            $centralParts .= $centralHeader;
            $offset += strlen($localHeader) + $compSize;
            $count++;
        }

        $cdSize = strlen($centralParts);
        $eocd = "PK\x05\x06".pack('vvvvVVv', 0, 0, $count, $count, $cdSize, $offset, 0);

        return $localParts.$centralParts.$eocd;
    }
}
