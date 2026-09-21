'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useSesion } from '@/lib/useSesion';
import Header from '@/components/Header';

export default function AsignarPreceptoresPage() {
  const { sesion, cargando, autorizado } = useSesion(['directivo']);
  const [cursos, setCursos] = useState(null);
  const [profesores, setProfesores] = useState([]);
  const [guardandoId, setGuardandoId] = useState(null);
  const [error, setError] = useState(null);

  async function cargarTodo() {
    const [{ data: c, error: errC }, { data: p }, { data: asignaciones }] = await Promise.all([
      supabase.from('cursos').select('id, anio, division, ciclo').order('ciclo', { ascending: false }).order('anio').order('division'),
      supabase.from('profesores').select('id, nombre').order('nombre'),
      supabase.from('preceptores_curso').select('curso_id, profesor_id').is('vigente_hasta', null),
    ]);
    if (errC) { setError(errC.message); return; }
    const mapa = {};
    (asignaciones || []).forEach((a) => { mapa[a.curso_id] = a.profesor_id; });
    setCursos((c || []).map((curso) => ({ ...curso, preceptor_id: mapa[curso.id] || null })));
    setProfesores(p || []);
  }

  useEffect(() => { if (autorizado) cargarTodo(); }, [autorizado]);

  async function asignar(cursoId, profesorId) {
    setGuardandoId(cursoId);
    await supabase.from('preceptores_curso').update({ vigente_hasta: new Date().toISOString().slice(0, 10) }).eq('curso_id', cursoId).is('vigente_hasta', null);
    if (profesorId) await supabase.from('preceptores_curso').insert({ curso_id: cursoId, profesor_id: profesorId });
    setCursos((prev) => prev.map((c) => (c.id === cursoId ? { ...c, preceptor_id: profesorId } : c)));
    setGuardandoId(null);
  }

  if (cargando) return null;
  if (autorizado === false) return (<><Header docente={null} /><main><div className="status error">No tenés permiso para ver esta pantalla (hace falta rol de directivo).</div></main></>);

  return (
    <>
      <Header docente={{ nombre: `${sesion.email} · directivo` }} />
      <main>
        <div className="toolbar"><div className="titulo"><h2>Asignar preceptores a cursos</h2><p>Un preceptor por curso a la vez — al cambiarlo, queda el historial de quién estuvo antes</p></div></div>
        {error && <div className="status error">{error}</div>}
        {cursos === null && !error && <div className="empty">Cargando…</div>}
        {cursos && (
          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
              <thead><tr style={{ background: 'var(--surface-2)' }}><th style={th}>Curso</th><th style={th}>Preceptor asignado</th></tr></thead>
              <tbody>
                {cursos.map((c) => (
                  <tr key={c.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={td}>{c.anio}° {c.division} — {c.ciclo}</td>
                    <td style={td}>
                      <select value={c.preceptor_id || ''} disabled={guardandoId === c.id} onChange={(e) => asignar(c.id, e.target.value ? Number(e.target.value) : null)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-strong)', minWidth: 220 }}>
                        <option value="">— Sin asignar —</option>
                        {profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                      {guardandoId === c.id && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>guardando…</span>}
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
