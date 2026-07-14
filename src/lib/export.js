import * as XLSX from 'xlsx'
import { fmtDate } from './format'

// rows: enriched transactions (with account/category/source names resolved)
// meta: { seasonName, accounts:[{name,balance}], periodLabel }
export function exportTransactions(rows, meta = {}) {
  const wb = XLSX.utils.book_new()

  const txSheet = rows.map((r) => ({
    Date: fmtDate(r.date),
    Type: r.type,
    Amount: Number(r.amount),
    Account: r.accountName || '',
    'To account': r.toAccountName || '',
    Source: r.sourceName || '',
    Category: r.categoryName || '',
    Vendor: r.vendor || '',
    Description: r.description || '',
    'Receipt no.': r.receipt_number || '',
    Notes: r.notes || '',
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txSheet), 'Transactions')

  // Summary by category (real expenses only; equipment donations excluded)
  const byCat = aggregate(rows.filter((r) => r.type === 'expense'), 'categoryName')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byCat), 'By category')

  // Summary by source (cash income only; equipment donations excluded)
  const bySrc = aggregate(rows.filter((r) => r.type === 'income'), 'sourceName')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bySrc), 'By source')

  if (meta.accounts?.length) {
    const balSheet = meta.accounts.map((a) => ({ Account: a.name, Balance: Number(a.balance) }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(balSheet), 'Balances')
  }

  const stamp = new Date().toISOString().slice(0, 10)
  const label = (meta.periodLabel || meta.seasonName || 'all').replace(/[^\w\u0590-\u05FF-]+/g, '_')
  XLSX.writeFile(wb, `frc-finance_${label}_${stamp}.xlsx`)
}

function aggregate(rows, key) {
  const map = {}
  for (const r of rows) {
    const k = r[key] || '—'
    map[k] = (map[k] || 0) + Number(r.amount)
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([Name, Total]) => ({ Name, Total }))
}

// items: enriched shopping items (with categoryName resolved)
export function exportShopping(items, meta = {}) {
  const wb = XLSX.utils.book_new()
  const sheet = items.map((r) => ({
    Name: r.name,
    SKU: r.sku || '',
    Category: r.categoryName || '',
    Vendor: r.vendor || '',
    'Est. price': r.est_price != null ? Number(r.est_price) : '',
    Qty: r.quantity,
    'Est. total': r.est_price != null ? Number(r.est_price) * (r.quantity || 1) : '',
    Priority: r.priorityName || '',
    Status: r.status,
    Link: r.url || '',
    Notes: r.notes || '',
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet), 'Shopping')

  const byStatus = {}
  const byCat = {}
  for (const r of items) {
    const tot = (r.est_price != null ? Number(r.est_price) : 0) * (r.quantity || 1)
    byStatus[r.status] = (byStatus[r.status] || 0) + tot
    const c = r.categoryName || '—'
    byCat[c] = (byCat[c] || 0) + tot
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    Object.entries(byStatus).map(([Status, Total]) => ({ Status, Total }))), 'By status')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([Category, Total]) => ({ Category, Total }))), 'By category')

  const stamp = new Date().toISOString().slice(0, 10)
  const label = (meta.seasonName || 'shopping').replace(/[^\w\u0590-\u05FF-]+/g, '_')
  XLSX.writeFile(wb, `frc-shopping_${label}_${stamp}.xlsx`)
}
