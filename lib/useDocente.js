'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export function useDocente() {
  const [docente, setDocente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let activo = true;
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (pathname !== '/' && pathname !== '/signup') router.push('/');
        else setCargando(false);
        return;
      }

      const { data: perfil, error } = await supabase
        .from('perfiles')
        .select(`profesor_id, rol, es_admin, es_directivo, es_secretaria, es_legajos, es_preceptor, profesores ( id, nombre, legajo, categoria, es_docente )`)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!activo) return;
      if (error || !perfil) { router.push('/'); return; }

      const puedeAdministrar = Boolean(perfil.es_admin || perfil.es_directivo || perfil.es_secretaria);

      if (perfil.profesores) {
        setDocente({
          ...perfil.profesores,
          rol: perfil.rol,
          esAdmin: Boolean(perfil.es_admin),
          esDirectivo: Boolean(perfil.es_directivo),
          esSecretaria: Boolean(perfil.es_secretaria),
          esLegajos: Boolean(perfil.es_legajos),
          esPreceptor: Boolean(perfil.es_preceptor),
          puedeAdministrar,
        });
      } else if (puedeAdministrar || perfil.es_preceptor) {
        setDocente({
          id: null, nombre: session.user.email, rol: perfil.rol,
          esAdmin: Boolean(perfil.es_admin), esDirectivo: Boolean(perfil.es_directivo),
          esSecretaria: Boolean(perfil.es_secretaria), esLegajos: Boolean(perfil.es_legajos),
          esPreceptor: Boolean(perfil.es_preceptor), puedeAdministrar,
        });
      } else {
        router.push('/'); return;
      }
      setCargando(false);
    }
    cargar();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') router.push('/'); });
    return () => { activo = false; sub.subscription.unsubscribe(); };
  }, [router, pathname]);

  return { docente, cargando };
}