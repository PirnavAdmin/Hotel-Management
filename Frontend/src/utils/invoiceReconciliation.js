import {
  getActualGstAmount,
  getInvoiceStatusCategory,
  isExcludedFromSales,
} from "./invoiceFinancials.js";

function getIdentityKeys(record) {
  const keys = [];
  if (record?.invoiceId != null && String(record.invoiceId).trim()) {
    keys.push(`id:${String(record.invoiceId).trim()}`);
  }
  const invNum = record?.invoiceNumber ?? record?.invoiceNo ?? record?.InvoiceNumber ?? record?.InvoiceNo;
  if (invNum != null && String(invNum).trim()) {
    keys.push(`num:${String(invNum).trim().toLowerCase()}`);
  }
  if (record?.orderId != null && String(record.orderId).trim()) {
    keys.push(`ord:${String(record.orderId).trim()}`);
  }
  return keys;
}

function findDuplicates(records = []) {
  const seenIds = new Set();
  const seenNumbers = new Set();
  const duplicateIds = [];
  const duplicateInvoiceNumbers = [];

  records.forEach((r) => {
    if (r?.invoiceId != null && String(r.invoiceId).trim()) {
      const id = String(r.invoiceId).trim();
      if (seenIds.has(id)) duplicateIds.push(id);
      else seenIds.add(id);
    }
    const invNum = r?.invoiceNumber ?? r?.invoiceNo ?? r?.InvoiceNumber ?? r?.InvoiceNo;
    if (invNum != null && String(invNum).trim()) {
      const num = String(invNum).trim();
      if (seenNumbers.has(num)) duplicateInvoiceNumbers.push(num);
      else seenNumbers.add(num);
    }
  });

  return { duplicateIds, duplicateInvoiceNumbers };
}

/**
 * Pure read-only reconciliation between POS past/settled orders and Admin backend invoices.
 * Reports identity, status, and amount discrepancies without mutating authoritative data.
 * @param {Array<object>} posRecords
 * @param {Array<object>} adminRecords
 */
export function reconcilePosAndAdminInvoices(posRecords = [], adminRecords = []) {
  const adminIndex = new Map();
  adminRecords.forEach((rec, idx) => {
    getIdentityKeys(rec).forEach((k) => {
      if (!adminIndex.has(k)) adminIndex.set(k, { rec, idx });
    });
  });

  const matchedAdminIndices = new Set();
  const missingInAdmin = [];
  const amountMismatches = [];
  const statusMismatches = [];
  let matchedCount = 0;
  let localOnlyCount = 0;

  posRecords.forEach((posRec) => {
    const keys = getIdentityKeys(posRec);
    let matched = null;
    for (const k of keys) {
      if (adminIndex.has(k)) {
        matched = adminIndex.get(k);
        break;
      }
    }

    if (!matched) {
      if (posRec?.isLocalLegacyRecord) localOnlyCount += 1;
      missingInAdmin.push({
        orderId: posRec?.orderId ?? posRec?.id ?? null,
        invoiceNumber: posRec?.invoiceNumber || posRec?.invoiceNo || "",
        isLocalLegacyRecord: Boolean(posRec?.isLocalLegacyRecord),
      });
      return;
    }

    matchedCount += 1;
    matchedAdminIndices.add(matched.idx);
    const adminRec = matched.rec;

    const posStatus = getInvoiceStatusCategory(posRec);
    const adminStatus = getInvoiceStatusCategory(adminRec);
    if (posStatus !== adminStatus) {
      statusMismatches.push({
        invoiceNumber: adminRec?.invoiceNumber || posRec?.invoiceNumber || "",
        posStatus,
        adminStatus,
      });
    }

    const posTotal = Number(posRec?.totalAmount ?? posRec?.grandTotal ?? 0) || 0;
    const adminTotal = Number(adminRec?.totalAmount ?? adminRec?.grandTotal ?? 0) || 0;
    const posPaid = Number(posRec?.paidAmount ?? posRec?.amountPaid ?? 0) || 0;
    const adminPaid = Number(adminRec?.paidAmount ?? adminRec?.amountPaid ?? 0) || 0;
    const posTax = getActualGstAmount(posRec);
    const adminTax = getActualGstAmount(adminRec);

    if (
      Math.abs(posTotal - adminTotal) > 0.01 ||
      Math.abs(posPaid - adminPaid) > 0.01 ||
      Math.abs(posTax - adminTax) > 0.01
    ) {
      amountMismatches.push({
        invoiceNumber: adminRec?.invoiceNumber || posRec?.invoiceNumber || "",
        posTotal,
        adminTotal,
        posPaid,
        adminPaid,
        posTax,
        adminTax,
      });
    }
  });

  const missingInPos = adminRecords
    .filter((rec, idx) => !matchedAdminIndices.has(idx) && !isExcludedFromSales(getInvoiceStatusCategory(rec)))
    .map((rec) => ({
      invoiceId: rec?.invoiceId ?? null,
      invoiceNumber: rec?.invoiceNumber || rec?.invoiceNo || "",
      orderId: rec?.orderId ?? null,
    }));

  const posDupes = findDuplicates(posRecords);
  const adminDupes = findDuplicates(adminRecords);

  return {
    matchedCount,
    localOnlyCount,
    missingInAdmin,
    missingInPos,
    amountMismatches,
    statusMismatches,
    posDuplicates: posDupes,
    adminDuplicates: adminDupes,
    isClean:
      missingInAdmin.length === 0 &&
      missingInPos.length === 0 &&
      amountMismatches.length === 0 &&
      statusMismatches.length === 0 &&
      posDupes.duplicateIds.length === 0 &&
      adminDupes.duplicateIds.length === 0,
  };
}
