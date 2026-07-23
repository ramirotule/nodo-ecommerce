type NamedItem = { id: string; nombre: string; activo?: boolean | null };

export function categoriaSelectOptions(items: NamedItem[]) {
  return items.map((item) => ({
    value: item.id,
    label: item.activo === false ? `${item.nombre} (inactiva)` : item.nombre,
  }));
}

export function categoriaFilterOptions(items: NamedItem[]) {
  return items.map((item) => ({
    value: item.nombre,
    label: item.activo === false ? `${item.nombre} (inactiva)` : item.nombre,
  }));
}

export function subcategoriaSelectOptions(items: NamedItem[]) {
  return items.map((item) => ({
    value: item.id,
    label: item.activo === false ? `${item.nombre} (inactiva)` : item.nombre,
  }));
}
