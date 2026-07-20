interface MilitaryDisplayNameOptions {
  jerarquia?: string | null;
  nombre?: string | null;
  apellido?: string | null;
  nombreCompleto?: string | null;
}

export function formatMilitaryDisplayName({
  jerarquia,
  nombre,
  apellido,
  nombreCompleto,
}: MilitaryDisplayNameOptions): string {
  const fullName =
    [nombre?.trim(), apellido?.trim()].filter(Boolean).join(' ').trim() ||
    nombreCompleto?.trim() ||
    '';

  const rank = jerarquia?.trim() || '';

  if (rank && fullName) {
    return `${rank} - ${fullName}`;
  }

  if (fullName) {
    return fullName;
  }

  if (rank) {
    return rank;
  }

  return '-';
}
