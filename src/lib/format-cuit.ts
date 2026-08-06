export function formatCuit(cuit: string): string {
  const digits = cuit.replace(/\D/g, '')
  if (digits.length !== 11) return cuit.trim()
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
}
