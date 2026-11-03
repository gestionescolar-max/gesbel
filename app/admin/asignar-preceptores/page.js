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
  const [tabActiva, setTabActiva] = useState('secundario');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [emailNuevo, setEmailNuevo] = useState('');
  const [creando, setCreando] = useState(false);
  const [preceptorTodos, setPreceptorTodos] = useState('');
  const [mensaje, setMensaje] = useState(null);

  async function cargarTodo() {
    const [{ data: cSec, error: errSec }, { data: cFP, error: errFP }, { data: p }, { data: asigSec }, { data: asigFP }] = await Promise.all([
      supabase.from('cursos').select('id, anio, division, ciclo').order('ciclo', { ascending: false }).order('anio').order('division'),
      supabase.from('fp_cursos').select('id, nombre, anio, turno').order('anio', { ascending: false }).order('nombre'),
      supabase.from('profesores').select('id, nombre, email').order('nombre'),
      supabase.from('preceptores_curso').select('curso_id, profesor_id, vigente_desde, vigente_hasta').order('vigente_desde', { ascending: false }),
      supabase.from('fp_cursos_preceptores').select('fp_curso_id, profesor_id, vigente_desde, vigente_hasta').order('vigente_desde', { ascending: false }),
    ]);

    if (errSec || errFP) { setError(errSec?.message || errFP?.message); return; }

    const mapaSec = {};
    const historialSec = {};
    (asigSec || []).forEach((a) => {
      if (!a.vigente_hasta) {
        mapaSec[a.curso_id] = a.profesor_id;
      } else {
        if (!historialSec[a.curso_id]) historialSec[a.curso_id] = [];
        historialSec[a.curso_id].push(a);
      }
    });
    setCursosSec((cSec || []).map((c) => ({
      ...c,
      preceptor_id: mapaSec[c.id] || null,
      historial: historialSec[c.id] || []
    })));

    const mapaFP = {};
    const historialFP = {};
    (asigFP || []).forEach((a) => {
      if (!a.vigente_hasta) {
        mapaFP[a.fp_curso_id] = a.profesor_id;
      } else {
        if (!historialFP[a.fp_curso_id]) historialFP[a.fp_curso_id] = [];
        historialFP[a.fp_curso_id].push(a);
      }
    });
    setCursosFP((cFP || []).map((c) => ({
      ...c,
      preceptor_id: mapaFP[c.id] || null,
      historial: historialFP[c.id] || []
    })));

    setProfesores(p || []);
  }

  useEffect(() => { if (autorizado) cargarTodo(); }, [autorizado]);

  async function crearPreceptor() {
    if (!nombreNuevo.trim()) return;
    setCreando(true);
    setError(null);

    try {
      const { data: prof, error: profError } = await supabase
        .from('profesores')
        .insert({ nombre: nombreNuevo.trim(), categoria: 'preceptor' })
        .select('id')
        .single();

      if (profError) throw profError;

      setProfesores((prev) => [...prev, { id: prof.id, nombre: nombreNuevo.trim(), email: emailNuevo }]);
      setNombreNuevo('');
      setEmailNuevo('');
      setMostrarFormNuevo(false);
      setMensaje('Preceptor creado correctamente');
      setTimeout(() => setMensaje(null), 3000);
    } catch (err) {
      setError(`Error al crear preceptor: ${err.message}`);
    } finally {
      setCreando(false);
    }
  }

  async function asignarSecundario(cursoId, profesorId) {
    setGuardandoId(`sec-${cursoId}`);
    setError(null);

    try {
      const hoy = new Date().toISOString().slice(0, 10);

      await supabase
        .from('preceptores_curso')
        .update({ vigente_hasta: hoy })
        .eq('curso_id', cursoId)
        .is('vigente_hasta', null);

      if (profesorId) {
        await supabase
          .from('preceptores_curso')
          .insert({ curso_id: cursoId, profesor_id: profesorId, vigente_desde: hoy, vigente_hasta: null });
      }

      setCursosSec((prev) => prev.map((c) => (c.id === cursoId ? { ...c, preceptor_id: profesorId } : c)));
      setMensaje('Asignación actualizada');
      setTimeout(() => setMensaje(null), 3000);
    } catch (err) {
      setError(`Error al asignar: ${err.message}`);
    } finally {
      setGuardandoId(null);
    }
  }

  async function asignarFP(cursoId, profesorId) {
    setGuardandoId(`fp-${cursoId}`);
    setError(null);

    try {
      const hoy = new Date().toISOString().slice(0, 10);

      await supabase
        .from('fp_cursos_preceptores')
        .update({ vigente_hasta: hoy })
        .eq('fp_curso_id', cursoId)
        .is('vigente_hasta', null);

      if (profesorId) {
        await supabase
          .from('fp_cursos_preceptores')
          .insert({ fp_curso_id: cursoId, profesor_id: profesorId, vigente_desde: hoy, vigente_hasta: null });
      }

      setCursosFP((prev) => prev.map((c) => (c.id === cursoId ? { ...c, preceptor_id: profesorId } : c)));
      setMensaje('Asignación actualizada');
      setTimeout(() => setMensaje(null), 3000);
    } catch (err) {
      setError(`Error al asignar: ${err.message}`);
    } finally {
      setGuardandoId(null);
    }
  }

  async function asignarATodos() {
    if (!preceptorTodos) return;
    if (!confirm(`¿Asignar este preceptor a todos los cursos de ${tabActiva === 'secundario' ? 'Secundario' : 'FP'}?`)) return;

    const cursos = tabActiva === 'secundario' ? cursosSec : cursosFP;
    const asignarFn = tabActiva === 'secundario' ? asignarSecundario : asignarFP;

    for (const curso of cursos) {
      await asignarFn(curso.id, Number(preceptorTodos));
    }
  }

  function getNombrePreceptor(id) {
    const p = profesores.find((x) => x.id === id);
    return p ? p.nombre : '—';
  }

  function filtrarCursos(cursos) {
    if (!busqueda) return cursos;
    const q = busqueda.toLowerCase();
    return cursos.filter((c) => {
      const nombre = c.nombre || `${c.anio}° ${c.division} — ${c.ciclo}`;
      const preceptor = getNombrePreceptor(c.preceptor_id).toLowerCase();
      return nombre.toLowerCase().includes(q) || preceptor.includes(q);
    });
  }

  if (cargando) return null;
  if (autorizado === false) return (
    <>
      <Header docente={null} titulo="Acceso denegado" />
      <main>
        <div className="status error">No tenés permiso para ver esta pantalla.</div>
      </main>
    </>
  );

  const cursosSecFiltrados = filtrarCursos(cursosSec || []);
  const cursosFPFiltrados = filtrarCursos(cursosFP || []);

  return (
    <>
      <Header docente={{ nombre: `${sesion.email} · directivo` }} titulo="Asignación de Preceptores" />
      <main style={{ padding: '2rem', maxWidth: 1400, margin: '0 auto' }}>

        {/* ENCABEZADO DE SECCIÓN */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Gestión de Preceptores
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 700 }}>
            Visualizá el historial de asignaciones y gestioná los preceptores de cada curso. Los cambios quedan registrados automáticamente.
          </p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: 14, borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
            {error}
          </div>
        )}

        {mensaje && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: 14, borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
            {mensaje}
          </div>
        )}

        {/* SECCIÓN 1: TABLA DE HISTORIAL */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              Historial de asignaciones
            </h3>
            <input
              type="text"
              placeholder="Buscar curso o preceptor..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid var(--border-strong)',
                fontSize: 14,
                background: 'var(--surface)',
                minWidth: 280,
              }}
            />
          </div>

          {/* TABS */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 0, borderBottom: '2px solid var(--border)' }}>
            <button
              onClick={() => setTabActiva('secundario')}
              style={{
                padding: '12px 28px',
                background: 'transparent',
                color: tabActiva === 'secundario' ? 'var(--accent)' : 'var(--text-muted)',
                border: 'none',
                borderBottom: tabActiva === 'secundario' ? '2px solid var(--accent)' : '2px solid transparent',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: -2,
                transition: 'all 0.2s'
              }}
            >
              Secundario ({cursosSecFiltrados.length})
            </button>
            <button
              onClick={() => setTabActiva('fp')}
              style={{
                padding: '12px 28px',
                background: 'transparent',
                color: tabActiva === 'fp' ? 'var(--accent)' : 'var(--text-muted)',
                border: 'none',
                borderBottom: tabActiva === 'fp' ? '2px solid var(--accent)' : '2px solid transparent',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: -2,
                transition: 'all 0.2s'
              }}
            >
              Formación Profesional ({cursosFPFiltrados.length})
            </button>
          </div>

          {/* TABLA DE HISTORIAL */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginTop: 20 }}>
            {tabActiva === 'secundario' && (
              <>
                {cursosSec === null && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>}
                {cursosSecFiltrados.length === 0 && cursosSec !== null && (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron cursos</div>
                )}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                        <th style={thStyle}>Curso</th>
                        <th style={thStyle}>Ciclo</th>
                        <th style={thStyle}>Preceptor actual</th>
                        <th style={thStyle}>Historial</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cursosSecFiltrados.map((c, idx) => (
                        <tr key={c.id} style={{ borderBottom: idx < cursosSecFiltrados.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <td style={tdStyle}>
                            <strong>{c.anio}° {c.division}</strong>
                          </td>
                          <td style={tdStyle}>{c.ciclo}</td>
                          <td style={tdStyle}>
                            {c.preceptor_id ? (
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 12px',
                                background: '#dcfce7',
                                color: '#15803d',
                                borderRadius: 20,
                                fontSize: 13,
                                fontWeight: 500
                              }}>
                                {getNombrePreceptor(c.preceptor_id)}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin asignar</span>
                            )}
                          </td>
                          <td style={tdStyle}>
                            {c.historial && c.historial.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {c.historial.map((h, i) => {
                                  const prof = profesores.find(p => p.id === h.profesor_id);
                                  return (
                                    <div key={i} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                      {prof?.nombre || 'Desconocido'}
                                      <span style={{ marginLeft: 8, color: 'var(--border-strong)' }}>
                                        {h.vigente_desde} → {h.vigente_hasta}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin historial</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {tabActiva === 'fp' && (
              <>
                {cursosFP === null && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>}
                {cursosFPFiltrados.length === 0 && cursosFP !== null && (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron cursos</div>
                )}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                        <th style={thStyle}>Curso</th>
                        <th style={thStyle}>Turno / Año</th>
                        <th style={thStyle}>Preceptor actual</th>
                        <th style={thStyle}>Historial</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cursosFPFiltrados.map((c, idx) => (
                        <tr key={c.id} style={{ borderBottom: idx < cursosFPFiltrados.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <td style={tdStyle}>
                            <strong>{c.nombre}</strong>
                          </td>
                          <td style={tdStyle}>{c.turno} · {c.anio}</td>
                          <td style={tdStyle}>
                            {c.preceptor_id ? (
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 12px',
                                background: '#dcfce7',
                                color: '#15803d',
                                borderRadius: 20,
                                fontSize: 13,
                                fontWeight: 500
                              }}>
                                {getNombrePreceptor(c.preceptor_id)}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin asignar</span>
                            )}
                          </td>
                          <td style={tdStyle}>
                            {c.historial && c.historial.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {c.historial.map((h, i) => {
                                  const prof = profesores.find(p => p.id === h.profesor_id);
                                  return (
                                    <div key={i} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                      {prof?.nombre || 'Desconocido'}
                                      <span style={{ marginLeft: 8, color: 'var(--border-strong)' }}>
                                        {h.vigente_desde} → {h.vigente_hasta}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin historial</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>

        {/* SECCIÓN 2: ASIGNACIÓN RÁPIDA */}
        <section style={{ marginBottom: 40 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>
            Asignación rápida
          </h3>

          {/* ASIGNAR A TODOS */}
          <div style={{ background: 'var(--surface-2)', padding: 20, borderRadius: 10, marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
                Preceptor para asignar a todos los cursos de {tabActiva === 'secundario' ? 'Secundario' : 'FP'}
              </label>
              <select
                value={preceptorTodos}
                onChange={(e) => setPreceptorTodos(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-strong)', fontSize: 14, background: 'var(--surface)' }}
              >
                <option value="">Seleccionar preceptor...</option>
                {profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <button
                onClick={asignarATodos}
                disabled={!preceptorTodos}
                style={{
                  background: !preceptorTodos ? 'var(--border)' : 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: !preceptorTodos ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                Asignar a todos
              </button>
            </div>
          </div>

          {/* GRID DE ASIGNACIÓN INDIVIDUAL */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {(tabActiva === 'secundario' ? cursosSecFiltrados : cursosFPFiltrados).map((c) => (
              <div key={c.id} style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 20,
                transition: 'box-shadow 0.2s'
              }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                    {c.nombre || `${c.anio}° ${c.division}`}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {c.ciclo || `${c.turno} · ${c.anio}`}
                  </div>
                </div>

                <select
                  value={c.preceptor_id || ''}
                  disabled={guardandoId === `${tabActiva === 'secundario' ? 'sec' : 'fp'}-${c.id}`}
                  onChange={(e) => {
                    const fn = tabActiva === 'secundario' ? asignarSecundario : asignarFP;
                    fn(c.id, e.target.value ? Number(e.target.value) : null);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-strong)',
                    fontSize: 14,
                    background: 'var(--surface-2)',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Sin asignar</option>
                  {profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>

                {guardandoId === `${tabActiva === 'secundario' ? 'sec' : 'fp'}-${c.id}` && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                    Guardando...
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* SECCIÓN 3: AGREGAR NUEVO PRECEPTOR */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              Preceptores registrados
            </h3>
            <button
              onClick={() => setMostrarFormNuevo(!mostrarFormNuevo)}
              style={{
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {mostrarFormNuevo ? 'Cancelar' : '+ Nuevo preceptor'}
            </button>
          </div>

          {mostrarFormNuevo && (
            <div style={{ background: 'var(--surface-2)', padding: 24, borderRadius: 10, marginBottom: 20 }}>
              <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={nombreNuevo}
                    onChange={(e) => setNombreNuevo(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-strong)', fontSize: 14, background: 'var(--surface)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
                    Email (opcional)
                  </label>
                  <input
                    type="email"
                    value={emailNuevo}
                    onChange={(e) => setEmailNuevo(e.target.value)}
                    placeholder="email@ejemplo.com"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-strong)', fontSize: 14, background: 'var(--surface)' }}
                  />
                </div>
              </div>
              <button
                onClick={crearPreceptor}
                disabled={creando || !nombreNuevo.trim()}
                style={{
                  background: creando ? 'var(--text-muted)' : 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: creando ? 'not-allowed' : 'pointer'
                }}
              >
                {creando ? 'Creando...' : 'Crear preceptor'}
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
            {profesores.map((p) => (
              <div key={p.id} style={{
                padding: '12px 16px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 14,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: 500 }}>{p.nombre}</span>
                {p.email && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.email}</span>}
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

const thStyle = {
  padding: '14px 16px',
  textAlign: 'left',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  fontWeight: 600
};

const tdStyle = {
  padding: '14px 16px',
  verticalAlign: 'top'
};