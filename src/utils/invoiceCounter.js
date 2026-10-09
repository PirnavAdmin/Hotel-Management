// ============================================================
// AVSR FOOD COURT — Sequential Invoice Counter Utility
// Guarantees strictly ascending invoice numbers (INV-1001, INV-1002...)
// ============================================================

const INVOICE_COUNTER_KEY = 'avsr_last_invoice_counter_v1';
let memoryInvoiceCounter = 1000;

export function getNextInvoiceNumber() {
  try {
    let currentCounter = memoryInvoiceCounter;
    
    // Check saved counter in localStorage
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(INVOICE_COUNTER_KEY);
      if (saved && !isNaN(parseInt(saved, 10))) {
        currentCounter = Math.max(currentCounter, parseInt(saved, 10));
      } else {
        // Check existing past orders to find maximum existing sequential invoice
        const pastOrders = localStorage.getItem('gourmet_pos_past_orders_v2_inr');
        if (pastOrders) {
          try {
            const parsed = JSON.parse(pastOrders);
            if (Array.isArray(parsed)) {
              parsed.forEach(o => {
                if (o && o.invoiceNo) {
                  const match = String(o.invoiceNo).match(/INV-(\d+)/i);
                  if (match && match[1]) {
                    const num = parseInt(match[1], 10);
                    if (!isNaN(num) && num > currentCounter && num < 900000) {
                      currentCounter = num;
                    }
                  }
                }
              });
            }
          } catch {}
        }
      }
    }

    const nextCounter = currentCounter + 1;
    memoryInvoiceCounter = nextCounter;

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(INVOICE_COUNTER_KEY, nextCounter.toString());
    }

    // Broadcast via global sync for multi-device harmony
    try {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [INVOICE_COUNTER_KEY]: nextCounter.toString() })
      }).catch(() => {});
    } catch {}

    return `INV-${nextCounter}`;
  } catch {
    memoryInvoiceCounter += 1;
    return `INV-${memoryInvoiceCounter}`;
  }
}

