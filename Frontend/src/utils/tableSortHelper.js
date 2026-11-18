/**
 * Natural numerical sort for restaurant tables.
 * Correctly extracts table digits so tables order naturally:
 * Table-1, Table-2, ..., Table-9, Table-10, ..., Table-14, Table-15, ..., Table-20
 * Prevents string ASCII zigzag (where "table 20" or "Table-2" sorts in wrong spots).
 */
export const getTableSortNumber = (table) => {
  if (!table) return 0;
  // Prioritize the display name or table name so "Spin - 1", "Spin - 2", "Spin - 3" sort by their visual number
  const rawStr = String(table.name || table.tableName || table.tableNumber || "").trim();
  const match = rawStr.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (Number.isFinite(num) && num > 0) return num;
  }
  const rawId = Number(table.id ?? table.tableId);
  if (Number.isFinite(rawId) && rawId > 0) return rawId;
  return 999999;
};

export const compareTablesNaturally = (a, b) => {
  const numA = getTableSortNumber(a);
  const numB = getTableSortNumber(b);
  if (numA !== numB) return numA - numB;
  const nameA = String(a?.name || a?.tableName || a?.id || "");
  const nameB = String(b?.name || b?.tableName || b?.id || "");
  return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" });
};

export const formatTableDisplayName = (table) => {
  if (!table) return "Table";
  const raw = String(table.name || table.tableName || table.tableNumber || "").trim();
  if (raw) {
    if (/^\d+$/.test(raw)) return `Table-${raw}`;
    return raw;
  }
  const num = getTableSortNumber(table);
  return num > 0 ? `Table-${num}` : `Table ${table.id || ""}`;
};

export const getTableBadgeText = (table) => {
  if (!table) return "T";
  const raw = String(table.name || table.tableName || table.tableNumber || "").trim();
  if (!raw) return `T${table.id || 1}`;

  const tableMatch = raw.match(/^(?:table|t)\s*[-–—]?\s*(\d+)$/i);
  if (tableMatch) return `T${tableMatch[1]}`;
  if (/^\d+$/.test(raw)) return `T${raw}`;

  const prefixNumMatch = raw.match(/^([A-Za-z]+)\s*[-–—]?\s*(\d+)$/);
  if (prefixNumMatch) {
    return `${prefixNumMatch[1].charAt(0).toUpperCase()}${prefixNumMatch[2]}`;
  }

  return raw.slice(0, 2).toUpperCase();
};
