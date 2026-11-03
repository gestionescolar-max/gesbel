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
      // 1. Verificar sesión
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        if (pathname !== '/' && pathname !== '/signup') {
          router.push('/');
        } else {
          setCargando(false);
        }
        return;
      }

      // 2. Perfil + legajo completo
      const { data: perfil, error } = await supabase
        .from('perfiles')
        .select(`
          profesor_id,
          es_admin,
          es_directivo,
          es_secretaria,
          es_legajos,
          profesores ( id, nombre, legajo, categoria, es_docente )
        `)
        .eq('user_id', session.user.id)
        .maybeSingle();

      // 👉 AGREGADO PARA DIAGNÓSTICO:
      console.log('--- DIAGNÓSTICO USEDOCENTE ---');
      console.log('User ID:', session.user.id);
      console.log('Perfil encontrado:', perfil);
      console.log('Error:', error);
      console.log('----------------------------');

      if (!activo) return;

      if (error || !perfil) {
        console.warn('No se encontró perfil o hubo error, redirigiendo...');
        router.push('/');
        return;
      }

      // 3. Construir objeto docente con capacidades y comodines
      const puedeAdministrar = Boolean(perfil.es_admin || perfil.es_directivo || perfil.es_secretaria);

      if (perfil.profesores) {
        setDocente({
          ...perfil.profesores,
          esAdmin: Boolean(perfil.es_admin),
          esDirectivo: Boolean(perfil.es_directivo),
          esSecretaria: Boolean(perfil.es_secretaria),
          esLegajos: Boolean(perfil.es_legajos),
          puedeAdministrar,
        });
      } else if (puedeAdministrar) {
        // Personal con función pero sin legajo cargado (caso borde)
        setDocente({
          id: null,
          nombre: session.user.email,
          esAdmin: Boolean(perfil.es_admin),
          esDirectivo: Boolean(perfil.es_directivo),
          esSecretaria: Boolean(perfil.es_secretaria),
          esLegajos: Boolean(perfil.es_legajos),
          puedeAdministrar,
        });
      } else {
        // Rol alumno u otro: salir
        router.push('/');
        return;
      }

      setCargando(false);
    }

    cargar();

    const { data: sub } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/');
      }
    });

    return () => {
      activo = false;
      sub.subscription.unsubscribe();
    };
  }, [router, pathname]);

  return { docente, cargando };
}