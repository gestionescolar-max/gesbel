'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// Devuelve { docente, cargando }. docente = { id: profesor_id, nombre }.
// Si no hay sesión activa, redirige solo al login.
export function useDocente() {
  const [docente, setDocente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let activo = true;

    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const { data: perfil, error } = await supabase
        .from('perfiles')
        .select('profesor_id, es_admin, profesores ( id, nombre )')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!activo) return;

      if (error || !perfil) { router.push('/'); return; }

      if (perfil.profesores) {
        setDocente({ ...perfil.profesores, esAdmin: perfil.es_admin });
      } else if (perfil.es_admin) {
        // Admin sin profesor_id propio (ej. rol directivo/secretario con superusuario)
        setDocente({ id: null, nombre: session.user.email, esAdmin: true });
      } else {
        router.push('/');
        return;
      }
      setCargando(false);
    }

    cargar();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push('/');
    });

    return () => { activo = false; sub.subscription.unsubscribe(); };
  }, [router]);

  return { docente, cargando };
}
