import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import ExcelJS from 'exceljs';

export interface StrategyReportData {
  client: string;
  objective: string;
  lead: string;
  generatedAt: string;
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  tows: {
    so: string;
    wo: string;
    st: string;
    wt: string;
  };
  radar: {
    innovation: number;
    market: number;
    agility: number;
    resilience: number;
    brand: number;
    talent: number;
  };
  radarImageDataUrl?: string;
  radarImageAspectRatio?: number;
  synthesis: string;
  posture: string;
  risk: string;
}

declare global {
  interface Window {
    strategyExporters?: {
      exportWordReport: (report: StrategyReportData) => Promise<void>;
      exportExcelReport: (report: StrategyReportData) => Promise<void>;
      exportTextReport: (report: StrategyReportData) => void;
    };
  }
}

function getSafeFilename(client: string, extension: string): string {
  const cleaned = (client || 'Strategic_Assessment')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${cleaned || 'Strategic_Assessment'}_Strategy_Report.${extension}`;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array | null {
  const parts = dataUrl.split(',');
  if (parts.length !== 2) return null;
  const binaryString = atob(parts[1]);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function createMultilineParagraphs(
  text: string,
  options: { color?: string; size?: number; italics?: boolean; spacingAfter?: number } = {}
): Paragraph[] {
  const lines = (text || 'N/A').split(/\r?\n/);
  return lines.map(
    (line, idx) =>
      new Paragraph({
        spacing: {
          after: idx === lines.length - 1 ? (options.spacingAfter ?? 80) : 40,
          line: 280,
        },
        children: [
          new TextRun({
            text: line || ' ',
            color: options.color ?? '334155',
            size: options.size ?? 20,
            italics: options.italics,
            font: 'Calibri',
          }),
        ],
      })
  );
}

function createSectionHeading(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 140 },
    border: {
      bottom: {
        color: '0A2342',
        space: 4,
        style: BorderStyle.SINGLE,
        size: 12,
      },
    },
    children: [
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        color: '0A2342',
        size: 26,
        font: 'Calibri',
      }),
    ],
  });
}

function createSwotQuadrantCell(
  title: string,
  items: string[],
  accentHex: string,
  fillHex: string
): TableCell {
  const listItems = items.length ? items : ['N/A'];

  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: fillHex },
    margins: { top: 140, bottom: 140, left: 180, right: 180 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 18, color: accentHex },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
    },
    children: [
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: title.toUpperCase(),
            bold: true,
            color: accentHex,
            size: 22,
            font: 'Calibri',
          }),
        ],
      }),
      ...listItems.map(
        (item) =>
          new Paragraph({
            spacing: { after: 60, line: 260 },
            children: [
              new TextRun({
                text: `•  ${item}`,
                color: '1E293B',
                size: 20,
                font: 'Calibri',
              }),
            ],
          })
      ),
    ],
  });
}

function createTowsQuadrantCell(
  title: string,
  subtitle: string,
  content: string,
  accentHex: string,
  fillHex: string
): TableCell {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: fillHex },
    margins: { top: 140, bottom: 140, left: 180, right: 180 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 12, color: accentHex },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
    },
    children: [
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: title,
            bold: true,
            color: accentHex,
            size: 22,
            font: 'Calibri',
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: subtitle,
            italics: true,
            color: '64748B',
            size: 17,
            font: 'Calibri',
          }),
        ],
      }),
      ...createMultilineParagraphs(content || 'N/A', { color: '1E293B', size: 20 }),
    ],
  });
}

function getRadarEntries(radar: StrategyReportData['radar']): Array<{ label: string; score: number }> {
  return [
    { label: 'Innovation', score: radar.innovation },
    { label: 'Market Penetration', score: radar.market },
    { label: 'Operational Agility', score: radar.agility },
    { label: 'Financial Resilience', score: radar.resilience },
    { label: 'Brand Equity', score: radar.brand },
    { label: 'Talent Density', score: radar.talent },
  ];
}

export async function exportWordReport(report: StrategyReportData): Promise<void> {
  const radarEntries = getRadarEntries(report.radar);
  const avgScore = Math.round(
    radarEntries.reduce((sum, item) => sum + item.score, 0) / radarEntries.length
  );

  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      [
        { label: 'Client / Project', value: report.client },
        { label: 'Lead Consultant', value: report.lead },
      ],
      [
        { label: 'Strategic Objective', value: report.objective },
        { label: 'Report Date', value: report.generatedAt },
      ],
    ].map(
      (pair) =>
        new TableRow({
          children: pair.map(
            (cell) =>
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
                margins: { top: 100, bottom: 100, left: 150, right: 150 },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                  left: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                  right: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                },
                children: [
                  new Paragraph({
                    spacing: { after: 40 },
                    children: [
                      new TextRun({
                        text: cell.label.toUpperCase(),
                        bold: true,
                        color: '64748B',
                        size: 16,
                        font: 'Calibri',
                      }),
                    ],
                  }),
                  ...createMultilineParagraphs(cell.value, {
                    color: '0F172A',
                    size: 21,
                    spacingAfter: 0,
                  }),
                ],
              })
          ),
        })
    ),
  });

  const swotTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createSwotQuadrantCell('Strengths', report.swot.strengths, '059669', 'ECFDF5'),
          createSwotQuadrantCell('Weaknesses', report.swot.weaknesses, 'E11D48', 'FFF1F2'),
        ],
      }),
      new TableRow({
        children: [
          createSwotQuadrantCell('Opportunities', report.swot.opportunities, '2563EB', 'EFF6FF'),
          createSwotQuadrantCell('Threats', report.swot.threats, 'D97706', 'FFFBEB'),
        ],
      }),
    ],
  });

  const radarTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: ['Strategic Dimension', 'Score (0 - 100)'].map(
          (header, idx) =>
            new TableCell({
              width: { size: idx === 0 ? 65 : 35, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: '0A2342' },
              margins: { top: 90, bottom: 90, left: 150, right: 150 },
              children: [
                new Paragraph({
                  alignment: idx === 1 ? AlignmentType.RIGHT : AlignmentType.LEFT,
                  children: [
                    new TextRun({
                      text: header,
                      bold: true,
                      color: 'FFFFFF',
                      size: 20,
                      font: 'Calibri',
                    }),
                  ],
                }),
              ],
            })
        ),
      }),
      ...radarEntries.map(
        (entry, rowIdx) =>
          new TableRow({
            children: [
              new TableCell({
                shading: { type: ShadingType.CLEAR, fill: rowIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC' },
                margins: { top: 80, bottom: 80, left: 150, right: 150 },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: entry.label,
                        color: '1E293B',
                        size: 20,
                        font: 'Calibri',
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                shading: { type: ShadingType.CLEAR, fill: rowIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC' },
                margins: { top: 80, bottom: 80, left: 150, right: 150 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: `${entry.score} / 100`,
                        bold: true,
                        color: '1D4ED8',
                        size: 20,
                        font: 'Calibri',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
      ),
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: 'EFF6FF' },
            margins: { top: 90, bottom: 90, left: 150, right: 150 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Overall Average Score',
                    bold: true,
                    color: '0A2342',
                    size: 20,
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: 'EFF6FF' },
            margins: { top: 90, bottom: 90, left: 150, right: 150 },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${avgScore} / 100`,
                    bold: true,
                    color: '0A2342',
                    size: 20,
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const radarChartChildren: Paragraph[] = [];
  if (report.radarImageDataUrl) {
    const imageBytes = dataUrlToUint8Array(report.radarImageDataUrl);
    if (imageBytes) {
      const aspectRatio = report.radarImageAspectRatio && report.radarImageAspectRatio > 0
        ? report.radarImageAspectRatio
        : 1.5;
      const width = 420;
      const height = Math.round(width / aspectRatio);
      radarChartChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 160, after: 160 },
          children: [
            new ImageRun({
              type: 'png',
              data: imageBytes,
              transformation: { width, height },
            }),
          ],
        })
      );
    }
  }

  const towsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createTowsQuadrantCell(
            'SO Strategies (Maxi-Maxi)',
            'Leverage strengths to maximize opportunities.',
            report.tows.so,
            '059669',
            'ECFDF5'
          ),
          createTowsQuadrantCell(
            'WO Strategies (Mini-Maxi)',
            'Improve weaknesses by taking advantage of opportunities.',
            report.tows.wo,
            '2563EB',
            'EFF6FF'
          ),
        ],
      }),
      new TableRow({
        children: [
          createTowsQuadrantCell(
            'ST Strategies (Maxi-Mini)',
            'Use strengths to minimize or avoid threats.',
            report.tows.st,
            'D97706',
            'FFFBEB'
          ),
          createTowsQuadrantCell(
            'WT Strategies (Mini-Mini)',
            'Defensive tactics to reduce weaknesses and avoid threats.',
            report.tows.wt,
            'E11D48',
            'FFF1F2'
          ),
        ],
      }),
    ],
  });

  const executiveSummaryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            shading: { type: ShadingType.CLEAR, fill: '0F172A' },
            margins: { top: 150, bottom: 150, left: 180, right: 180 },
            children: [
              new Paragraph({
                spacing: { after: 80 },
                children: [
                  new TextRun({
                    text: 'EXECUTIVE SYNTHESIS & KEY RECOMMENDATIONS',
                    bold: true,
                    color: '93C5FD',
                    size: 18,
                    font: 'Calibri',
                  }),
                ],
              }),
              ...createMultilineParagraphs(report.synthesis, {
                color: 'F8FAFC',
                size: 21,
                spacingAfter: 0,
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
            margins: { top: 140, bottom: 140, left: 180, right: 180 },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: 'STRATEGIC POSTURE',
                    bold: true,
                    color: '1D4ED8',
                    size: 18,
                    font: 'Calibri',
                  }),
                ],
              }),
              ...createMultilineParagraphs(report.posture, {
                color: '0F172A',
                size: 20,
                spacingAfter: 0,
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
            margins: { top: 140, bottom: 140, left: 180, right: 180 },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: 'RISK PROFILE',
                    bold: true,
                    color: 'D97706',
                    size: 18,
                    font: 'Calibri',
                  }),
                ],
              }),
              ...createMultilineParagraphs(report.risk, {
                color: '0F172A',
                size: 20,
                spacingAfter: 0,
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 900,
              right: 900,
              bottom: 900,
              left: 900,
            },
          },
        },
        children: [
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: 'PRINCIPAL STRATEGIC ASSESSMENT REPORT',
                bold: true,
                color: '0A2342',
                size: 36,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 220 },
            children: [
              new TextRun({
                text: `${report.client} — ${report.objective}`,
                color: '475569',
                size: 22,
                font: 'Calibri',
              }),
            ],
          }),
          metaTable,
          createSectionHeading('1. Strategic SWOT Analysis'),
          swotTable,
          createSectionHeading('2. Strategic Positioning Radar'),
          radarTable,
          ...radarChartChildren,
          createSectionHeading('3. TOWS Strategic Options Matrix'),
          towsTable,
          createSectionHeading('4. Executive Synthesis & Governance'),
          executiveSummaryTable,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, getSafeFilename(report.client, 'docx'));
}

