/**
 * exportEngine.ts
 * High-precision multi-format spreadsheet and data export suite for AstreWork.
 * Generates RFC 4180 CSV (with UTF-8 BOM and formula injection shielding),
 * Microsoft Excel XML Spreadsheet 2003 (.xls), Semantic XML, and TSV clipboard formats.
 */

export interface ExportableApplication {
  slNo: number;
  company: string;
  position: string;
  appliedDate: string;
  appliedAtIso: string;
  status: string;
  confirmed: boolean;
  daysSilent: number;
  formUrl: string;
  source: string;
  fieldsFilled: number | null;
  fieldsTotal: number | null;
  hasAiAnswers: boolean;
  atsScore?: number | null;
}

/**
 * Normalizes an application URL by stripping noisy marketing/tracking parameters
 * while preserving the essential path and job identifier.
 */
export function normalizeApplicationUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  try {
    const url = new URL(rawUrl.trim());
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "source",
      "gh_src",
      "fbclid",
      "gclid",
      "mc_cid",
      "mc_eid",
    ];
    trackingParams.forEach((param) => url.searchParams.delete(param));
    
    // Remove trailing slash for path consistency
    let pathname = url.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    
    return `${url.origin}${pathname}${url.search ? url.search : ""}`;
  } catch {
    // If URL parsing fails, return trimmed original
    return rawUrl.trim();
  }
}

/**
 * Formula injection shield: If a value begins with =, +, -, @, \t, or \r,
 * prepend a single quote (') so Microsoft Excel / Google Sheets treats it strictly as safe text.
 */
