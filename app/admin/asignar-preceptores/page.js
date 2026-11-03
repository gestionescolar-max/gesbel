'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useSesion } from '@/lib/useSesion';
import Header from '@/components/Header';

export default function AsignarPreceptoresPage() {
  const { sesion, cargando, autorizado } = useSesion(['directivo']);
  const [cursosSec, setCursosSec] = useState(null);
  const [cursosFP, setCursosFP] = useState(null);
  const [profesores, setProfesores] = useState([]);
  const [guardandoId, setGuardandoId] = useState(null);
  const [error, setError] = useState(null);

  async function cargarTodo() {
    // Cargar cursos de Secundario
    const { data: cSec, error: errSec } = await supabase
      .from('cursos')
      .select('id, anio, division, ciclo')
      .order('ciclo', { ascending: false })
      .order('anio')
      .order('division');

    if (errSec) { setError(errSec.message); return; }

    // Cargar cursos de FP
    const { data: cFP, error: errFP } = await supabase
      .from('fp_cursos')
      .select('id, nombre, anio, turno')
      .order('anio', { ascending: false })
      .order('nombre');

    if (errFP) { setError(errFP.message); return; }

    // Cargar profesores
    const { data: p } = await supabase
      .from('profesores')
      .select('id, nombre')
      .order('nombre');

    // Cargar asignaciones de Secundario
    const { data: asignacionesSec } = await supabase
      .from('preceptores_curso')
      .select('curso_id, profesor_id')
      .is('vigente_hasta', null);

    // Cargar asignaciones de FP
    const { data: asignacionesFP } = await supabase
      .from('fp_cursos_preceptores')
      .select('fp_curso_id, profesor_id')
      .is('vigente_hasta', null);

    // Mapear asignaciones de Secundario
    const mapaSec = {};
    (asignacionesSec || []).forEach((a) => { mapaSec[a.curso_id] = a.profesor_id; });
    setCursosSec((cSec || []).map((curso) => ({ ...curso, preceptor_id: mapaSec[curso.id] || null })));

    // Mapear asignaciones de FP
    const mapaFP = {};
    (asignacionesFP || []).forEach((a) => { mapaFP[a.fp_curso_id] = a.profesor_id; });
    setCursosFP((cFP || []).map((curso) => ({ ...curso, preceptor_id: mapaFP[curso.id] || null })));

    setProfesores(p || []);
  }

  useEffect(() => { if (autorizado) cargarTodo(); }, [autorizado]);

  async function asignarSecundario(cursoId, profesorId) {
    setGuardandoId(`sec-${cursoId}`);
    await supabase
      .from('preceptores_curso')
      .update({ vigente_hasta: new Date().toISOString().slice(0, 10) })
      .eq('curso_id', cursoId)
      .is('vigente_hasta', null);
    if (profesorId) {
      await supabase
        .from('preceptores_curso')
        .insert({ curso_id: cursoId, profesor_id: profesorId });
    }
    setCursosSec((prev) => prev.map((c) => (c.id === cursoId ? { ...c, preceptor_id: profesorId } : c)));
    setGuardandoId(null);
  }

  async function asignarFP(cursoId, profesorId) {
    setGuardandoId(`fp-${cursoId}`);
    await supabase
      .from('fp_cursos_preceptores')
      .update({ vigente_hasta: new Date().toISOString().slice(0, 10) })
      .eq('fp_curso_id', cursoId)
      .is('vigente_hasta', null);
    if (profesorId) {
      await supabase
        .from('fp_cursos_preceptores')
        .insert({ fp_curso_id: cursoId, profesor_id: profesorId });
    }
    setCursosFP((prev) => prev.map((c) => (c.id === cursoId ? { ...c, preceptor_id: profesorId } : c)));
    setGuardandoId(null);
  }

  if (cargando) return null;
  if (autorizado === false) return (
    <>
      <Header docente={null} />
      <main>
        <div className="status error">No tenés permiso para ver esta pantalla (hace falta rol de directivo).</div>
      </main>
    </>
  );

  return (
    <>
      <Header docente={{ nombre: `${sesion.email} · directivo` }} />
      <main>
        <div className="toolbar">
          <div className="titulo">
            <h2>Asignar preceptores a cursos</h2>
            <p>Un preceptor por curso a la vez — al cambiarlo, queda el historial de quién estuvo antes</p>
          </div>
        </div>
        {error && <div className="status error">{error}</div>}

        {/* SECCIÓN SECUNDARIO */}
        <h3 style={{ fontSize: 16, marginBottom: 12, marginTop: 20 }}>📚 Secundario</h3>
        {cursosSec === null && !error && <div className="empty">Cargando…</div>}
        {cursosSec && (
          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)', marginBottom: 30 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  <th style={th}>Curso</th>
                  <th style={th}>Preceptor asignado</th>
                </tr>
              </thead>
              <tbody>
                {cursosSec.map((c) => (
                  <tr key={c.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={td}>{c.anio}° {c.division} — {c.ciclo}</td>
                    <td style={td}>
                      <select
                        value={c.preceptor_id || ''}
                        disabled={guardandoId === `sec-${c.id}`}
                        onChange={(e) => asignarSecundario(c.id, e.target.value ? Number(e.target.value) : null)}
                        style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-strong)', minWidth: 220 }}
                      >
                        <option value="">— Sin asignar —</option>
                        {profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                      {guardandoId === `sec-${c.id}` && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>guardando…</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SECCIÓN FP */}
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>🌙 Formación Profesional</h3>
        {cursosFP === null && !error && <div className="empty">Cargando…</div>}
        {cursosFP && (
          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  <th style={th}>Curso</th>
                  <th style={th}>Preceptor asignado</th>
                </tr>
              </thead>
              <tbody>
                {cursosFP.map((c) => (
                  <tr key={c.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={td}>{c.nombre} ({c.turno})</td>
                    <td style={td}>
                      <select
                        value={c.preceptor_id || ''}
                        disabled={guardandoId === `fp-${c.id}`}
                        onChange={(e) => asignarFP(c.id, e.target.value ? Number(e.target.value) : null)}
                        style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-strong)', minWidth: 220 }}
                      >
                        <option value="">— Sin asignar —</option>
                        {profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                      {guardandoId === `fp-${c.id}` && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>guardando…</span>}
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