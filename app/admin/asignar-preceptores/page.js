'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useSesion } from '@/lib/useSesion';
import Header from '@/components/Header';

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' };
const selectStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-strong)', fontSize: 14, background: 'var(--surface)' };
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-strong)', fontSize: 14, background: 'var(--surface)' };
const thStyle = { padding: '14px 16px', textAlign: 'left', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 };
const tdStyle = { padding: '14px 16px', verticalAlign: 'middle' };

export default function AsignarPreceptoresPage() {
  const { sesion, cargando, autorizado } = useSesion(['directivo']);
  const [cursosSec, setCursosSec] = useState(null);
  const [cursosFP, setCursosFP] = useState(null);
  const [profesores, setProfesores] = useState([]);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [anioFiltro, setAnioFiltro] = useState('todos');
  const [cursoFPFiltro, setCursoFPFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [cursoEditando, setCursoEditando] = useState(null);
  const [preceptorSeleccionado, setPreceptorSeleccionado] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [emailNuevo, setEmailNuevo] = useState('');
  const [creando, setCreando] = useState(false);
  const [esMovil, setEsMovil] = useState(false);

  useEffect(() => {
    const checkMovil = () => setEsMovil(window.innerWidth < 768);
    checkMovil();
    window.addEventListener('resize', checkMovil);
    return () => window.removeEventListener('resize', checkMovil);
  }, []);

  async function cargarTodo() {
    const [{ data: cSec, error: errSec }, { data: cFP, error: errFP }, { data: p }, { data: asigSec }, { data: asigFP }] = await Promise.all([
      supabase.from('cursos').select('id, anio, division, ciclo, modalidad').order('anio').order('division'),
      supabase.from('fp_cursos').select('id, nombre, anio, turno').order('nombre'),
      supabase.from('profesores').select('id, nombre, email, categoria').order('nombre'),
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
      modalidad: c.modalidad || 'Secundario',
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
      modalidad: 'FP',
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
        .insert({ nombre: nombreNuevo.trim(), categoria: 'preceptor', email: emailNuevo.trim() || null })
        .select('id, nombre, email')
        .single();

      if (profError) throw profError;

      setProfesores((prev) => [...prev, prof]);
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

  function abrirModalEdicion(curso, tipo) {
    setCursoEditando({ ...curso, tipo });
    setPreceptorSeleccionado(curso.preceptor_id || '');
  }

  function cerrarModal() {
    setCursoEditando(null);
    setPreceptorSeleccionado('');
  }

  async function guardarAsignacion() {
    if (!cursoEditando) return;
    setGuardando(true);
    setError(null);

    try {
      const hoy = new Date().toISOString().slice(0, 10);
      const tabla = cursoEditando.tipo === 'secundario' ? 'preceptores_curso' : 'fp_cursos_preceptores';
      const campoId = cursoEditando.tipo === 'secundario' ? 'curso_id' : 'fp_curso_id';

      await supabase.from(tabla)
        .update({ vigente_hasta: hoy })
        .eq(campoId, cursoEditando.id)
        .is('vigente_hasta', null);

      if (preceptorSeleccionado) {
        await supabase.from(tabla)
          .insert({
            [campoId]: cursoEditando.id,
            profesor_id: Number(preceptorSeleccionado),
            vigente_desde: hoy,
            vigente_hasta: null
          });
      }

      if (cursoEditando.tipo === 'secundario') {
        setCursosSec((prev) => prev.map((c) => (c.id === cursoEditando.id ? { ...c, preceptor_id: preceptorSeleccionado ? Number(preceptorSeleccionado) : null } : c)));
      } else {
        setCursosFP((prev) => prev.map((c) => (c.id === cursoEditando.id ? { ...c, preceptor_id: preceptorSeleccionado ? Number(preceptorSeleccionado) : null } : c)));
      }

      setMensaje('Asignación actualizada correctamente');
      setTimeout(() => setMensaje(null), 3000);
      cerrarModal();
    } catch (err) {
      setError(`Error al guardar: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarAsignacion() {
    if (!cursoEditando || !confirm('¿Seguro que querés eliminar esta asignación?')) return;

    setGuardando(true);
    setError(null);

    try {
      const hoy = new Date().toISOString().slice(0, 10);
      const tabla = cursoEditando.tipo === 'secundario' ? 'preceptores_curso' : 'fp_cursos_preceptores';
      const campoId = cursoEditando.tipo === 'secundario' ? 'curso_id' : 'fp_curso_id';

      await supabase.from(tabla)
        .update({ vigente_hasta: hoy })
        .eq(campoId, cursoEditando.id)
        .is('vigente_hasta', null);

      if (cursoEditando.tipo === 'secundario') {
        setCursosSec((prev) => prev.map((c) => (c.id === cursoEditando.id ? { ...c, preceptor_id: null } : c)));
      } else {
        setCursosFP((prev) => prev.map((c) => (c.id === cursoEditando.id ? { ...c, preceptor_id: null } : c)));
      }

      setMensaje('Asignación eliminada');
      setTimeout(() => setMensaje(null), 3000);
      cerrarModal();
    } catch (err) {
      setError(`Error al eliminar: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  }

  function getNombrePreceptor(id) {
    const p = profesores.find((x) => x.id === id);
    return p ? p.nombre : '—';
  }

  function filtrarYOrdenarCursos() {
    let todos = [];

    // 1. Filtrar por tipo
    if (tipoFiltro === 'todos') {
      todos = [...(cursosSec || []), ...(cursosFP || [])];
    } else if (tipoFiltro === 'secundario') {
      todos = [...(cursosSec || [])];
    } else if (tipoFiltro === 'fp') {
      todos = [...(cursosFP || [])];
    }

    // 2. Filtrar por año (solo para secundario)
    if (anioFiltro !== 'todos' && tipoFiltro === 'secundario') {
      todos = todos.filter((c) => c.anio === Number(anioFiltro));
    }

    // 3. Filtrar por curso FP específico
    if (cursoFPFiltro !== 'todos' && tipoFiltro === 'fp') {
      todos = todos.filter((c) => c.id === Number(cursoFPFiltro));
    }

    // 4. Búsqueda por texto
    if (busqueda) {
      const q = busqueda.toLowerCase();
      todos = todos.filter((c) => {
        const nombre = c.nombre || `${c.anio || ''}° ${c.division || ''}`;
        const preceptor = getNombrePreceptor(c.preceptor_id).toLowerCase();
        return nombre.toLowerCase().includes(q) || preceptor.includes(q);
      });
    }

    // 5. Ordenar
    todos.sort((a, b) => {
      if (tipoFiltro === 'secundario' || (tipoFiltro === 'todos' && !a.nombre)) {
        const anioA = a.anio || 0;
        const anioB = b.anio || 0;
        if (anioA !== anioB) return anioA - anioB;
        const divA = a.division || '';
        const divB = b.division || '';
        return divA.localeCompare(divB);
      } else {
        const nombreA = a.nombre || '';
        const nombreB = b.nombre || '';
        return nombreA.localeCompare(nombreB);
      }
    });

    return todos;
  }

  if (cargando) return null;
  if (autorizado === false) return (
    <>
      <Header docente={null} titulo="Acceso denegado" />
      <main><div className="status error">No tenés permiso para ver esta pantalla.</div></main>
    </>
  );

  const cursosFiltrados = filtrarYOrdenarCursos();

  return (
    <>
      <Header docente={{ nombre: `${sesion.email} · directivo` }} titulo="Asignación de Preceptores" />
      <main style={{ padding: esMovil ? '1rem' : '2rem', maxWidth: 1200, margin: '0 auto' }}>

        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: esMovil ? 20 : 24, fontWeight: 700, marginBottom: 8 }}>Gestión de Preceptores</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Asigná preceptores a los cursos</p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>
        )}

        {mensaje && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{mensaje}</div>
        )}

        {/* FILTROS */}
        <div style={{ display: 'grid', gridTemplateColumns: esMovil ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div>
            <label style={labelStyle}>Tipo de curso</label>
            <select value={tipoFiltro} onChange={(e) => { setTipoFiltro(e.target.value); setAnioFiltro('todos'); setCursoFPFiltro('todos'); }} style={selectStyle}>
              <option value="todos">Todos los cursos</option>
              <option value="secundario">Secundario (1° a 7°)</option>
              <option value="fp">Formación Profesional</option>
            </select>
          </div>

          {tipoFiltro === 'secundario' && (
            <div>
              <label style={labelStyle}>Año</label>
              <select value={anioFiltro} onChange={(e) => setAnioFiltro(e.target.value)} style={selectStyle}>
                <option value="todos">Todos los años</option>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>{n}° año</option>
                ))}
              </select>
            </div>
          )}

          {tipoFiltro === 'fp' && (
            <div>
              <label style={labelStyle}>Curso FP</label>
              <select value={cursoFPFiltro} onChange={(e) => setCursoFPFiltro(e.target.value)} style={selectStyle}>
                <option value="todos">Todos los cursos FP</option>
                {(cursosFP || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>Buscar</label>
            <input
              type="text"
              placeholder="Curso o preceptor..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* VISTA DESKTOP: TABLA */}
        {!esMovil && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 32 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
                    <th style={thStyle}>Curso</th>
                    <th style={thStyle}>Tipo</th>
                    <th style={thStyle}>Año</th>
                    <th style={thStyle}>Preceptor</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cursosFiltrados.map((c, idx) => {
                    const tipo = c.nombre ? 'fp' : 'secundario';
                    return (
                      <tr key={c.id} style={{ borderBottom: idx < cursosFiltrados.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={tdStyle}>
                          <strong>{c.nombre || `${c.anio}° ${c.division}`}</strong>
                          {c.turno && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{c.turno}</div>}
                        </td>
                        <td style={tdStyle}>
                          <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: c.modalidad === 'FP' ? '#fef3c7' : '#dbeafe', color: c.modalidad === 'FP' ? '#92400e' : '#1e40af' }}>
                            {c.modalidad || 'Secundario'}
                          </span>
                        </td>
                        <td style={tdStyle}>{c.anio}°</td>
                        <td style={tdStyle}>
                          {c.preceptor_id ? (
                            <span style={{ display: 'inline-block', padding: '6px 14px', background: '#dcfce7', color: '#15803d', borderRadius: 20, fontSize: 13, fontWeight: 500 }}>
                              {getNombrePreceptor(c.preceptor_id)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>Sin asignar</span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <button onClick={() => abrirModalEdicion(c, tipo)} style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Editar</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {cursosFiltrados.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron cursos</div>}
          </div>
        )}

        {/* VISTA MÓVIL: TARJETAS */}
        {esMovil && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {cursosFiltrados.map((c) => {
              const tipo = c.nombre ? 'fp' : 'secundario';
              return (
                <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                        {c.nombre || `${c.anio}° ${c.division}`}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {c.turno || c.ciclo}
                      </div>
                    </div>
                    <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, background: c.modalidad === 'FP' ? '#fef3c7' : '#dbeafe', color: c.modalidad === 'FP' ? '#92400e' : '#1e40af', flexShrink: 0, marginLeft: 8 }}>
                      {c.modalidad || 'Secundario'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Preceptor</div>
                      {c.preceptor_id ? (
                        <span style={{ display: 'inline-block', padding: '4px 12px', background: '#dcfce7', color: '#15803d', borderRadius: 20, fontSize: 13, fontWeight: 500 }}>
                          {getNombrePreceptor(c.preceptor_id)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>Sin asignar</span>
                      )}
                    </div>
                    <button
                      onClick={() => abrirModalEdicion(c, tipo)}
                      style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', minWidth: 100 }}
                    >
                      Editar
                    </button>
                  </div>
                </div>
              );
            })}
            {cursosFiltrados.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron cursos</div>
            )}
          </div>
        )}

        {/* PRECEPTORES */}
        <section style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Preceptores ({profesores.length})</h3>
            <button onClick={() => setMostrarFormNuevo(!mostrarFormNuevo)} style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {mostrarFormNuevo ? 'Cancelar' : '+ Nuevo'}
            </button>
          </div>

          {mostrarFormNuevo && (
            <div style={{ background: 'var(--surface-2)', padding: 20, borderRadius: 10, marginBottom: 16 }}>
              <div style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
                <input type="text" placeholder="Nombre completo" value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} style={inputStyle} />
                <input type="email" placeholder="Email (opcional)" value={emailNuevo} onChange={(e) => setEmailNuevo(e.target.value)} style={inputStyle} />
              </div>
              <button onClick={crearPreceptor} disabled={creando || !nombreNuevo.trim()} style={{ background: creando ? 'var(--text-muted)' : 'var(--accent)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: creando ? 'not-allowed' : 'pointer' }}>
                {creando ? 'Creando...' : 'Crear'}
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {profesores.map((p) => (
              <div key={p.id} style={{ padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
                <div style={{ fontWeight: 500 }}>{p.nombre}</div>
                {p.email && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.email}</div>}
              </div>
            ))}
          </div>
        </section>

        {/* MODAL */}
        {cursoEditando && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={cerrarModal}>
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, maxWidth: 450, width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Editar asignación</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>{cursoEditando.nombre || `${cursoEditando.anio}° ${cursoEditando.division}`} — {cursoEditando.turno || cursoEditando.ciclo}</p>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Preceptor</label>
                <select value={preceptorSeleccionado} onChange={(e) => setPreceptorSeleccionado(e.target.value)} style={{ ...selectStyle, width: '100%' }}>
                  <option value="">Sin asignar</option>
                  {profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>

              {cursoEditando.historial && cursoEditando.historial.length > 0 && (
                <div style={{ marginBottom: 20, padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Historial</div>
                  {cursoEditando.historial.map((h, i) => {
                    const prof = profesores.find(p => p.id === h.profesor_id);
                    return (
                      <div key={i} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                        {prof?.nombre} <span style={{ fontSize: 10 }}>{h.vigente_desde} → {h.vigente_hasta}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button onClick={cerrarModal} disabled={guardando} style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border-strong)', padding: '10px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={eliminarAsignacion} disabled={guardando || !cursoEditando.preceptor_id} style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid #fecaca', padding: '10px 16px', borderRadius: 6, fontSize: 13, cursor: guardando || !cursoEditando.preceptor_id ? 'not-allowed' : 'pointer' }}>Eliminar</button>
                <button onClick={guardarAsignacion} disabled={guardando} style={{ background: guardando ? 'var(--text-muted)' : 'var(--accent)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: guardando ? 'not-allowed' : 'pointer' }}>{guardando ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}