// ExcelJS helpers for visually elegant, readable spreadsheets
function estimateWrappedRowHeight(
  entries: Array<{ text: string; colWidth: number }>,
  lineHeight = 16,
  padding = 12,
  minHeight = 24
): number {
  let maxLines = 1;
  for (const { text, colWidth } of entries) {
    const usableChars = Math.max(12, colWidth - 3);
    const paragraphs = String(text || '').split(/\r?\n/);
    let totalLines = 0;
    for (const para of paragraphs) {
      totalLines += Math.max(1, Math.ceil(para.length / usableChars));
    }
    if (totalLines > maxLines) {
      maxLines = totalLines;
    }
  }
  return Math.max(minHeight, maxLines * lineHeight + padding);
}

function getThinBorder(colorArgb = 'FFE2E8F0'): Partial<ExcelJS.Borders> {
  const edge: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: colorArgb } };
  return { top: edge, left: edge, bottom: edge, right: edge };
}

function applyBannerStyle(
  sheet: ExcelJS.Worksheet,
  titleRange: string,
  subtitleRange: string,
  titleText: string,
  subtitleText: string,
  titleRowNum: number,
  subtitleRowNum: number
): void {
  sheet.mergeCells(titleRange);
  const titleCell = sheet.getCell(titleRange.split(':')[0]);
  titleCell.value = titleText;
  titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A2342' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(titleRowNum).height = 34;

  sheet.mergeCells(subtitleRange);
  const subCell = sheet.getCell(subtitleRange.split(':')[0]);
  subCell.value = subtitleText;
  subCell.font = { name: 'Calibri', size: 10.5, italic: true, color: { argb: 'FF334155' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
  subCell.border = { bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } } };
  sheet.getRow(subtitleRowNum).height = 24;
}

