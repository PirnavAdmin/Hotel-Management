using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using ClosedXML.Excel;
using HMS.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace HMS.Services;

public class ExportService
{
    private const string CsvContentType = "text/csv; charset=utf-8";
    private const string ExcelContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    public byte[] BuildCsv(ExportDocument doc)
    {
        var sb = new StringBuilder();

        for (int s = 0; s < doc.Sheets.Count; s++)
        {
            var sheet = doc.Sheets[s];

            if (doc.Sheets.Count > 1)
            {
                sb.AppendLine($"=== {EscapeCsvCell(sheet.SheetName)} ===");
                sb.AppendLine();
            }

            if (!string.IsNullOrWhiteSpace(sheet.Title))
            {
                sb.AppendLine($"\"{EscapeCsvString(sheet.Title)}\"");
                sb.AppendLine();
            }

            if (sheet.Metadata != null && sheet.Metadata.Count > 0)
            {
                foreach (var kvp in sheet.Metadata)
                {
                    sb.AppendLine($"\"{EscapeCsvString(kvp.Key)}:\",\"{EscapeCsvString(kvp.Value)}\"");
                }
                sb.AppendLine();
            }

            if (sheet.SummaryKpis != null && sheet.SummaryKpis.Count > 0)
            {
                sb.AppendLine("\"EXECUTIVE SUMMARY KPIs\"");
                var kpiHeaders = new List<string>();
                var kpiValues = new List<string>();
                foreach (var kvp in sheet.SummaryKpis)
                {
                    kpiHeaders.Add($"\"{EscapeCsvString(kvp.Key)}\"");
                    kpiValues.Add($"\"{EscapeCsvString(kvp.Value)}\"");
                }
                sb.AppendLine(string.Join(",", kpiHeaders));
                sb.AppendLine(string.Join(",", kpiValues));
                sb.AppendLine();
            }

            // Headers
            if (sheet.Headers.Count > 0)
            {
                var escapedHeaders = new List<string>();
                foreach (var h in sheet.Headers)
                {
                    escapedHeaders.Add($"\"{EscapeCsvString(h)}\"");
                }
                sb.AppendLine(string.Join(",", escapedHeaders));
            }

            // Data Rows
            foreach (var row in sheet.Rows)
            {
                var cells = new List<string>();
                for (int c = 0; c < row.Count && c < sheet.Headers.Count; c++)
                {
                    cells.Add(FormatCsvCell(row[c]));
                }
                sb.AppendLine(string.Join(",", cells));
            }

            // Totals Row
            if (sheet.TotalsRow != null && sheet.TotalsRow.Count > 0)
            {
                var cells = new List<string>();
                for (int c = 0; c < sheet.TotalsRow.Count && c < sheet.Headers.Count; c++)
                {
                    cells.Add(FormatCsvCell(sheet.TotalsRow[c]));
                }
                sb.AppendLine(string.Join(",", cells));
            }

            if (s < doc.Sheets.Count - 1)
            {
                sb.AppendLine();
                sb.AppendLine();
            }
        }

        // Include UTF-8 BOM preamble so Excel renders ₹ symbols cleanly
        byte[] preamble = Encoding.UTF8.GetPreamble();
        byte[] contentBytes = Encoding.UTF8.GetBytes(sb.ToString());
        byte[] fileBytes = new byte[preamble.Length + contentBytes.Length];
        Buffer.BlockCopy(preamble, 0, fileBytes, 0, preamble.Length);
        Buffer.BlockCopy(contentBytes, 0, fileBytes, preamble.Length, contentBytes.Length);

        return fileBytes;
    }

