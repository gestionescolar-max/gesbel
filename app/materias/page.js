'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Sidebar from '@/components/Sidebar';

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
        .select(`id, grupo, plan_materias ( nombre ), cursos ( anio, division, ciclo, modalidad, fp_perfiles ( nombre ) )`)
        .eq('profesor_id', docente.id);
      if (error) { setError(error.message); return; }
      setMaterias(data || []);
    })();
  }, [docente]);

  if (cargando || !docente) return null;

  return (
    <Sidebar docente={docente} titulo="Mis materias">
      <div className="toolbar">
        <div className="titulo">
          <h2>Tus materias</h2>
          <p>Elegí un curso para abrir el cuaderno</p>
        </div>
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
          {materias.map((m) => {
            const esFP = m.cursos?.modalidad === 'FP';
            const nombreCurso = esFP
              ? `🌙 ${m.cursos.fp_perfiles?.nombre || 'Formación Profesional'}`
              : `${m.cursos.anio}° ${m.cursos.division} — ${m.cursos.ciclo}`;

            return (
              <div
                key={m.id}
                className="materia-card"
                onClick={() => router.push(`/materias/${m.id}`)}
                style={{ borderColor: esFP ? 'var(--amber)' : undefined }}
              >
                <div className="nombre">{m.plan_materias?.nombre}</div>
                <div className="curso">{nombreCurso}</div>
                {m.grupo && <span className="grupo">{m.grupo}</span>}
              </div>
            );
          })}
        </div>
      )}
    </Sidebar>
  );
}