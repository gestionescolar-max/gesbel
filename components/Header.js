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
        {/* ✅ LOGO DE LA ESCUELA */}
        <div className="logo">
          <img
            src="/logo-etflb.png"
            alt="ETFLB"
            style={{ height: 48, width: 'auto' }}
          />
        </div>
        <div>
          <h1>{titulo || 'Gestión Institucional Escolar'}</h1>
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
        /* ✅ CAMBIO: En lugar de "Invitado", mostramos el año lectivo */
        <div className="docente-chip">
          <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>
            Ciclo Lectivo 2026
          </span>
        </div>
      )}
    </header>
  );
}