    public byte[] BuildExcel(ExportDocument doc)
    {
        using var workbook = new XLWorkbook();

        var usedSheetNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var sheet in doc.Sheets)
        {
            string safeSheetName = string.IsNullOrWhiteSpace(sheet.SheetName) ? "Sheet1" : sheet.SheetName.Trim();
            // Excel sheet name max 31 chars and no illegal characters
            safeSheetName = safeSheetName.Replace(":", "-").Replace("\\", "-").Replace("/", "-").Replace("?", "").Replace("*", "").Replace("[", "").Replace("]", "");
            if (safeSheetName.Length > 31) safeSheetName = safeSheetName.Substring(0, 31);

            string uniqueName = safeSheetName;
            int suffix = 2;
            while (!usedSheetNames.Add(uniqueName))
            {
                string suffixStr = $"_{suffix++}";
                int maxPrefix = Math.Max(1, 31 - suffixStr.Length);
                uniqueName = (safeSheetName.Length > maxPrefix ? safeSheetName.Substring(0, maxPrefix) : safeSheetName) + suffixStr;
            }

            var ws = workbook.Worksheets.Add(uniqueName);
            int currentRow = 1;

            // Title
            if (!string.IsNullOrWhiteSpace(sheet.Title))
            {
                var titleCell = ws.Cell(currentRow, 1);
                titleCell.Value = sheet.Title;
                titleCell.Style.Font.Bold = true;
                titleCell.Style.Font.FontSize = 14;
                titleCell.Style.Font.FontColor = XLColor.FromArgb(15, 23, 42); // slate-900
                currentRow += 2;
            }

            // Metadata
            if (sheet.Metadata != null && sheet.Metadata.Count > 0)
            {
                foreach (var kvp in sheet.Metadata)
                {
                    ws.Cell(currentRow, 1).Value = kvp.Key + ":";
                    ws.Cell(currentRow, 1).Style.Font.Bold = true;
                    ws.Cell(currentRow, 1).Style.Font.FontColor = XLColor.FromArgb(71, 85, 105);
                    ws.Cell(currentRow, 2).Value = kvp.Value;
                    currentRow++;
                }
                currentRow++;
            }

            // Summary KPIs
            if (sheet.SummaryKpis != null && sheet.SummaryKpis.Count > 0)
            {
                int kpiCol = 1;
                foreach (var kvp in sheet.SummaryKpis)
                {
                    var headerCell = ws.Cell(currentRow, kpiCol);
                    headerCell.Value = kvp.Key;
                    headerCell.Style.Font.Bold = true;
                    headerCell.Style.Font.FontSize = 9;
                    headerCell.Style.Fill.BackgroundColor = XLColor.FromArgb(241, 245, 249);
                    headerCell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                    headerCell.Style.Border.OutsideBorderColor = XLColor.FromArgb(203, 213, 225);

                    var valCell = ws.Cell(currentRow + 1, kpiCol);
                    valCell.Value = kvp.Value;
                    valCell.Style.Font.Bold = true;
                    valCell.Style.Font.FontSize = 12;
                    valCell.Style.Font.FontColor = XLColor.FromArgb(14, 116, 144); // cyan-700
                    valCell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                    valCell.Style.Border.OutsideBorderColor = XLColor.FromArgb(203, 213, 225);

                    kpiCol++;
                }
                currentRow += 3;
            }

            // Table Headers
            int headerRowIndex = currentRow;
            for (int c = 0; c < sheet.Headers.Count; c++)
            {
                var cell = ws.Cell(currentRow, c + 1);
                cell.Value = sheet.Headers[c];
                cell.Style.Font.Bold = true;
                cell.Style.Font.FontColor = XLColor.White;
                cell.Style.Fill.BackgroundColor = XLColor.FromArgb(30, 41, 59); // slate-800
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                cell.Style.Border.OutsideBorderColor = XLColor.FromArgb(51, 65, 85);
            }
            ws.Row(currentRow).Height = 22;
            if (headerRowIndex > 0)
            {
                try { ws.SheetView.FreezeRows(headerRowIndex); } catch { }
            }
            currentRow++;

            // Data Rows
            foreach (var row in sheet.Rows)
            {
                for (int c = 0; c < row.Count && c < sheet.Headers.Count; c++)
                {
                    var cell = ws.Cell(currentRow, c + 1);
                    SetExcelCellValue(cell, row[c], sheet.Headers[c]);
                    cell.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
                    cell.Style.Border.BottomBorderColor = XLColor.FromArgb(226, 232, 240);
                }
                currentRow++;
            }

            // Totals Row
            if (sheet.TotalsRow != null && sheet.TotalsRow.Count > 0)
            {
                for (int c = 0; c < sheet.TotalsRow.Count && c < sheet.Headers.Count; c++)
                {
                    var cell = ws.Cell(currentRow, c + 1);
                    SetExcelCellValue(cell, sheet.TotalsRow[c], sheet.Headers[c]);
                    cell.Style.Font.Bold = true;
                    cell.Style.Fill.BackgroundColor = XLColor.FromArgb(241, 245, 249);
                    cell.Style.Border.TopBorder = XLBorderStyleValues.Thin;
                    cell.Style.Border.BottomBorder = XLBorderStyleValues.Double;
                    cell.Style.Border.TopBorderColor = XLColor.FromArgb(148, 163, 184);
                    cell.Style.Border.BottomBorderColor = XLColor.FromArgb(100, 116, 139);
                }
                currentRow++;
            }

            // Auto-fit columns
            try
            {
                ws.Columns().AdjustToContents();
            }
            catch
            {
                // Fallback column width if adjustment fails in certain environments
            }
        }

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    public FileContentResult ExportResult(ExportDocument doc, string? format, string? customFileName = null)
    {
        bool isExcel = string.Equals(format, "xlsx", StringComparison.OrdinalIgnoreCase) ||
                       string.Equals(format, "excel", StringComparison.OrdinalIgnoreCase) ||
                       string.Equals(format, "xls", StringComparison.OrdinalIgnoreCase);

        string ext = isExcel ? "xlsx" : "csv";
        string contentType = isExcel ? ExcelContentType : CsvContentType;

        string timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
        string baseName = string.IsNullOrWhiteSpace(customFileName) ? doc.BaseFileName : customFileName;
        string fileName = $"{baseName}_{timestamp}.{ext}";

        byte[] bytes = isExcel ? BuildExcel(doc) : BuildCsv(doc);

        return new FileContentResult(bytes, contentType)
        {
            FileDownloadName = fileName
        };
    }

