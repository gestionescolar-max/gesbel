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

  // Para agregar nuevo preceptor
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [emailNuevo, setEmailNuevo] = useState('');
  const [creando, setCreando] = useState(false);

  // Para asignar a todos
  const [preceptorTodos, setPreceptorTodos] = useState('');

  async function cargarTodo() {
    const [{ data: cSec, error: errSec }, { data: cFP, error: errFP }, { data: p }, { data: asigSec }, { data: asigFP }] = await Promise.all([
      supabase.from('cursos').select('id, anio, division, ciclo').order('ciclo', { ascending: false }).order('anio').order('division'),
      supabase.from('fp_cursos').select('id, nombre, anio, turno').order('anio', { ascending: false }).order('nombre'),
      supabase.from('profesores').select('id, nombre, email').order('nombre'),
      supabase.from('preceptores_curso').select('curso_id, profesor_id, vigente_desde, vigente_hasta').order('vigente_desde', { ascending: false }),
      supabase.from('fp_cursos_preceptores').select('fp_curso_id, profesor_id, vigente_desde, vigente_hasta').order('vigente_desde', { ascending: false }),
    ]);

    if (errSec || errFP) { setError(errSec?.message || errFP?.message); return; }

    // Procesar asignaciones de Secundario (solo vigentes)
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

    // Procesar asignaciones de FP
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

    // Crear usuario en auth (si hay email)
    let userId = null;
    if (emailNuevo) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: emailNuevo,
        password: 'temporal123',
        email_confirm: true
      });
      if (authError) {
        setError('Error al crear usuario: ' + authError.message);
        setCreando(false);
        return;
      }
      userId = authData.user.id;
    }

    // Crear profesor
    const { data: prof, error: profError } = await supabase
      .from('profesores')
      .insert({ nombre: nombreNuevo.trim(), categoria: 'preceptor' })
      .select('id')
      .single();

    if (profError) {
      setError('Error al crear profesor: ' + profError.message);
      setCreando(false);
      return;
    }

    // Crear perfil si hay userId
    if (userId) {
      await supabase.from('perfiles').insert({
        user_id: userId,
        profesor_id: prof.id,
        rol: 'preceptor',
        es_preceptor: true
      });
    }

    setProfesores((prev) => [...prev, { id: prof.id, nombre: nombreNuevo.trim(), email: emailNuevo }]);
    setNombreNuevo('');
    setEmailNuevo('');
    setMostrarFormNuevo(false);
    setCreando(false);
  }

  async function asignarSecundario(cursoId, profesorId) {
    setGuardandoId(`sec-${cursoId}`);
    setError(null);

    try {
      const hoy = new Date().toISOString().slice(0, 10);

      // 1. Cerrar asignación vigente actual
      const { error: errUpdate } = await supabase
        .from('preceptores_curso')
        .update({ vigente_hasta: hoy })
        .eq('curso_id', cursoId)
        .is('vigente_hasta', null);

      if (errUpdate && errUpdate.code !== 'PGRST116') throw errUpdate;

      // 2. Crear nueva asignación
      if (profesorId) {
        const { error: errInsert } = await supabase
          .from('preceptores_curso')
          .insert({
            curso_id: cursoId,
            profesor_id: profesorId,
            vigente_desde: hoy,
            vigente_hasta: null
          });

        if (errInsert) {
          // Si es conflicto, hacer upsert
          if (errInsert.code === '23505') {
            const { error: errUpsert } = await supabase
              .from('preceptores_curso')
              .upsert({
                curso_id: cursoId,
                profesor_id: profesorId,
                vigente_desde: hoy,
                vigente_hasta: null
              }, { onConflict: 'curso_id,profesor_id,vigente_hasta' });

            if (errUpsert) throw errUpsert;
          } else {
            throw errInsert;
          }
        }
      }

      setCursosSec((prev) => prev.map((c) => (c.id === cursoId ? { ...c, preceptor_id: profesorId } : c)));
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

      const { error: errUpdate } = await supabase
        .from('fp_cursos_preceptores')
        .update({ vigente_hasta: hoy })
        .eq('fp_curso_id', cursoId)
        .is('vigente_hasta', null);

      if (errUpdate && errUpdate.code !== 'PGRST116') throw errUpdate;

      if (profesorId) {
        const { error: errInsert } = await supabase
          .from('fp_cursos_preceptores')
          .insert({
            fp_curso_id: cursoId,
            profesor_id: profesorId,
            vigente_desde: hoy,
            vigente_hasta: null
          });

        if (errInsert) {
          if (errInsert.code === '23505') {
            const { error: errUpsert } = await supabase
              .from('fp_cursos_preceptores')
              .upsert({
                fp_curso_id: cursoId,
                profesor_id: profesorId,
                vigente_desde: hoy,
                vigente_hasta: null
              }, { onConflict: 'fp_curso_id,profesor_id,vigente_hasta' });

            if (errUpsert) throw errUpsert;
          } else {
            throw errInsert;
          }
        }
      }

      setCursosFP((prev) => prev.map((c) => (c.id === cursoId ? { ...c, preceptor_id: profesorId } : c)));
    } catch (err) {
      setError(`Error al asignar: ${err.message}`);
    } finally {
      setGuardandoId(null);
    }
  }

  async function asignarATodos(tipo) {
    if (!preceptorTodos) return;
    if (!confirm(`¿Asignar este preceptor a todos los cursos de ${tipo === 'secundario' ? 'Secundario' : 'FP'}?`)) return;

    const cursos = tipo === 'secundario' ? cursosSec : cursosFP;
    const asignarFn = tipo === 'secundario' ? asignarSecundario : asignarFP;

    for (const curso of cursos) {
      await asignarFn(curso.id, Number(preceptorTodos));
    }
  }

  function getNombrePreceptor(id) {
    const p = profesores.find((x) => x.id === id);
    return p ? p.nombre : 'Sin asignar';
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
      <Header docente={null} />
      <main>
        <div className="status error">No tenés permiso para ver esta pantalla.</div>
      </main>
    </>
  );

  const cursosSecFiltrados = filtrarCursos(cursosSec || []);
  const cursosFPFiltrados = filtrarCursos(cursosFP || []);

  return (
    <>
      <Header docente={{ nombre: `${sesion.email} · directivo` }} />
      <main style={{ padding: '1rem', maxWidth: 1200, margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
            Gestión de Preceptores
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Asigná preceptores a los cursos. Al cambiar un preceptor, el anterior queda registrado como suplente en el historial.
          </p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* SECCIÓN: AGREGAR NUEVO PRECEPTOR */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Preceptores registrados</h3>
            <button
              onClick={() => setMostrarFormNuevo(!mostrarFormNuevo)}
              style={{
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {mostrarFormNuevo ? 'Cancelar' : '+ Nuevo preceptor'}
            </button>
          </div>

          {mostrarFormNuevo && (
            <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 8, marginTop: 12 }}>
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={nombreNuevo}
                    onChange={(e) => setNombreNuevo(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>
                    Email (opcional)
                  </label>
                  <input
                    type="email"
                    value={emailNuevo}
                    onChange={(e) => setEmailNuevo(e.target.value)}
                    placeholder="email@ejemplo.com"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }}
                  />
                </div>
              </div>
              <button
                onClick={crearPreceptor}
                disabled={creando || !nombreNuevo.trim()}
                style={{
                  marginTop: 12,
                  background: creando ? 'var(--text-muted)' : 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: creando ? 'not-allowed' : 'pointer'
                }}
              >
                {creando ? 'Creando...' : 'Crear preceptor'}
              </button>
            </div>
          )}

          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {profesores.map((p) => (
              <span key={p.id} style={{
                padding: '6px 12px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                fontSize: 13
              }}>
                {p.nombre}
              </span>
            ))}
          </div>
        </div>

        {/* BÚSQUEDA */}
        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Buscar curso o preceptor..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid var(--border-strong)',
              fontSize: 14,
              background: 'var(--surface)',
            }}
          />
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid var(--border)' }}>
          <button
            onClick={() => setTabActiva('secundario')}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              color: tabActiva === 'secundario' ? 'var(--accent)' : 'var(--text-muted)',
              border: 'none',
              borderBottom: tabActiva === 'secundario' ? '2px solid var(--accent)' : '2px solid transparent',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: -2
            }}
          >
            Secundario ({cursosSecFiltrados.length})
          </button>
          <button
            onClick={() => setTabActiva('fp')}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              color: tabActiva === 'fp' ? 'var(--accent)' : 'var(--text-muted)',
              border: 'none',
              borderBottom: tabActiva === 'fp' ? '2px solid var(--accent)' : '2px solid transparent',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: -2
            }}
          >
            Formación Profesional ({cursosFPFiltrados.length})
          </button>
        </div>

        {/* ASIGNAR A TODOS */}
        <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 8, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Asignar preceptor a todos los cursos:</span>
          <select
            value={preceptorTodos}
            onChange={(e) => setPreceptorTodos(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }}
          >
            <option value="">Seleccionar preceptor...</option>
            {profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <button
            onClick={() => asignarATodos(tabActiva)}
            disabled={!preceptorTodos}
            style={{
              background: !preceptorTodos ? 'var(--border)' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              padding: '8px 20px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: !preceptorTodos ? 'not-allowed' : 'pointer'
            }}
          >
            Asignar a todos
          </button>
        </div>

        {/* CONTENIDO SECUNDARIO */}
        {tabActiva === 'secundario' && (
          <div>
            {cursosSec === null && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Cargando...</div>}
            {cursosSecFiltrados.length === 0 && cursosSec !== null && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                No se encontraron cursos
              </div>
            )}
            <div style={{ display: 'grid', gap: 12 }}>
              {cursosSecFiltrados.map((c) => (
                <div key={c.id} style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 20,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                        {c.anio}° {c.division}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {c.ciclo}
                      </div>
                    </div>
                    {c.preceptor_id && (
                      <span style={{
                        fontSize: 11,
                        padding: '4px 12px',
                        borderRadius: 20,
                        background: '#dcfce7',
                        color: '#15803d',
                        fontWeight: 600,
                      }}>
                        Asignado
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <select
                      value={c.preceptor_id || ''}
                      disabled={guardandoId === `sec-${c.id}`}
                      onChange={(e) => asignarSecundario(c.id, e.target.value ? Number(e.target.value) : null)}
                      style={{
                        flex: 1,
                        minWidth: 200,
                        padding: '10px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--border-strong)',
                        fontSize: 14,
                        background: 'var(--surface-2)',
                      }}
                    >
                      <option value="">Sin asignar</option>
                      {profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                    {guardandoId === `sec-${c.id}` && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Guardando...</span>
                    )}
                  </div>

                  {c.historial && c.historial.length > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                        Historial de preceptores:
                      </div>
                      {c.historial.map((h, idx) => {
                        const prof = profesores.find(p => p.id === h.profesor_id);
                        return (
                          <div key={idx} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                            {prof?.nombre || 'Desconocido'} ({h.vigente_desde} - {h.vigente_hasta || 'actual'})
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTENIDO FP */}
        {tabActiva === 'fp' && (
          <div>
            {cursosFP === null && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Cargando...</div>}
            {cursosFPFiltrados.length === 0 && cursosFP !== null && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                No se encontraron cursos
              </div>
            )}
            <div style={{ display: 'grid', gap: 12 }}>
              {cursosFPFiltrados.map((c) => (
                <div key={c.id} style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 20,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                        {c.nombre}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {c.turno} · {c.anio}
                      </div>
                    </div>
                    {c.preceptor_id && (
                      <span style={{
                        fontSize: 11,
                        padding: '4px 12px',
                        borderRadius: 20,
                        background: '#dcfce7',
                        color: '#15803d',
                        fontWeight: 600,
                      }}>
                        Asignado
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <select
                      value={c.preceptor_id || ''}
                      disabled={guardandoId === `fp-${c.id}`}
                      onChange={(e) => asignarFP(c.id, e.target.value ? Number(e.target.value) : null)}
                      style={{
                        flex: 1,
                        minWidth: 200,
                        padding: '10px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--border-strong)',
                        fontSize: 14,
                        background: 'var(--surface-2)',
                      }}
                    >
                      <option value="">Sin asignar</option>
                      {profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                    {guardandoId === `fp-${c.id}` && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Guardando...</span>
                    )}
                  </div>

                  {c.historial && c.historial.length > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                        Historial de preceptores:
                      </div>
                      {c.historial.map((h, idx) => {
                        const prof = profesores.find(p => p.id === h.profesor_id);
                        return (
                          <div key={idx} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                            {prof?.nombre || 'Desconocido'} ({h.vigente_desde} - {h.vigente_hasta || 'actual'})
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}