'use client';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useSesion } from '@/lib/useSesion';
import Header from '@/components/Header';

export default function AsignarProfesoresPage() {
  const { sesion, cargando, autorizado } = useSesion(['secretario', 'directivo']);
  const [materias, setMaterias] = useState(null);
  const [profesores, setProfesores] = useState([]);
  const [filtroCurso, setFiltroCurso] = useState('');
  const [guardandoId, setGuardandoId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!autorizado) return;
    (async () => {
      const [{ data: m, error: errM }, { data: p }] = await Promise.all([
        supabase.from('materias').select(`id, grupo, profesor_id, plan_materias ( nombre ), cursos ( anio, division, ciclo )`).order('id'),
        supabase.from('profesores').select('id, nombre').order('nombre'),
      ]);
      if (errM) { setError(errM.message); return; }
      setMaterias(m || []); setProfesores(p || []);
    })();
  }, [autorizado]);

  async function asignar(materiaId, profesorId) {
    setGuardandoId(materiaId);
    const { error } = await supabase.from('materias').update({ profesor_id: profesorId || null }).eq('id', materiaId);
    if (!error) setMaterias((prev) => prev.map((m) => (m.id === materiaId ? { ...m, profesor_id: profesorId || null } : m)));
    setGuardandoId(null);
  }

  const cursosDisponibles = useMemo(() => {
    if (!materias) return [];
    return Array.from(new Set(materias.map((m) => `${m.cursos.ciclo} · ${m.cursos.anio}° ${m.cursos.division}`))).sort();
  }, [materias]);

  const materiasFiltradas = useMemo(() => {
    if (!materias) return [];
    if (!filtroCurso) return materias;
    return materias.filter((m) => `${m.cursos.ciclo} · ${m.cursos.anio}° ${m.cursos.division}` === filtroCurso);
  }, [materias, filtroCurso]);

  if (cargando) return null;
  if (autorizado === false) return (<><Header docente={null} /><main><div className="status error">No tenés permiso para ver esta pantalla (hace falta rol de secretario o directivo).</div></main></>);

  return (
    <>
      <Header docente={{ nombre: `${sesion.email} · secretaría` }} />
      <main>
        <div className="toolbar"><div className="titulo"><h2>Asignar profesores a materias</h2><p>Elegí un curso para filtrar, o mirá la lista completa</p></div></div>
        <div className="field" style={{ maxWidth: 320, marginBottom: 20 }}>
          <label>Filtrar por curso</label>
          <select value={filtroCurso} onChange={(e) => setFiltroCurso(e.target.value)}>
            <option value="">Todos los cursos</option>
            {cursosDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {error && <div className="status error">{error}</div>}
        {materias === null && !error && <div className="empty">Cargando…</div>}
        {materias && (
          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
              <thead><tr style={{ background: 'var(--surface-2)' }}><th style={th}>Curso</th><th style={th}>Materia</th><th style={th}>Grupo</th><th style={th}>Profesor asignado</th></tr></thead>
              <tbody>
                {materiasFiltradas.map((m) => (
                  <tr key={m.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={td}>{m.cursos.anio}° {m.cursos.division} — {m.cursos.ciclo}</td>
                    <td style={td}>{m.plan_materias.nombre}</td>
                    <td style={td}>{m.grupo || '—'}</td>
                    <td style={td}>
                      <select value={m.profesor_id || ''} disabled={guardandoId === m.id} onChange={(e) => asignar(m.id, e.target.value ? Number(e.target.value) : null)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-strong)', minWidth: 220 }}>
                        <option value="">— Sin asignar —</option>
                        {profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                      {guardandoId === m.id && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>guardando…</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
const th = { padding: '8px 10px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.03em', color: 'var(--text-muted)' };
const td = { padding: '8px 10px' };
