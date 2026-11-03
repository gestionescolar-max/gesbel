'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Header({ docente }) {
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
          <h1>Cuaderno del Profesor</h1>
          <p>Escuela Técnica "Fray Luis Beltrán" · ciclo 2026</p>
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

              {/* Solo Admins/Directivos/Secretaría ven el Panel de Gestión */}
              {(docente.esAdmin || docente.esDirectivo || docente.esSecretaria) && (
                <button className="nav-item" onClick={() => { router.push('/admin'); setAbierto(false); }}>
                  ⚙ Panel de gestión
                </button>
              )}

              {/* Solo Preceptores (y Admins) ven la Inscripción */}
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