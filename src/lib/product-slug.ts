export function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function generateProductSlug(
  nombre: string,
  marca: string,
  proveedorKey?: string | null
): string {
  const parts = [nombre, marca];
  if (proveedorKey?.trim()) {
    parts.push(proveedorKey.trim());
  }
  return slugifyText(parts.join("-"));
}

export function uniqueProductSlug(
  nombre: string,
  marca: string,
  usedSlugs: Set<string>,
  proveedorKey?: string | null
): string {
  if (proveedorKey?.trim()) {
    const withProveedor = generateProductSlug(nombre, marca, proveedorKey);
    if (withProveedor && !usedSlugs.has(withProveedor)) {
      usedSlugs.add(withProveedor);
      return withProveedor;
    }
  }

  const base = generateProductSlug(nombre, marca);
  if (!base) return base;

  if (!usedSlugs.has(base)) {
    usedSlugs.add(base);
    return base;
  }

  let i = 2;
  while (usedSlugs.has(`${base}-${i}`)) i++;
  const slug = `${base}-${i}`;
  usedSlugs.add(slug);
  return slug;
}

export interface ResolveProductSlugInput {
  nombre: string;
  marca: string;
  proveedorKey?: string | null;
  currentSlug?: string | null;
  currentNombre?: string;
  currentMarca?: string;
  currentProveedorKey?: string | null;
  usedSlugs: Set<string>;
  isEdit?: boolean;
}

/** Slug estable al editar sin cambios; único si cambia nombre/marca/proveedor. */
export function resolveProductSlug(input: ResolveProductSlugInput): string {
  const {
    nombre,
    marca,
    proveedorKey,
    currentSlug,
    currentNombre,
    currentMarca,
    currentProveedorKey,
    usedSlugs,
    isEdit,
  } = input;

  const nombreTrimmed = nombre.trim();
  const marcaTrimmed = marca.trim();

  if (isEdit && currentSlug) {
    const unchanged =
      nombreTrimmed === (currentNombre ?? "").trim() &&
      marcaTrimmed === (currentMarca ?? "").trim() &&
      (proveedorKey ?? "") === (currentProveedorKey ?? "");

    if (unchanged) {
      return currentSlug;
    }
  }

  return uniqueProductSlug(nombreTrimmed, marcaTrimmed, usedSlugs, proveedorKey);
}
