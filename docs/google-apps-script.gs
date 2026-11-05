/**
 * Virasat orders: Google Apps Script for the order sheet.
 *
 * The website calls this script twice per order:
 *   1. "pending": when the buyer clicks Pay (saved in the "Pending" tab)
 *   2. "paid": when PhonePe confirms payment (moved to the "Orders" tab)
 * So the "Orders" tab has ONLY paid orders: that is the shipping list.
 * "Pending" keeps people who started but did not pay.
 *
 * SETUP: see docs/SETUP.md, step 1.
 */

// Must be exactly the same as SHEET_SECRET in Vercel.
const SECRET = 'PASTE-YOUR-SECRET-HERE';

const PENDING_HEADERS = [
  'Created at', 'Order ID', 'Product', 'Copies', 'Amount (Rs)', 'Name', 'WhatsApp', 'Email',
  'House / building', 'Street / area', 'Landmark', 'City', 'State', 'PIN', 'Heard from',
];

const ORDER_HEADERS = [
  'Paid at', 'Order ID', 'Transaction ID', 'Product', 'Copies', 'Amount paid (Rs)', 'Name',
  'WhatsApp', 'Email', 'House / building', 'Street / area', 'Landmark', 'City', 'State', 'PIN',
  'Heard from', 'Note', 'Posted on', 'Speed Post no.',
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(25000); // one order at a time, so nothing is written twice
  try {
    const req = JSON.parse(e.postData.contents);
    if (req.secret !== SECRET) return reply({ ok: false, error: 'bad secret' });
    const order = req.order || {};
    if (!order.orderId) return reply({ ok: false, error: 'missing orderId' });

    if (req.action === 'pending') return reply(addPending(order));
    if (req.action === 'paid') return reply(markPaid(order));
    return reply({ ok: false, error: 'unknown action' });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Opening the script URL in a browser shows this: a quick "is it working" check.
function doGet() {
  return ContentService.createTextOutput('Virasat order sheet is running.');
}

function addPending(o) {
  const sh = getSheet('Pending', PENDING_HEADERS);
  if (findRow(sh, o.orderId)) return { ok: true, duplicate: true };
  sh.appendRow([
    new Date(), o.orderId, safe(o.product), o.quantity, o.amount, safe(o.name), asText(o.phone),
    safe(o.email), safe(o.address1), safe(o.address2), safe(o.landmark), safe(o.city), safe(o.state),
    asText(o.pincode), safe(o.reference),
  ]);
  return { ok: true };
}

function markPaid(o) {
  const orders = getSheet('Orders', ORDER_HEADERS);
  if (findRow(orders, o.orderId)) return { ok: true, duplicate: true }; // already recorded

  const pending = getSheet('Pending', PENDING_HEADERS);
  const r = findRow(pending, o.orderId);
  let row;

  if (r) {
    const p = pending.getRange(r, 1, 1, PENDING_HEADERS.length).getValues()[0];
    row = [
      new Date(), o.orderId, asText(o.transactionId), safe(p[2]), o.quantity || p[3], o.amount,
      safe(p[5]), asText(p[6]), safe(p[7]), safe(p[8]), safe(p[9]), safe(p[10]), safe(p[11]),
      safe(p[12]), asText(p[13]), safe(p[14]), safe(o.note), '', '',
    ];
    pending.deleteRow(r);
  } else {
    // Pending row missing: use the backup details stored with PhonePe.
    const b = o.backup || {};
    row = [
      new Date(), o.orderId, asText(o.transactionId), 'Virasat Diwali Anka 2026', o.quantity, o.amount,
      safe(b.name), asText(b.phone), safe(b.email), safe(b.address), '', '', '', '', '', '',
      safe(['Address from PhonePe backup, please check', o.note].filter(String).join('. ')), '', '',
    ];
  }

  orders.appendRow(row);
  return { ok: true };
}

// ---------- helpers ----------
function getSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sh;
}

function findRow(sh, orderId) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const ids = sh.getRange(2, 2, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (ids[i][0] === orderId) return i + 2;
  return 0;
}

// Stop text like "=..." being treated as a formula.
function safe(v) {
  v = v == null ? '' : String(v);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

// Keep phone numbers, PIN codes and IDs as text (no scientific notation).
function asText(v) {
  return v === null || v === undefined || v === '' ? '' : "'" + String(v).replace(/^'/, '');
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