    private static string ResolveDecimalExcelFormat(string? header)
    {
        if (string.IsNullOrWhiteSpace(header)) return "₹#,##0.00";
        if (header.Contains('%')) return "0.00\"%\"";

        bool isCurrencyHeader = header.Contains('₹') ||
                                header.Contains("INR", StringComparison.OrdinalIgnoreCase) ||
                                header.Contains("Valu", StringComparison.OrdinalIgnoreCase);

        if (!isCurrencyHeader &&
            (header.Contains("Qty", StringComparison.OrdinalIgnoreCase) ||
             header.Contains("Quantity", StringComparison.OrdinalIgnoreCase) ||
             header.Contains("Stock", StringComparison.OrdinalIgnoreCase) ||
             header.Contains("Threshold", StringComparison.OrdinalIgnoreCase)))
        {
            return "#,##0.##";
        }

        return "₹#,##0.00";
    }

    private static void SetExcelCellValue(IXLCell cell, object? val, string? header = null)
    {
        if (val == null || val == DBNull.Value)
        {
            cell.Value = Blank.Value;
            return;
        }

        switch (val)
        {
            case decimal d:
                cell.Value = (double)d;
                cell.Style.NumberFormat.Format = ResolveDecimalExcelFormat(header);
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                break;
            case double dbl:
                cell.Value = dbl;
                cell.Style.NumberFormat.Format = ResolveDecimalExcelFormat(header);
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                break;
            case float f:
                cell.Value = f;
                cell.Style.NumberFormat.Format = "0.##";
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                break;
            case int i:
                cell.Value = i;
                cell.Style.NumberFormat.Format = "#,##0";
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                break;
            case long l:
                cell.Value = l;
                cell.Style.NumberFormat.Format = "#,##0";
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                break;
            case DateTime dt:
                cell.Value = dt;
                cell.Style.NumberFormat.Format = "yyyy-MM-dd HH:mm";
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                break;
            case DateOnly dOnly:
                cell.Value = dOnly.ToString("yyyy-MM-dd");
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                break;
            case bool b:
                cell.Value = b ? "Yes" : "No";
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                break;
            default:
                string text = val.ToString() ?? string.Empty;
                cell.Value = text;
                break;
        }
    }

    private static string FormatCsvCell(object? val)
    {
        if (val == null || val == DBNull.Value) return "\"\"";

        if (val is decimal dec)
        {
            return $"\"{dec:F2}\"";
        }
        if (val is double dbl)
        {
            return $"\"{dbl:F2}\"";
        }
        if (val is DateTime dt)
        {
            return $"\"{dt:yyyy-MM-dd HH:mm}\"";
        }

        string text = val.ToString() ?? "";
        return $"\"{EscapeCsvString(text)}\"";
    }

    private static string EscapeCsvString(string text)
    {
        if (string.IsNullOrEmpty(text)) return "";

        // Mitigate CSV injection: if cell starts with =, +, -, @, prepend '
        if (text.Length > 0 && (text[0] == '=' || text[0] == '+' || text[0] == '-' || text[0] == '@' || text[0] == '\t' || text[0] == '\r'))
        {
            text = "'" + text;
        }

        return text.Replace("\"", "\"\"");
    }

    private static string EscapeCsvCell(string text)
    {
        return $"\"{EscapeCsvString(text)}\"";
    }
}
