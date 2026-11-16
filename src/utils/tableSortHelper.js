/**
 * Natural numerical sort for restaurant tables.
 * Correctly extracts table digits so tables order naturally:
 * Table-1, Table-2, ..., Table-9, Table-10, ..., Table-14, Table-15, ..., Table-20
 * Prevents string ASCII zigzag (where "table 20" or "Table-2" sorts in wrong spots).
 */
export const getTableSortNumber = (table) => {
  if (!table) return 0;
  const rawStr = String(table.tableNumber || table.name || table.tableName || "").trim();
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
  const num = getTableSortNumber(table);
  return num > 0 ? `Table-${num}` : String(table.name || table.tableName || `Table ${table.id || ""}`);
};
