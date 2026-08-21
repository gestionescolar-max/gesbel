'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Header({ docente }) {
  const router = useRouter();

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <header>
      <div className="brand">
        <div className="logo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <h1>Cuaderno del Profesor</h1>
          <p>Escuela Técnica &quot;Fray Luis Beltrán&quot; · ciclo 2026</p>
        </div>
      </div>
      {docente && (
        <div className="docente-chip">
          <span>{docente.nombre}</span>
          <button onClick={cerrarSesion}>Salir</button>
        </div>
      )}
    </header>
  );
}
