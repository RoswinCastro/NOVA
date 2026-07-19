export function extractCedulaDigits(value: string | null | undefined) {
  return (value ?? '').replace(/\D/g, '');
}

export function formatCedula(value: string | null | undefined) {
  const digits = extractCedulaDigits(value);

  if (!digits) {
    return '-';
  }

  return new Intl.NumberFormat('es-VE').format(Number(digits));
}
