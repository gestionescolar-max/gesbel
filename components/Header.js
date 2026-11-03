'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Header({ docente, titulo }) {
  const [abierto, setAbierto] = useState(false);
  const router = useRouter();

  async function salir() {
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <header>
      <div className="brand">
        <div className="logo">📚</div>
        <div>
          <h1>{titulo || 'Gestion Institucional Escolar'}</h1>
          <p>Escuela Técnica "Fray Luis Beltrán"</p>
        </div>
      </div>

      {docente ? (
        <div className="nav-wrap">
          <button className="nav-toggle" onClick={() => setAbierto(!abierto)}>☰ Menú</button>
          {abierto && (
            <div className="nav-menu">
              <div className="nav-user">{docente.nombre || docente.rol}</div>
              <button className="nav-item" onClick={() => { router.push('/materias'); setAbierto(false); }}>
                📖 Mis materias
              </button>
              {(docente.esAdmin || docente.esDirectivo || docente.esSecretaria) && (
                <button className="nav-item" onClick={() => { router.push('/admin'); setAbierto(false); }}>
                  ⚙ Panel de gestión
                </button>
              )}
              {(docente.esPreceptor || docente.esAdmin) && (
                <button className="nav-item" onClick={() => { router.push('/preceptor/inscribir'); setAbierto(false); }}>
                  📝 Inscripción de alumnos
                </button>
              )}
              <button className="nav-item nav-salir" onClick={salir}>Salir</button>
            </div>
          )}
        </div>
      ) : (
        <div className="docente-chip"><span>Invitado</span></div>
      )}
    </header>
  );
}