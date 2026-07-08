"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Phone, Save, CheckCircle, Camera, Loader2, X } from "lucide-react";

interface Props {
  config: Record<string, string>;
}

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.77a4.85 4.85 0 0 1-1.01-.08z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
  </svg>
);

export default function MisDatosClient({ config: initial }: Props) {
  const [form, setForm] = useState({
    nombre_completo: initial.nombre_completo || "",
    telefono: initial.telefono || "",
    instagram: initial.instagram || "",
    whatsapp: initial.whatsapp || "",
    facebook: initial.facebook || "",
    tiktok: initial.tiktok || "",
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const url = data.user?.user_metadata?.avatar_url;
      if (url) setAvatarUrl(url);
    });
  }, []);// eslint-disable-line react-hooks/exhaustive-deps

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarLoading(true);
    setAvatarError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAvatarError("No autenticado"); setAvatarLoading(false); return; }

    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) { setAvatarError(uploadError.message); setAvatarLoading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: `${publicUrl}?t=${Date.now()}` },
    });

    if (updateError) { setAvatarError(updateError.message); setAvatarLoading(false); return; }

    setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
    setAvatarLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const entries = Object.entries(form).map(([clave, valor]) => ({
      clave,
      valor,
      updated_at: new Date().toISOString(),
    }));

    const { error: err } = await supabase
      .from("configuracion")
      .upsert(entries, { onConflict: "clave" });

    setLoading(false);
    if (err) { setError(err.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const inputClass = "w-full bg-luxury-black border border-luxury-gray-mid text-white px-3 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors placeholder-[#444444]";
  const labelClass = "block text-luxury-gray-light text-xs uppercase tracking-wider mb-1.5";

  return (
    <>
      {/* Snackbar */}
      <div
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-luxury-gray border border-gold/40 text-white px-4 py-3 text-sm shadow-xl transition-all duration-300 ${
          saved ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <CheckCircle size={15} className="text-gold shrink-0" />
        Datos guardados correctamente
      </div>

      {/* Avatar lightbox */}
      {lightboxOpen && avatarUrl && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
            onClick={() => setLightboxOpen(false)}
            aria-label="Cerrar"
          >
            <X size={28} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt="Foto de perfil"
            className="max-w-[90vw] max-h-[90vh] rounded-full object-cover shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="mb-8">
        <p className="text-gold text-xs tracking-[0.3em] uppercase mb-1">Dashboard</p>
        <h1 className="text-white text-2xl font-serif">Mis Datos</h1>
        <p className="text-[#555555] text-sm mt-1">
          Tu información personal y de contacto para el sitio.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Columna izquierda: foto + datos personales */}
          <div className="space-y-6">

            {/* Foto de perfil */}
            <div className="bg-luxury-black border border-luxury-gray p-6">
              <div className="flex items-center gap-3 pb-4 border-b border-luxury-gray mb-5">
                <Camera size={16} className="text-gold" />
                <h2 className="text-white text-xs font-bold tracking-[0.2em] uppercase">Foto de perfil</h2>
              </div>

              <div className="flex items-center gap-6">
                {/* Preview — clickable to open lightbox */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => avatarUrl && setLightboxOpen(true)}
                    className={`w-20 h-20 rounded-full border-2 border-luxury-gray-mid overflow-hidden bg-luxury-gray flex items-center justify-center ${avatarUrl ? "cursor-pointer hover:border-gold transition-colors" : "cursor-default"}`}
                    aria-label={avatarUrl ? "Ver foto en grande" : undefined}
                    disabled={!avatarUrl}
                  >
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} className="text-[#444]" />
                    )}
                  </button>
                  {avatarLoading && (
                    <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                      <Loader2 size={20} className="text-gold animate-spin" />
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarLoading}
                    className="flex items-center gap-2 border border-gold/40 text-gold text-xs tracking-widest uppercase px-4 py-2 hover:bg-gold/10 transition-colors disabled:opacity-50"
                  >
                    <Camera size={13} />
                    {avatarUrl ? "Cambiar foto" : "Subir foto"}
                  </button>
                  <p className="text-[#555] text-xs">JPG, PNG o WEBP · Máx 2 MB</p>
                  {avatarError && <p className="text-red-400 text-xs">{avatarError}</p>}
                </div>
              </div>
            </div>

            {/* Datos personales */}
            <div className="bg-luxury-black border border-luxury-gray p-6 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-luxury-gray">
                <User size={16} className="text-gold" />
                <h2 className="text-white text-xs font-bold tracking-[0.2em] uppercase">Datos personales</h2>
              </div>

              <div>
                <label className={labelClass}>Nombre completo</label>
                <input
                  value={form.nombre_completo}
                  onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
                  className={inputClass}
                  placeholder="Ej: Nombre completo"
                />
              </div>

              <div>
                <label className={labelClass}>
                  <span className="flex items-center gap-1.5"><Phone size={11} /> Teléfono</span>
                </label>
                <input
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className={inputClass}
                  placeholder="Ej: número de teléfono"
                />
              </div>
            </div>
          </div>

          {/* Columna derecha: redes sociales */}
          <div className="bg-luxury-black border border-luxury-gray p-6 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-luxury-gray">
              <h2 className="text-white text-xs font-bold tracking-[0.2em] uppercase">Redes sociales y contacto</h2>
            </div>

            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5 text-pink-400"><InstagramIcon /> Instagram (URL)</span>
              </label>
              <input
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                className={inputClass}
                placeholder="https://www.instagram.com/mitienda/"
              />
            </div>

            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5 text-green-400">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.631 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp (número con código de país, sin +)
                </span>
              </label>
              <input
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                className={inputClass}
                placeholder="549XXXXXXXXXX"
              />
            </div>

            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5 text-blue-400"><FacebookIcon /> Facebook (URL)</span>
              </label>
              <input
                value={form.facebook}
                onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                className={inputClass}
                placeholder="https://www.facebook.com/..."
              />
            </div>

            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5"><TikTokIcon /> TikTok (URL)</span>
              </label>
              <input
                value={form.tiktok}
                onChange={(e) => setForm({ ...form, tiktok: e.target.value })}
                className={inputClass}
                placeholder="https://www.tiktok.com/@..."
              />
            </div>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 flex items-center gap-2 bg-gold text-black font-bold px-6 py-3 text-sm tracking-wider hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {loading ? (
            <><span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Guardando...</>
          ) : (
            <><Save size={16} /> Guardar cambios</>
          )}
        </button>
      </form>
    </>
  );
}
