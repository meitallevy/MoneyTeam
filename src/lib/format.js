const ils = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 2 })

export const money = (n) => ils.format(Number(n || 0))
export const num = (n) => new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 }).format(Number(n || 0))

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '')

// month key + label for grouping charts
export const monthKey = (d) => (d ? new Date(d).toISOString().slice(0, 7) : '')

export const TX_TYPES = ['income', 'expense', 'transfer', 'in_kind']

export const typePill = {
  income: 'pill pill-in',
  expense: 'pill pill-out',
  transfer: 'pill pill-transfer',
  in_kind: 'pill pill-inkind',
}

export const typeColor = {
  income: '#4d63ff',
  expense: '#ff9100',
  transfer: '#8a8aa0',
  in_kind: '#b06bff',
}

// Signed effect of a transaction on the "net" figure (in-kind counted separately)
export const signedNet = (t) => {
  if (t.type === 'income') return Number(t.amount)
  if (t.type === 'expense') return -Number(t.amount)
  return 0 // transfers net to zero; in_kind excluded from cash net
}
