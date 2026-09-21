'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export function useSesion(rolesPermitidos) {
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [autorizado, setAutorizado] = useState(null);
  const router = useRouter();

  useEffect(() => {
    let activo = true;
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const { data: perfil, error } = await supabase
        .from('perfiles')
        .select('rol, profesor_id, alumno_id, es_admin')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (!activo) return;
      if (error || !perfil) { router.push('/'); return; }
      const datos = { rol: perfil.rol, profesorId: perfil.profesor_id, alumnoId: perfil.alumno_id, email: session.user.email, esAdmin: perfil.es_admin };
      setSesion(datos);
      if (perfil.es_admin) setAutorizado(true);
      else if (rolesPermitidos && !rolesPermitidos.includes(perfil.rol)) setAutorizado(false);
      else setAutorizado(true);
      setCargando(false);
    }
    cargar();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (!session) router.push('/'); });
    return () => { activo = false; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, rolesPermitidos?.join(',')]);

  return { sesion, cargando, autorizado };
}
