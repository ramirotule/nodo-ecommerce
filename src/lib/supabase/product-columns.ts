import type { SupabaseClient } from "@supabase/supabase-js";
import { PRODUCTS_TABLE } from "@/lib/supabase/tables";

let descripProveeCache: boolean | null = null;
let pendienteCompletarCache: boolean | null = null;

async function columnExists(
  supabase: SupabaseClient,
  column: string,
  cache: boolean | null,
  setCache: (value: boolean) => void
): Promise<boolean> {
  if (cache !== null) return cache;

  const { error } = await supabase.from(PRODUCTS_TABLE).select(column).limit(1);
  const exists = !error;
  setCache(exists);
  return exists;
}

export async function hasDescripProveeColumn(supabase: SupabaseClient): Promise<boolean> {
  return columnExists(supabase, "descrip_provee", descripProveeCache, (v) => {
    descripProveeCache = v;
  });
}

export async function hasPendienteCompletarColumn(supabase: SupabaseClient): Promise<boolean> {
  return columnExists(supabase, "pendiente_completar", pendienteCompletarCache, (v) => {
    pendienteCompletarCache = v;
  });
}

/** Quita campos que aún no existen en la tabla (evita PGRST204). */
export async function sanitizeProductPayload(
  supabase: SupabaseClient,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const next = { ...payload };

  if ("descrip_provee" in next && !(await hasDescripProveeColumn(supabase))) {
    delete next.descrip_provee;
  }

  if ("pendiente_completar" in next && !(await hasPendienteCompletarColumn(supabase))) {
    delete next.pendiente_completar;
  }

  return next;
}

/** Columnas extra para SELECT cuando existen en la DB. */
export async function optionalProductSelectColumns(supabase: SupabaseClient): Promise<string> {
  const cols: string[] = [];
  if (await hasDescripProveeColumn(supabase)) cols.push("descrip_provee");
  if (await hasPendienteCompletarColumn(supabase)) cols.push("pendiente_completar");
  return cols.length > 0 ? `, ${cols.join(", ")}` : "";
}
