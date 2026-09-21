'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export function useDocente() {
  const [docente, setDocente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();
  const pathname = usePathname(); // <-- NUEVO: Sabemos en qué ruta estamos

  useEffect(() => {
    let activo = true;

    async function cargar() {
      // 1. Verificar sesión
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Solo redirigir si NO estamos ya en el login o registro
        if (pathname !== '/' && pathname !== '/signup') {
          router.push('/');
        } else {
          setCargando(false); // Importante: dejamos de "cargar" si ya estamos en login
        }
        return;
      }

      // 2. Obtener perfil de la base de datos
      const { data: perfil, error } = await supabase
        .from('perfiles')
        .select('profesor_id, es_admin, profesores ( id, nombre )')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!activo) return;

      if (error || !perfil) { 
        router.push('/'); 
        return; 
      }

      if (perfil.profesores) {
        setDocente({ ...perfil.profesores, esAdmin: perfil.es_admin });
      } else if (perfil.es_admin) {
        setDocente({ id: null, nombre: session.user.email, esAdmin: true });
      } else {
        router.push('/');
        return;
      }
      
      setCargando(false);
    }

    cargar();

    // Escuchar cambios de autenticación
    const { data: sub } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/');
      }
    });

    return () => { 
      activo = false; 
      sub.subscription.unsubscribe(); 
    };
  }, [router, pathname]); // <-- Agregamos pathname a las dependencias

  return { docente, cargando };
}