function styleExcelRange(
  sheet: ExcelJS.Worksheet,
  startCol: number,
  endCol: number,
  rowNum: number,
  options: {
    fillArgb?: string;
    border?: Partial<ExcelJS.Borders>;
  }
): void {
  for (let c = startCol; c <= endCol; c++) {
    const cell = sheet.getRow(rowNum).getCell(c);
    if (options.fillArgb) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: options.fillArgb } };
    }
    if (options.border) {
      cell.border = options.border;
    }
  }
}

export async function exportExcelReport(report: StrategyReportData): Promise<void> {
  const ExcelConstructor =
    (ExcelJS as unknown as { default?: typeof ExcelJS }).default ?? ExcelJS;
  const wb = new ExcelConstructor.Workbook();
  wb.creator = report.lead || 'Principal Strategy Dashboard';
  wb.created = new Date();

  const radarEntries = getRadarEntries(report.radar);
  const avgScore = Math.round(
    radarEntries.reduce((sum, entry) => sum + entry.score, 0) / radarEntries.length
  );

  // =========================================================================
  // Sheet 1: Executive Summary
  // =========================================================================
  const summarySheet = wb.addWorksheet('Executive Summary', {
    views: [{ showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  });
  summarySheet.columns = [
    { width: 3 },
    { width: 26 },
    { width: 34 },
    { width: 26 },
    { width: 34 },
    { width: 3 },
  ];
  summarySheet.getRow(1).height = 12;

  applyBannerStyle(
    summarySheet,
    'B2:E2',
    'B3:E3',
    'PRINCIPAL STRATEGIC ASSESSMENT REPORT',
    `${report.client}  |  Generated ${report.generatedAt}`,
    2,
    3
  );
  summarySheet.getRow(4).height = 12;

  // Section: Project Metadata
  summarySheet.mergeCells('B5:E5');
  const metaHdr = summarySheet.getCell('B5');
  metaHdr.value = 'PROJECT OVERVIEW';
  metaHdr.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0A2342' } };
  metaHdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  metaHdr.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  styleExcelRange(summarySheet, 2, 5, 5, {
    fillArgb: 'FFE2E8F0',
    border: getThinBorder('FFCBD5E1'),
  });
  summarySheet.getRow(5).height = 24;

  const metaPairs: Array<[string, string, string, string]> = [
    ['Client / Project', report.client, 'Lead Consultant', report.lead],
    ['Strategic Objective', report.objective, 'Report Date', report.generatedAt],
  ];

  metaPairs.forEach((pair, idx) => {
    const rowNum = 6 + idx;
    const row = summarySheet.getRow(rowNum);
    row.getCell(2).value = pair[0];
    row.getCell(3).value = pair[1];
    row.getCell(4).value = pair[2];
    row.getCell(5).value = pair[3];

    [2, 4].forEach((col) => {
      const c = row.getCell(col);
      c.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF475569' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      c.alignment = { vertical: 'top', horizontal: 'left', indent: 1, wrapText: true };
      c.border = getThinBorder('FFE2E8F0');
    });

    [3, 5].forEach((col) => {
      const c = row.getCell(col);
      c.font = { name: 'Calibri', size: 10.5, bold: col === 3 && idx === 0, color: { argb: 'FF0F172A' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      c.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      c.border = getThinBorder('FFE2E8F0');
    });

    row.height = estimateWrappedRowHeight(
      [
        { text: pair[1], colWidth: 34 },
        { text: pair[3], colWidth: 34 },
      ],
      16,
      12,
      26
    );
  });

  summarySheet.getRow(8).height = 14;

  // Section: Executive Synthesis
  summarySheet.mergeCells('B9:E9');
  const synHdr = summarySheet.getCell('B9');
  synHdr.value = 'EXECUTIVE SYNTHESIS & KEY RECOMMENDATIONS';
  synHdr.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF93C5FD' } };
  styleExcelRange(summarySheet, 2, 5, 9, {
    fillArgb: 'FF0F172A',
    border: getThinBorder('FF0F172A'),
  });
  synHdr.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  summarySheet.getRow(9).height = 26;

  summarySheet.mergeCells('B10:E10');
  const synBody = summarySheet.getCell('B10');
  synBody.value = report.synthesis || 'N/A';
  synBody.font = { name: 'Calibri', size: 11, color: { argb: 'FF1E293B' } };
  synBody.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };
  styleExcelRange(summarySheet, 2, 5, 10, {
    fillArgb: 'FFF8FAFC',
    border: getThinBorder('FFCBD5E1'),
  });
  summarySheet.getRow(10).height = estimateWrappedRowHeight(
    [{ text: report.synthesis || 'N/A', colWidth: 112 }],
    17,
    18,
    56
  );

  summarySheet.getRow(11).height = 14;

  // Section: Posture & Risk Side-by-Side Cards
  summarySheet.mergeCells('B12:C12');
  summarySheet.mergeCells('D12:E12');
  const posHdr = summarySheet.getCell('B12');
  posHdr.value = 'STRATEGIC POSTURE';
  posHdr.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF1E40AF' } };
  posHdr.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  styleExcelRange(summarySheet, 2, 3, 12, {
    fillArgb: 'FFDBEAFE',
    border: { top: { style: 'medium', color: { argb: 'FF2563EB' } }, left: { style: 'thin', color: { argb: 'FFBFDBFE' } }, right: { style: 'thin', color: { argb: 'FFBFDBFE' } } },
  });

  const riskHdr = summarySheet.getCell('D12');
  riskHdr.value = 'RISK PROFILE';
  riskHdr.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF92400E' } };
  riskHdr.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  styleExcelRange(summarySheet, 4, 5, 12, {
    fillArgb: 'FFFEF3C7',
    border: { top: { style: 'medium', color: { argb: 'FFD97706' } }, left: { style: 'thin', color: { argb: 'FFFDE68A' } }, right: { style: 'thin', color: { argb: 'FFFDE68A' } } },
  });
  summarySheet.getRow(12).height = 24;

  summarySheet.mergeCells('B13:C13');
  summarySheet.mergeCells('D13:E13');
  const posBody = summarySheet.getCell('B13');
  posBody.value = report.posture || 'N/A';
  posBody.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF0F172A' } };
  posBody.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };
  styleExcelRange(summarySheet, 2, 3, 13, {
    fillArgb: 'FFFFFFFF',
    border: getThinBorder('FFBFDBFE'),
  });

  const riskBody = summarySheet.getCell('D13');
  riskBody.value = report.risk || 'N/A';
  riskBody.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF0F172A' } };
  riskBody.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };
  styleExcelRange(summarySheet, 4, 5, 13, {
    fillArgb: 'FFFFFFFF',
    border: getThinBorder('FFFDE68A'),
  });
  summarySheet.getRow(13).height = estimateWrappedRowHeight(
    [
      { text: report.posture || 'N/A', colWidth: 58 },
      { text: report.risk || 'N/A', colWidth: 58 },
    ],
    16,
    14,
    38
  );

  summarySheet.getRow(14).height = 14;

  // Section: Assessment Snapshot
  summarySheet.mergeCells('B15:E15');
  const snapHdr = summarySheet.getCell('B15');
  snapHdr.value = 'ASSESSMENT SNAPSHOT';
  snapHdr.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
  snapHdr.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  styleExcelRange(summarySheet, 2, 5, 15, {
    fillArgb: 'FF1E293B',
    border: getThinBorder('FF1E293B'),
  });
  summarySheet.getRow(15).height = 24;

  const snapshotRows: Array<{ label: string; value: number | { formula: string; result: number }; accent: string }> = [
    { label: 'Strengths Identified', value: report.swot.strengths.length, accent: 'FF059669' },
    { label: 'Weaknesses Identified', value: report.swot.weaknesses.length, accent: 'FFE11D48' },
    { label: 'Opportunities Identified', value: report.swot.opportunities.length, accent: 'FF2563EB' },
    { label: 'Threats Identified', value: report.swot.threats.length, accent: 'FFD97706' },
    {
      label: 'Average Positioning Radar Score (out of 100)',
      value: { formula: "ROUND(AVERAGE('Positioning Radar'!B5:B10), 1)", result: avgScore },
      accent: 'FF0A2342',
    },
  ];

  snapshotRows.forEach((item, idx) => {
    const rowNum = 16 + idx;
    summarySheet.mergeCells(`B${rowNum}:D${rowNum}`);
    const labelCell = summarySheet.getCell(`B${rowNum}`);
    labelCell.value = item.label;
    labelCell.font = {
      name: 'Calibri',
      size: 10.5,
      bold: idx === snapshotRows.length - 1,
      color: { argb: 'FF1E293B' },
    };
    labelCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    const valCell = summarySheet.getCell(`E${rowNum}`);
    valCell.value = item.value;
    valCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: item.accent } };
    valCell.alignment = { vertical: 'middle', horizontal: 'right' };
    valCell.numFmt = idx === snapshotRows.length - 1 ? '0.0' : '0';

    const rowBg = idx === snapshotRows.length - 1 ? 'FFEFF6FF' : idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
    styleExcelRange(summarySheet, 2, 5, rowNum, {
      fillArgb: rowBg,
      border: getThinBorder('FFE2E8F0'),
    });
    summarySheet.getRow(rowNum).height = 22;
  });

  // =========================================================================
  // Sheet 2: SWOT Matrix
  // =========================================================================
  const swotSheet = wb.addWorksheet('SWOT Matrix', {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: true }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  swotSheet.columns = [
    { width: 38 },
    { width: 38 },
    { width: 38 },
    { width: 38 },
  ];

  applyBannerStyle(
    swotSheet,
    'A1:D1',
    'A2:D2',
    `STRATEGIC SWOT MATRIX — ${report.client.toUpperCase()}`,
    `Strategic Objective: ${report.objective}`,
    1,
    2
  );
  swotSheet.getRow(3).height = 10;

  const swotCols = [
    { title: 'STRENGTHS (Internal +)', items: report.swot.strengths, hdrFill: 'FF059669', rowFill: 'FFECFDF5', border: 'FFA7F3D0' },
    { title: 'WEAKNESSES (Internal -)', items: report.swot.weaknesses, hdrFill: 'FFE11D48', rowFill: 'FFFFF1F2', border: 'FFFECDD3' },
    { title: 'OPPORTUNITIES (External +)', items: report.swot.opportunities, hdrFill: 'FF2563EB', rowFill: 'FFEFF6FF', border: 'FFBFDBFE' },
    { title: 'THREATS (External -)', items: report.swot.threats, hdrFill: 'FFD97706', rowFill: 'FFFFFBEB', border: 'FFFDE68A' },
  ];

  const swotHeaderRow = swotSheet.getRow(4);
  swotHeaderRow.height = 28;
  swotCols.forEach((col, i) => {
    const cell = swotHeaderRow.getCell(i + 1);
    cell.value = col.title;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: col.hdrFill } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    cell.border = getThinBorder(col.hdrFill);
  });

  const maxSwotLen = Math.max(
    report.swot.strengths.length,
    report.swot.weaknesses.length,
    report.swot.opportunities.length,
    report.swot.threats.length,
    1
  );

  for (let i = 0; i < maxSwotLen; i++) {
    const rowNum = 5 + i;
    const row = swotSheet.getRow(rowNum);
    const rowTexts: Array<{ text: string; colWidth: number }> = [];

    swotCols.forEach((col, cIdx) => {
      const rawText = col.items[i];
      const formattedText = rawText ? `${i + 1}. ${rawText}` : '';
      const cell = row.getCell(cIdx + 1);
      cell.value = formattedText;
      cell.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF1E293B' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: i % 2 === 0 ? col.rowFill : 'FFFFFFFF' },
      };
      cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };
      cell.border = getThinBorder(col.border);
      rowTexts.push({ text: formattedText, colWidth: 36 });
    });

    row.height = estimateWrappedRowHeight(rowTexts, 16, 12, 26);
  }

  // =========================================================================
  // Sheet 3: TOWS Matrix
  // =========================================================================
  const towsSheet = wb.addWorksheet('TOWS Matrix', {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: true }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  });
  towsSheet.columns = [
    { width: 28 },
    { width: 42 },
    { width: 72 },
  ];

  applyBannerStyle(
    towsSheet,
    'A1:C1',
    'A2:C2',
    `TOWS STRATEGIC OPTIONS MATRIX — ${report.client.toUpperCase()}`,
    `Strategic Objective: ${report.objective}`,
    1,
    2
  );
  towsSheet.getRow(3).height = 10;

  const towsHeader = towsSheet.getRow(4);
  towsHeader.height = 28;
  ['Quadrant', 'Strategic Focus', 'Recommended Strategy'].forEach((heading, idx) => {
    const cell = towsHeader.getCell(idx + 1);
    cell.value = heading;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    cell.border = getThinBorder('FF1E293B');
  });

  const towsItems = [
    {
      quadrant: 'SO Strategies (Maxi-Maxi)',
      focus: 'Leverage internal strengths to maximize external opportunities.',
      strategy: report.tows.so || 'N/A',
      badgeFill: 'FFECFDF5',
      badgeColor: 'FF047857',
      borderColor: 'FFA7F3D0',
    },
    {
      quadrant: 'WO Strategies (Mini-Maxi)',
      focus: 'Overcome internal weaknesses by capitalizing on external opportunities.',
      strategy: report.tows.wo || 'N/A',
      badgeFill: 'FFEFF6FF',
      badgeColor: 'FF1D4ED8',
      borderColor: 'FFBFDBFE',
    },
    {
      quadrant: 'ST Strategies (Maxi-Mini)',
      focus: 'Use internal strengths to minimize or deflect external threats.',
      strategy: report.tows.st || 'N/A',
      badgeFill: 'FFFFFBEB',
      badgeColor: 'FFB45309',
      borderColor: 'FFFDE68A',
    },
    {
      quadrant: 'WT Strategies (Mini-Mini)',
      focus: 'Defensive tactics to minimize weaknesses and avoid external threats.',
      strategy: report.tows.wt || 'N/A',
      badgeFill: 'FFFFF1F2',
      badgeColor: 'FFBE123C',
      borderColor: 'FFFECDD3',
    },
  ];

  towsItems.forEach((item, idx) => {
    const rowNum = 5 + idx;
    const row = towsSheet.getRow(rowNum);

    const qCell = row.getCell(1);
    qCell.value = item.quadrant;
    qCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: item.badgeColor } };
    qCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.badgeFill } };
    qCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };
    qCell.border = getThinBorder(item.borderColor);

    const fCell = row.getCell(2);
    fCell.value = item.focus;
    fCell.font = { name: 'Calibri', size: 10.5, italic: true, color: { argb: 'FF475569' } };
    fCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC' } };
    fCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };
    fCell.border = getThinBorder('FFE2E8F0');

    const sCell = row.getCell(3);
    sCell.value = item.strategy;
    sCell.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF0F172A' } };
    sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC' } };
    sCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };
    sCell.border = getThinBorder('FFE2E8F0');

    row.height = estimateWrappedRowHeight(
      [
        { text: item.quadrant, colWidth: 26 },
        { text: item.focus, colWidth: 40 },
        { text: item.strategy, colWidth: 70 },
      ],
      16,
      16,
      44
    );
  });

  // =========================================================================
  // Sheet 4: Positioning Radar
  // =========================================================================
  const radarSheet = wb.addWorksheet('Positioning Radar', {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: true }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  });
  radarSheet.columns = [
    { width: 32 },
    { width: 18 },
    { width: 16 },
    { width: 22 },
  ];

  applyBannerStyle(
    radarSheet,
    'A1:D1',
    'A2:D2',
    `STRATEGIC POSITIONING RADAR — ${report.client.toUpperCase()}`,
    'Six-axis strategic capability assessment (0 - 100 scale)',
    1,
    2
  );
  radarSheet.getRow(3).height = 10;

  const radarHeader = radarSheet.getRow(4);
  radarHeader.height = 28;
  ['Dimension', 'Score', 'Max Scale', 'Rating Tier'].forEach((heading, idx) => {
    const cell = radarHeader.getCell(idx + 1);
    cell.value = heading;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: idx === 1 || idx === 2 ? 'right' : idx === 3 ? 'center' : 'left',
      indent: idx === 0 ? 1 : 0,
    };
    cell.border = getThinBorder('FF1E293B');
  });

  radarEntries.forEach((entry, idx) => {
    const rowNum = 5 + idx;
    const row = radarSheet.getRow(rowNum);
    row.height = 24;
    const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';

    const dimCell = row.getCell(1);
    dimCell.value = entry.label;
    dimCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF1E293B' } };
    dimCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    dimCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    dimCell.border = getThinBorder('FFE2E8F0');

    const scoreCell = row.getCell(2);
    scoreCell.value = entry.score;
    scoreCell.numFmt = '0';
    scoreCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1D4ED8' } };
    scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    scoreCell.alignment = { vertical: 'middle', horizontal: 'right' };
    scoreCell.border = getThinBorder('FFE2E8F0');

    const maxCell = row.getCell(3);
    maxCell.value = 100;
    maxCell.numFmt = '0';
    maxCell.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF64748B' } };
    maxCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    maxCell.alignment = { vertical: 'middle', horizontal: 'right' };
    maxCell.border = getThinBorder('FFE2E8F0');

    const tier =
      entry.score >= 75
        ? { text: 'Leading', fill: 'FFECFDF5', color: 'FF047857' }
        : entry.score >= 50
          ? { text: 'Competitive', fill: 'FFEFF6FF', color: 'FF1D4ED8' }
          : entry.score >= 25
            ? { text: 'Developing', fill: 'FFFFFBEB', color: 'FFB45309' }
            : { text: 'Foundational', fill: 'FFFFF1F2', color: 'FFBE123C' };

    const tierCell = row.getCell(4);
    tierCell.value = tier.text;
    tierCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: tier.color } };
    tierCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tier.fill } };
    tierCell.alignment = { vertical: 'middle', horizontal: 'center' };
    tierCell.border = getThinBorder('FFE2E8F0');
  });

  // Summary average row
  const avgRow = radarSheet.getRow(11);
  avgRow.height = 26;
  avgRow.getCell(1).value = 'Overall Average Score';
  avgRow.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0A2342' } };
  avgRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  avgRow.getCell(2).value = { formula: 'ROUND(AVERAGE(B5:B10), 1)', result: avgScore };
  avgRow.getCell(2).numFmt = '0.0';
  avgRow.getCell(2).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0A2342' } };
  avgRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'right' };

  avgRow.getCell(3).value = 100;
  avgRow.getCell(3).numFmt = '0';
  avgRow.getCell(3).font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF475569' } };
  avgRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };

  avgRow.getCell(4).value =
    avgScore >= 75 ? 'Leading' : avgScore >= 50 ? 'Competitive' : avgScore >= 25 ? 'Developing' : 'Foundational';
  avgRow.getCell(4).font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0A2342' } };
  avgRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };

  styleExcelRange(radarSheet, 1, 4, 11, {
    fillArgb: 'FFEFF6FF',
    border: {
      top: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      left: { style: 'thin', color: { argb: 'FFBFDBFE' } },
      right: { style: 'thin', color: { argb: 'FFBFDBFE' } },
    },
  });

  // Embed radar chart PNG image cleanly below the table
  if (report.radarImageDataUrl) {
    const imageId = wb.addImage({
      base64: report.radarImageDataUrl,
      extension: 'png',
    });
    const aspectRatio =
      report.radarImageAspectRatio && report.radarImageAspectRatio > 0
        ? report.radarImageAspectRatio
        : 1.5;
    const width = 460;
    const height = Math.round(width / aspectRatio);
    radarSheet.addImage(imageId, {
      tl: { col: 0.15, row: 12.2 },
      ext: { width, height },
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, getSafeFilename(report.client, 'xlsx'));
}

export function exportTextReport(report: StrategyReportData): void {
  const radarEntries = getRadarEntries(report.radar);
  const avgScore = Math.round(
    radarEntries.reduce((sum, entry) => sum + entry.score, 0) / radarEntries.length
  );

  const formatBullets = (items: string[]): string =>
    items.length ? items.map((item) => `  - ${item}`).join('\n') : '  - N/A';

  const divider = '='.repeat(72);
  const subDivider = '-'.repeat(72);

  const content = [
    divider,
    'PRINCIPAL STRATEGIC ASSESSMENT REPORT',
    divider,
    `Client / Project    : ${report.client}`,
    `Strategic Objective : ${report.objective}`,
    `Lead Consultant     : ${report.lead}`,
    `Generated At        : ${report.generatedAt}`,
    '',
    subDivider,
    '1. STRATEGIC SWOT ANALYSIS',
    subDivider,
    'STRENGTHS:',
    formatBullets(report.swot.strengths),
    '',
    'WEAKNESSES:',
    formatBullets(report.swot.weaknesses),
    '',
    'OPPORTUNITIES:',
    formatBullets(report.swot.opportunities),
    '',
    'THREATS:',
    formatBullets(report.swot.threats),
    '',
    subDivider,
    '2. STRATEGIC POSITIONING RADAR (0 - 100)',
    subDivider,
    ...radarEntries.map((entry) => `  ${entry.label.padEnd(24, ' ')}: ${entry.score} / 100`),
    `  ${'Overall Average'.padEnd(24, ' ')}: ${avgScore} / 100`,
    '',
    subDivider,
    '3. TOWS STRATEGIC OPTIONS MATRIX',
    subDivider,
    '[SO Strategies (Maxi-Maxi) - Leverage strengths to maximize opportunities]',
    report.tows.so || 'N/A',
    '',
    '[WO Strategies (Mini-Maxi) - Improve weaknesses via opportunities]',
    report.tows.wo || 'N/A',
    '',
    '[ST Strategies (Maxi-Mini) - Use strengths to mitigate threats]',
    report.tows.st || 'N/A',
    '',
    '[WT Strategies (Mini-Mini) - Defensive tactics against weaknesses & threats]',
    report.tows.wt || 'N/A',
    '',
    subDivider,
    '4. EXECUTIVE SYNTHESIS & GOVERNANCE',
    subDivider,
    'Executive Synthesis & Key Recommendations:',
    report.synthesis || 'N/A',
    '',
    `Strategic Posture : ${report.posture || 'N/A'}`,
    `Risk Profile      : ${report.risk || 'N/A'}`,
    divider,
    '',
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, getSafeFilename(report.client, 'txt'));
}

if (typeof window !== 'undefined') {
  window.strategyExporters = {
    exportWordReport,
    exportExcelReport,
    exportTextReport,
  };
}
