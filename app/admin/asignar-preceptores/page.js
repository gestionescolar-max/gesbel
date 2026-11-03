'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useSesion } from '@/lib/useSesion';
import Header from '@/components/Header';

// ✅ ESTILOS MOVIDOS AL PRINCIPIO (después de los imports)
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
  const [modalidadFiltro, setModalidadFiltro] = useState('todos');
  const [anioFiltro, setAnioFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [ordenamiento, setOrdenamiento] = useState('anio_asc');
  const [cursoEditando, setCursoEditando] = useState(null);
  const [preceptorSeleccionado, setPreceptorSeleccionado] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [emailNuevo, setEmailNuevo] = useState('');
  const [creando, setCreando] = useState(false);

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

      await supabase
        .from(tabla)
        .update({ vigente_hasta: hoy })
        .eq(campoId, cursoEditando.id)
        .is('vigente_hasta', null);

      if (preceptorSeleccionado) {
        await supabase
          .from(tabla)
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
    if (!cursoEditando || !confirm('¿Seguro que querés eliminar esta asignación? El preceptor quedará sin asignar.')) return;

    setGuardando(true);
    setError(null);

    try {
      const hoy = new Date().toISOString().slice(0, 10);
      const tabla = cursoEditando.tipo === 'secundario' ? 'preceptores_curso' : 'fp_cursos_preceptores';
      const campoId = cursoEditando.tipo === 'secundario' ? 'curso_id' : 'fp_curso_id';

      await supabase
        .from(tabla)
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

  function filtrarYOrdenarCursos(cursos, tipo) {
    if (!cursos) return [];
    let filtrados = [...cursos];

    // Filtro por modalidad
    if (modalidadFiltro !== 'todos') {
      filtrados = filtrados.filter((c) => c.modalidad === modalidadFiltro);
    }

    // Filtro por año
    if (anioFiltro !== 'todos') {
      filtrados = filtrados.filter((c) => c.anio === Number(anioFiltro));
    }

    // Búsqueda
    if (busqueda) {
      const q = busqueda.toLowerCase();
      filtrados = filtrados.filter((c) => {
        const nombre = c.nombre || `${c.anio || ''}° ${c.division || ''}`;
        const preceptor = getNombrePreceptor(c.preceptor_id).toLowerCase();
        return nombre.toLowerCase().includes(q) || preceptor.includes(q);
      });
    }

    // Ordenamiento ultra-simple (sin localeCompare en valores undefined)
    filtrados.sort((a, b) => {
      const anioA = a.anio || 0;
      const anioB = b.anio || 0;

      if (ordenamiento === 'anio_asc') {
        if (anioA !== anioB) return anioA - anioB;
        const divA = a.division || '';
        const divB = b.division || '';
        if (divA && divB) return divA.localeCompare(divB);
        return 0;
      }

      if (ordenamiento === 'anio_desc') {
        if (anioA !== anioB) return anioB - anioA;
        const divA = a.division || '';
        const divB = b.division || '';
        if (divA && divB) return divB.localeCompare(divA);
        return 0;
      }

      // Por nombre
      const nombreA = a.nombre || `${a.anio || ''}° ${a.division || ''}`;
      const nombreB = b.nombre || `${b.anio || ''}° ${b.division || ''}`;
      return nombreA.localeCompare(nombreB);
    });

    return filtrados;
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

  const cursosSecFiltrados = filtrarYOrdenarCursos(cursosSec || [], 'secundario');
  const cursosFPFiltrados = filtrarYOrdenarCursos(cursosFP || [], 'fp');

  return (
    <>
      <Header docente={{ nombre: `${sesion.email} · directivo` }} titulo="Asignación de Preceptores" />
      <main style={{ padding: '2rem', maxWidth: 1400, margin: '0 auto' }}>

        {/* ENCABEZADO */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Gestión de Preceptores
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 700 }}>
            Visualizá y gestioná las asignaciones de preceptores. Los cambios quedan registrados automáticamente en el historial.
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

        {/* FILTROS */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Modalidad</label>
              <select value={modalidadFiltro} onChange={(e) => setModalidadFiltro(e.target.value)} style={selectStyle}>
                <option value="todos">Todas las modalidades</option>
                <option value="Secundario">Secundario</option>
                <option value="FP">Formación Profesional</option>
                <option value="Técnico">Técnico</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Año</label>
              <select value={anioFiltro} onChange={(e) => setAnioFiltro(e.target.value)} style={selectStyle}>
                <option value="todos">Todos los años</option>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>{n}° año</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Ordenar por</label>
              <select value={ordenamiento} onChange={(e) => setOrdenamiento(e.target.value)} style={selectStyle}>
                <option value="anio_asc">Año (ascendente)</option>
                <option value="anio_desc">Año (descendente)</option>
                <option value="nombre">Nombre del curso</option>
              </select>
            </div>
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
        </section>

        {/* TABLA DE ASIGNACIONES */}
        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>
            Asignaciones vigentes
          </h3>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
                    <th style={thStyle}>Curso</th>
                    <th style={thStyle}>Modalidad</th>
                    <th style={thStyle}>Año</th>
                    <th style={thStyle}>Preceptor asignado</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {[...cursosSecFiltrados, ...cursosFPFiltrados].map((c, idx) => {
                    const tipo = c.nombre ? 'fp' : 'secundario';
                    return (
                      <tr key={c.id} style={{ borderBottom: idx < cursosSecFiltrados.length + cursosFPFiltrados.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={tdStyle}>
                          <strong>{c.nombre || `${c.anio}° ${c.division}`}</strong>
                          {c.turno && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{c.turno}</div>}
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 500,
                            background: c.modalidad === 'FP' ? '#fef3c7' : '#dbeafe',
                            color: c.modalidad === 'FP' ? '#92400e' : '#1e40af'
                          }}>
                            {c.modalidad || 'Secundario'}
                          </span>
                        </td>
                        <td style={tdStyle}>{c.anio}°</td>
                        <td style={tdStyle}>
                          {c.preceptor_id ? (
                            <span style={{
                              display: 'inline-block',
                              padding: '6px 14px',
                              background: '#dcfce7',
                              color: '#15803d',
                              borderRadius: 20,
                              fontSize: 13,
                              fontWeight: 500
                            }}>
                              {getNombrePreceptor(c.preceptor_id)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>Sin asignar</span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <button
                            onClick={() => abrirModalEdicion(c, tipo)}
                            style={{
                              background: 'var(--accent)',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: 6,
                              fontSize: 13,
                              fontWeight: 500,
                              cursor: 'pointer',
                              transition: 'background 0.2s'
                            }}
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {cursosSecFiltrados.length + cursosFPFiltrados.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                No se encontraron cursos con los filtros seleccionados
              </div>
            )}
          </div>
        </section>

        {/* GESTIÓN DE PRECEPTORES */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              Personal registrado ({profesores.length})
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
                cursor: 'pointer'
              }}
            >
              {mostrarFormNuevo ? 'Cancelar' : '+ Nuevo preceptor'}
            </button>
          </div>

          {mostrarFormNuevo && (
            <div style={{ background: 'var(--surface-2)', padding: 24, borderRadius: 10, marginBottom: 20 }}>
              <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Nombre completo *</label>
                  <input
                    type="text"
                    value={nombreNuevo}
                    onChange={(e) => setNombreNuevo(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email (opcional)</label>
                  <input
                    type="email"
                    value={emailNuevo}
                    onChange={(e) => setEmailNuevo(e.target.value)}
                    placeholder="email@ejemplo.com"
                    style={inputStyle}
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {profesores.map((p) => (
              <div key={p.id} style={{
                padding: '14px 18px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 14,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>{p.nombre}</div>
                  {p.email && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.email}</div>}
                </div>
                <span style={{
                  fontSize: 11,
                  padding: '3px 10px',
                  borderRadius: 12,
                  background: 'var(--surface-2)',
                  color: 'var(--text-muted)',
                  textTransform: 'capitalize'
                }}>
                  {p.categoria || 'preceptor'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* MODAL DE EDICIÓN */}
        {cursoEditando && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20
          }} onClick={cerrarModal}>
            <div style={{
              background: 'var(--surface)',
              borderRadius: 12,
              padding: 32,
              maxWidth: 500,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                Editar asignación
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
                {cursoEditando.nombre || `${cursoEditando.anio}° ${cursoEditando.division}`} — {cursoEditando.turno || cursoEditando.ciclo}
              </p>

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Preceptor asignado</label>
                <select
                  value={preceptorSeleccionado}
                  onChange={(e) => setPreceptorSeleccionado(e.target.value)}
                  style={{ ...selectStyle, width: '100%' }}
                >
                  <option value="">Sin asignar</option>
                  {profesores.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              {cursoEditando.historial && cursoEditando.historial.length > 0 && (
                <div style={{ marginBottom: 24, padding: 16, background: 'var(--surface-2)', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                    Historial de asignaciones
                  </div>
                  {cursoEditando.historial.map((h, i) => {
                    const prof = profesores.find(p => p.id === h.profesor_id);
                    return (
                      <div key={i} style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                        {prof?.nombre || 'Desconocido'}
                        <span style={{ marginLeft: 8, fontSize: 11 }}>
                          {h.vigente_desde} → {h.vigente_hasta}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={cerrarModal}
                  disabled={guardando}
                  style={{
                    background: 'var(--surface-2)',
                    color: 'var(--text)',
                    border: '1px solid var(--border-strong)',
                    padding: '10px 20px',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={eliminarAsignacion}
                  disabled={guardando || !cursoEditando.preceptor_id}
                  style={{
                    background: 'var(--danger-bg)',
                    color: 'var(--danger)',
                    border: '1px solid #fecaca',
                    padding: '10px 20px',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: guardando || !cursoEditando.preceptor_id ? 'not-allowed' : 'pointer'
                  }}
                >
                  Eliminar
                </button>
                <button
                  onClick={guardarAsignacion}
                  disabled={guardando}
                  style={{
                    background: guardando ? 'var(--text-muted)' : 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: guardando ? 'not-allowed' : 'pointer'
                  }}
                >
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}