export function sanitizeForSpreadsheet(val: unknown): string {
  if (val == null) return "";
  const str = String(val).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Escapes a single CSV cell following RFC 4180 rules.
 */
export function escapeCsvCell(val: unknown): string {
  const sanitized = sanitizeForSpreadsheet(val);
  if (sanitized.includes(",") || sanitized.includes('"') || sanitized.includes("\n") || sanitized.includes("\r")) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

/**
 * Generates RFC 4180 CSV with UTF-8 BOM (\uFEFF) for Microsoft Excel & Google Sheets.
 */
export function generateApplicationsCsv(records: ExportableApplication[]): string {
  const headers = [
    "Sl No.",
    "Company Name",
    "Position",
    "Date of Apply",
    "Status",
    "Confirmation",
    "Days Silent",
    "Application Form Link",
    "Platform / Source",
    "Fields Filled",
    "AI Assisted",
    "ATS Match Score",
  ];

  const headerRow = headers.map(escapeCsvCell).join(",");
  const dataRows = records.map((r) => {
    const fieldsRatio = r.fieldsFilled != null && r.fieldsTotal != null
      ? `${r.fieldsFilled}/${r.fieldsTotal}`
      : "—";

    return [
      escapeCsvCell(r.slNo),
      escapeCsvCell(r.company),
      escapeCsvCell(r.position),
      escapeCsvCell(r.appliedDate),
      escapeCsvCell(r.status),
      escapeCsvCell(r.confirmed ? "Confirmed Applied" : "Pending Review"),
      escapeCsvCell(r.daysSilent > 0 ? `${r.daysSilent} days` : "Applied today"),
      escapeCsvCell(r.formUrl),
      escapeCsvCell(r.source),
      escapeCsvCell(fieldsRatio),
      escapeCsvCell(r.hasAiAnswers ? "Yes" : "No"),
      escapeCsvCell(r.atsScore ?? "—"),
    ].join(",");
  });

  // Prepend UTF-8 BOM (\uFEFF) so Excel opens without mojibake
  return `\uFEFF${headerRow}\r\n${dataRows.join("\r\n")}`;
}

/**
 * Generates clean Tab-Separated Values (TSV) for 1-click clipboard paste into Excel / Sheets.
 */
export function generateApplicationsTsv(records: ExportableApplication[]): string {
  const headers = [
    "Sl No.",
    "Company Name",
    "Position",
    "Date of Apply",
    "Status",
    "Confirmation",
    "Days Silent",
    "Application Form Link",
    "Platform / Source",
    "Fields Filled",
    "AI Assisted",
    "ATS Match Score",
  ];

  const headerRow = headers.map(sanitizeForSpreadsheet).join("\t");
  const dataRows = records.map((r) => {
    const fieldsRatio = r.fieldsFilled != null && r.fieldsTotal != null
      ? `${r.fieldsFilled}/${r.fieldsTotal}`
      : "—";

    return [
      sanitizeForSpreadsheet(r.slNo),
      sanitizeForSpreadsheet(r.company),
      sanitizeForSpreadsheet(r.position),
      sanitizeForSpreadsheet(r.appliedDate),
      sanitizeForSpreadsheet(r.status),
      sanitizeForSpreadsheet(r.confirmed ? "Confirmed Applied" : "Pending Review"),
      sanitizeForSpreadsheet(r.daysSilent > 0 ? `${r.daysSilent} days` : "Applied today"),
      sanitizeForSpreadsheet(r.formUrl),
      sanitizeForSpreadsheet(r.source),
      sanitizeForSpreadsheet(fieldsRatio),
      sanitizeForSpreadsheet(r.hasAiAnswers ? "Yes" : "No"),
      sanitizeForSpreadsheet(r.atsScore ?? "—"),
    ].join("\t");
  });

  return `${headerRow}\n${dataRows.join("\n")}`;
}

/**
 * Escapes XML entities (&, <, >, ", ').
 */
function escXml(val: unknown): string {
  if (val == null) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generates Microsoft Excel XML Spreadsheet 2003 (.xls).
 * Opens natively in Excel & Google Sheets with styled headers, custom column widths, and hyperlinks.
 */
export function generateApplicationsExcelXml(
  records: ExportableApplication[],
  candidateName = "Candidate"
): string {
  const exportDate = new Date().toISOString();

  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>AstreWork AI Career Engine</Author>
  <Created>${exportDate}</Created>
  <Company>AstreWork</Company>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#0071E3" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CenterStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="LinkStyle">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#0071E3" ss:Underline="Single"/>
  </Style>
  <Style ss:ID="StatusConfirmed">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#059669" ss:Bold="1"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="StatusPending">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#D97706" ss:Bold="1"/>
   <Interior ss:Color="#FFFBEB" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Applications">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="45"/>
   <Column ss:Width="140"/>
   <Column ss:Width="180"/>
   <Column ss:Width="130"/>
   <Column ss:Width="110"/>
   <Column ss:Width="130"/>
   <Column ss:Width="90"/>
   <Column ss:Width="260"/>
   <Column ss:Width="160"/>
   <Column ss:Width="90"/>
   <Column ss:Width="80"/>
   <Column ss:Width="90"/>
   
   <Row ss:Height="26">
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">#</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Company Name</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Position</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Date of Apply</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Status</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Confirmation</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Days Silent</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Form Link</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Platform / Source</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Fields Filled</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">AI Assisted</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">ATS Score</Data></Cell>
   </Row>`;

  const rowXml = records.map((r) => {
    const fieldsRatio = r.fieldsFilled != null && r.fieldsTotal != null
      ? `${r.fieldsFilled}/${r.fieldsTotal}`
      : "—";

    const confirmStyle = r.confirmed ? "StatusConfirmed" : "StatusPending";
    const confirmLabel = r.confirmed ? "Confirmed Applied" : "Pending Review";
    const daysLabel = r.daysSilent > 0 ? `${r.daysSilent}d silent` : "Applied today";

    return `   <Row ss:Height="22">
    <Cell ss:StyleID="CenterStyle"><Data ss:Type="Number">${r.slNo}</Data></Cell>
    <Cell><Data ss:Type="String">${escXml(r.company)}</Data></Cell>
    <Cell><Data ss:Type="String">${escXml(r.position)}</Data></Cell>
    <Cell><Data ss:Type="String">${escXml(r.appliedDate)}</Data></Cell>
    <Cell ss:StyleID="CenterStyle"><Data ss:Type="String">${escXml(r.status)}</Data></Cell>
    <Cell ss:StyleID="${confirmStyle}"><Data ss:Type="String">${escXml(confirmLabel)}</Data></Cell>
    <Cell ss:StyleID="CenterStyle"><Data ss:Type="String">${escXml(daysLabel)}</Data></Cell>
    <Cell ss:StyleID="LinkStyle" ss:HRef="${escXml(r.formUrl)}"><Data ss:Type="String">${escXml(r.formUrl)}</Data></Cell>
    <Cell><Data ss:Type="String">${escXml(r.source)}</Data></Cell>
    <Cell ss:StyleID="CenterStyle"><Data ss:Type="String">${escXml(fieldsRatio)}</Data></Cell>
    <Cell ss:StyleID="CenterStyle"><Data ss:Type="String">${r.hasAiAnswers ? "Yes" : "No"}</Data></Cell>
    <Cell ss:StyleID="CenterStyle"><Data ss:Type="String">${escXml(r.atsScore != null ? String(r.atsScore) : "—")}</Data></Cell>
   </Row>`;
  }).join("\n");

  const xmlFooter = `  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <Selected/>
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitPane>
    <SplitRow>1</SplitRow>
    <TopRowBottomPane>1</TopRowBottomPane>
    <ActivePane>2</ActivePane>
   </SplitPane>
   <ProtectObjects>False</ProtectObjects>
   <ProtectScenarios>False</ProtectScenarios>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;

  return `${xmlHeader}\n${rowXml}\n${xmlFooter}`;
}

/**
 * Generates Structured Semantic XML Data (<applications><application>...</application></applications>).
 */
export function generateApplicationsSemanticXml(
  records: ExportableApplication[],
  candidateName = "Candidate"
): string {
  const exportDate = new Date().toISOString();

  const xmlItems = records.map((r) => {
    return `    <application>
      <slNo>${r.slNo}</slNo>
      <company>${escXml(r.company)}</company>
      <position>${escXml(r.position)}</position>
      <appliedDate>${escXml(r.appliedDate)}</appliedDate>
      <appliedAtIso>${escXml(r.appliedAtIso)}</appliedAtIso>
      <status>${escXml(r.status)}</status>
      <confirmed>${r.confirmed}</confirmed>
      <daysSilent>${r.daysSilent}</daysSilent>
      <formUrl>${escXml(r.formUrl)}</formUrl>
      <source>${escXml(r.source)}</source>
      <fieldsFilled>${r.fieldsFilled ?? ""}</fieldsFilled>
      <fieldsTotal>${r.fieldsTotal ?? ""}</fieldsTotal>
      <hasAiAnswers>${r.hasAiAnswers}</hasAiAnswers>
      <atsScore>${r.atsScore ?? ""}</atsScore>
    </application>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<applications candidate="${escXml(candidateName)}" exportedAt="${exportDate}" totalCount="${records.length}">
${xmlItems}
</applications>`;
}
