import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getThemeConfig } from "@/lib/theme/getThemeConfig";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!perfil || perfil.rol !== "admin") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  const { data: configRow } = await supabase
    .from("configuracion")
    .select("valor")
    .eq("clave", "nombre_completo")
    .single();

  const nombreCompleto = configRow?.valor || "";

  const theme = await getThemeConfig();
  let enabledModules: string[] = [];
  try {
    enabledModules = JSON.parse(theme.nav_modules_enabled);
  } catch {
    // If parsing fails, fall back to showing all modules (empty array = all)
    enabledModules = [];
  }

  return (
    <DashboardShell user={user} nombreCompleto={nombreCompleto} enabledModules={enabledModules}>
      {children}
    </DashboardShell>
  );
}
