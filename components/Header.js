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
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 16px',
      background: '#fff',
      borderBottom: '1px solid #e5e7eb',
      flexWrap: 'wrap',
      gap: 12
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        {/* Logo responsivo */}
        <img
          src="/logo-etflb.png"
          alt="ETFLB"
          style={{
            height: 'clamp(32px, 5vw, 48px)',
            width: 'auto',
            flexShrink: 0
          }}
        />
        <div style={{ minWidth: 0 }}>
          <h1 style={{
            fontSize: 'clamp(14px, 2.5vw, 18px)',
            fontWeight: 700,
            color: '#1e3a8a',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {titulo || 'Gestión Institucional Escolar'}
          </h1>
          <p style={{
            fontSize: 'clamp(10px, 1.8vw, 12px)',
            color: '#6b7280',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            Escuela Técnica "Fray Luis Beltrán"
          </p>
        </div>
      </div>

      {docente ? (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setAbierto(!abierto)}
            style={{
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              padding: '8px 16px',
              borderRadius: 6,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minHeight: 44
            }}
          >
            ☰ Menú
          </button>
          {abierto && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: 8,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              minWidth: 220,
              zIndex: 1000,
              overflow: 'hidden'
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#1e3a8a', fontSize: 14 }}>
                {docente.nombre || docente.rol}
              </div>
              <button
                onClick={() => { router.push('/materias'); setAbierto(false); }}
                style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid #f3f4f6', minHeight: 44 }}
              >
                📖 Mis materias
              </button>
              {(docente.esAdmin || docente.esDirectivo || docente.esSecretaria) && (
                <button
                  onClick={() => { router.push('/admin'); setAbierto(false); }}
                  style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid #f3f4f6', minHeight: 44 }}
                >
                  ⚙ Panel de gestión
                </button>
              )}
              {(docente.esPreceptor || docente.esAdmin) && (
                <button
                  onClick={() => { router.push('/preceptor/inscribir'); setAbierto(false); }}
                  style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid #f3f4f6', minHeight: 44 }}
                >
                  📝 Inscripción de alumnos
                </button>
              )}
              <button
                onClick={salir}
                style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: '#fef2f2', border: 'none', cursor: 'pointer', fontSize: 14, color: '#b91c1c', fontWeight: 600, minHeight: 44 }}
              >
                Salir
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          fontSize: 'clamp(11px, 1.8vw, 13px)',
          color: '#6b7280',
          fontWeight: 500,
          whiteSpace: 'nowrap'
        }}>
          Ciclo Lectivo 2026
        </div>
      )}
    </header>
  );
}