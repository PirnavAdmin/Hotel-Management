using System.Collections.Generic;

namespace HMS.DTOs;

public class ExportSheet
{
    public string SheetName { get; set; } = "Sheet1";
    public string Title { get; set; } = string.Empty;
    public Dictionary<string, string>? Metadata { get; set; }
    public Dictionary<string, string>? SummaryKpis { get; set; }
    public List<string> Headers { get; set; } = new();
    public List<List<object?>> Rows { get; set; } = new();
    public List<object?>? TotalsRow { get; set; }
}

public class ExportDocument
{
    public string Title { get; set; } = "HMS Report";
    public string BaseFileName { get; set; } = "HMS_Export";
    public List<ExportSheet> Sheets { get; set; } = new();

    public ExportDocument() { }

    public ExportDocument(string title, string baseFileName, ExportSheet singleSheet)
    {
        Title = title;
        BaseFileName = baseFileName;
        Sheets.Add(singleSheet);
    }
}
