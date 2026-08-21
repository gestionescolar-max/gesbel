'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Header from '@/components/Header';

export default function MateriasPage() {
  const { docente, cargando } = useDocente();
  const [materias, setMaterias] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!docente) return;
    (async () => {
      const { data, error } = await supabase
        .from('materias')
        .select(`
          id, grupo,
          plan_materias ( nombre ),
          cursos ( anio, division, ciclo )
        `)
        .eq('profesor_id', docente.id);

      if (error) { setError(error.message); return; }
      setMaterias(data || []);
    })();
  }, [docente]);

  if (cargando || !docente) return null;

  return (
    <>
      <Header docente={docente} />
      <main>
        <div className="toolbar">
          <div className="titulo">
            <h2>Tus materias</h2>
            <p>Elegí un curso para abrir el cuaderno</p>
          </div>
          {docente.esAdmin && (
            <a href="/admin" className="btn secundario" style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border-strong)', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
              ⚙ Administración
            </a>
          )}
        </div>

        {error && <div className="status error">Error al cargar materias: {error}</div>}
        {materias === null && !error && <div className="empty">Cargando…</div>}

        {materias && materias.length === 0 && (
          <div className="empty">
            <div className="icon">📭</div>
            No tenés materias asignadas todavía en el sistema.
          </div>
        )}

        {materias && materias.length > 0 && (
          <div className="materias-grid">
            {materias.map((m) => (
              <div key={m.id} className="materia-card" onClick={() => router.push(`/materias/${m.id}`)}>
                <div className="nombre">{m.plan_materias.nombre}</div>
                <div className="curso">{m.cursos.anio}° {m.cursos.division} — {m.cursos.ciclo}</div>
                {m.grupo && <span className="grupo">{m.grupo}</span>}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
