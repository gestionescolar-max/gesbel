'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useSesion } from '@/lib/useSesion';
import Header from '@/components/Header';

const CICLO_FP = 2027; // ciclo lectivo de las ofertas de Formación Profesional

export default function PreinscripcionFpPage() {
    const { sesion, cargando, autorizado } = useSesion(['preceptor', 'directivo']);

    const [ofertas, setOfertas] = useState(null);
    const [alumnos, setAlumnos] = useState([]);
    const [cursos, setCursos] = useState([]);
    const [cursoId, setCursoId] = useState('');
    const [nuevoCurso, setNuevoCurso] = useState({ anio: '', division: '', turno: '' });
    const [generarCurso, setGenerarCurso] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [selected, setSelected] = useState([]);
    const [status, setStatus] = useState(null);
    const [tab, setTab] = useState('nueva'); // nueva | listas

    // ---------- carga inicial ----------
    const cargarOfertas = useCallback(async () => {
        // Primero resolvemos el id del ciclo lectivo 2027 (si la tabla existe) y filtramos por él.
        let cicloId = null;
        const { data: cil2027 } = await supabase.from('ciclos_lectivos').select('id').eq('anio', CICLO_FP).maybeSingle();
        if (cil2027) cicloId = cil2027.id;
        let query = supabase
            .from('ofertas_fp')
            .select(`id, titulo, especialidad, cupo, horario, aula, descripcion, activa, ciclo_lectivo_id, fp_perfil_id,
               preceptor:preceptores!ofertas_fp_preceptor_id_fkey ( id, nombre ),
               preinscripciones_fp ( id, estado, curso_id, alumnos ( id, nombre, dni ) )`)
            .order('titulo');
        if (cicloId != null) query = query.eq('ciclo_lectivo_id', cicloId);
        const { data, error } = await query;
        if (error) { setStatus({ tipo: 'error', mensaje: `Error cargando ofertas: ${error.message}` }); setOfertas([]); return; }
        setOfertas(data || []);
    }, []);

    useEffect(() => {
        if (!autorizado) return;
        (async () => {
            const [{ data: alu }, { data: cur }] = await Promise.all([
                supabase.from('alumnos').select('id, nombre, dni').order('nombre'),
                supabase.from('cursos').select('id, anio, division, ciclo').eq('anio', CICLO_FP).order('anio').order('division'),
            ]);
            setAlumnos(alu || []);
            setCursos(cur || []);
            cargarOfertas();
        })();
    }, [autorizado, cargarOfertas]);

    const ofertasActivas = useMemo(() => (ofertas || []).filter((o) => o.activa), [ofertas]);
    const totalPreinscriptos = useMemo(
        () => (ofertas || []).reduce((acc, o) => acc + (o.preinscripciones_fp || []).filter((p) => p.estado !== 'anulada').length, 0),
        [ofertas]
    );

    const resultadosBusqueda = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        if (!q) return [];
        return alumnos.filter((a) => a.nombre.toLowerCase().includes(q) || String(a.dni || '').includes(q)).slice(0, 12);
    }, [busqueda, alumnos]);

    // ---------- acciones ----------
    function toggle(ofertaId, alumnoId) {
        setSelected((prev) => {
            const existe = prev.some((s) => s.ofertaId === ofertaId && s.alumnoId === alumnoId);
            if (existe) return prev.filter((s) => !(s.ofertaId === ofertaId && s.alumnoId === alumnoId));
            return [...prev, { ofertaId, alumnoId }];
        });
    }

    async function confirmarPreinscripciones() {
        if (selected.length === 0) return;
        setStatus({ tipo: 'loading', mensaje: 'Registrando preinscripciones…' });
        const filas = selected.map((s) => ({ oferta_id: s.ofertaId, alumno_id: s.alumnoId, estado: 'pendiente' }));
        const { error } = await supabase.from('preinscripciones_fp').insert(filas);
        if (error) { setStatus({ tipo: 'error', mensaje: error.message.includes('duplicate') ? 'Alguno de los alumnos ya estaba preinscripto en esa oferta.' : error.message }); return; }

        // opcional: inscribir además en el curso elegido para el ciclo 2027
        if (cursoId) {
            const ids = [...new Set(selected.map((s) => s.alumnoId))];
            const { data: yaInscriptos } = await supabase.from('inscripciones').select('alumno_id').eq('curso_id', Number(cursoId)).in('alumno_id', ids);
            const omitidos = new Set((yaInscriptos || []).map((r) => r.alumno_id));
            const aInsertar = ids.filter((id) => !omitidos.has(id)).map((id) => ({ alumno_id: id, curso_id: Number(cursoId) }));
            if (aInsertar.length > 0) {
                const { error: errInsc } = await supabase.from('inscripciones').insert(aInsertar);
                if (errInsc) setStatus({ tipo: 'error', mensaje: `Preinscripciones OK, pero falló la inscripción al curso: ${errInsc.message}` });
            }
        }

        setStatus({ tipo: 'ok', mensaje: `${selected.length} preinscripción(es) registrada(s).` });
        setSelected([]); setBusqueda(''); setCursoId(''); setGenerarCurso(false); setNuevoCurso({ anio: '', division: '', turno: '' });
        setTab('listas');
        cargarOfertas();
    }

    async function cambiarEstado(preinscripcionId, estado) {
        const { error } = await supabase.from('preinscripciones_fp').update({ estado }).eq('id', preinscripcionId);
        if (error) { setStatus({ tipo: 'error', mensaje: error.message }); return; }
        cargarOfertas();
    }

    async function crearCursoYVincular(oferta) {
        const anio = Number(nuevoCurso.anio || CICLO_FP);
        if (!nuevoCurso.division.trim()) { setStatus({ tipo: 'error', mensaje: 'Para generar el curso hacés falta división (y opcionalmente año y turno).' }); return; }
        setStatus({ tipo: 'loading', mensaje: 'Creando curso…' });
        // cursos exige plan_id y ciclo_lectivo_id: los tomamos de la propia oferta cuando existen
        const payload = { anio, division: nuevoCurso.division.trim(), ciclo: 'Formación Profesional', turno: nuevoCurso.turno.trim() || null };
        // el plan de la oferta viene de fp_perfiles (FP), no del secundario
        if (oferta.fp_perfil_id) payload.fp_perfil_id = oferta.fp_perfil_id;
        if (oferta.ciclo_lectivo_id) payload.ciclo_lectivo_id = oferta.ciclo_lectivo_id;
        const { data: curso, error: errCurso } = await supabase
            .from('cursos')
            .insert(payload)
            .select('id').single();
        if (errCurso) { setStatus({ tipo: 'error', mensaje: `No se pudo crear el curso: ${errCurso.message}. Verificá que la oferta tenga plan y ciclo lectivo cargados.` }); return; }
        const inscriptos = (oferta.preinscripciones_fp || []).filter((p) => p.estado !== 'anulada').map((p) => ({ alumno_id: p.alumnos.id, curso_id: curso.id }));
        if (inscriptos.length > 0) await supabase.from('inscripciones').insert(inscriptos);
        await supabase.from('preinscripciones_fp').update({ estado: 'confirmada', curso_id: curso.id }).eq('oferta_id', oferta.id);
        setStatus({ tipo: 'ok', mensaje: `Curso ${anio}° "${nuevoCurso.division}" (FP) creado e inscriptos ${inscriptos.length} alumno(s).` });
        setGenerarCurso(false); setNuevoCurso({ anio: '', division: '', turno: '' });
        setCursos((prev) => [...prev, { id: curso.id, anio, division: nuevoCurso.division, ciclo: 'Formación Profesional' }]);
        cargarOfertas();
    }

    // ---------- render ----------
    if (cargando) return null;
    if (autorizado === false) return (<><Header docente={null} /><main><div className="status error">No tenés permiso para ver esta pantalla (hace falta rol de preceptor o directivo).</div></main></>);

    return (
        <>
            <Header docente={{ nombre: `${sesion.email} · preceptor` }} />
            <main>
                <div className="toolbar">
                    <div className="titulo">
                        <h2>Preinscripción FP — ciclo {CICLO_FP}</h2>
                        <p>Cursos de Formación Profesional ofrecidos por la escuela · {totalPreinscriptos} preinscriptos en total</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className={tab === 'nueva' ? 'btn block' : ''} style={tab !== 'nueva' ? btnGhost : undefined} onClick={() => setTab('nueva')}>Nueva preinscripción</button>
                        <button className={tab === 'listas' ? 'btn block' : ''} style={tab !== 'listas' ? btnGhost : undefined} onClick={() => setTab('listas')}>Listas por oferta</button>
                    </div>
                </div>

                {ofertas === null && <div className="empty">Cargando ofertas…</div>}
                {ofertas !== null && ofertas.length === 0 && (
                    <div className="empty"><div className="icon">🗂️</div>No hay ofertas de FP cargadas para el ciclo {CICLO_FP}. Pedile a dirección que las cargue en Administración → Carga: Ofertas FP.</div>
                )}

                {tab === 'nueva' && ofertas !== null && ofertasActivas.length > 0 && (
                    <div className="center-card" style={{ margin: '0 0 24px 0', maxWidth: 640 }}>
                        <h2 style={{ marginBottom: 12 }}>Anotar alumnos a una oferta</h2>
                        <div className="field">
                            <label>Buscar alumno (por nombre o DNI)</label>
                            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Ej: Pérez o 38123456" />
                        </div>
                        {busqueda.trim() && (
                            resultadosBusqueda.length === 0
                                ? <p className="hint">No encontramos alumnos con ese nombre/DNI. Cargalos primero en Administración → Alumnos.</p>
                                : (
                                    <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 14, maxHeight: 220, overflowY: 'auto' }}>
                                        {resultadosBusqueda.map((a) => (
                                            <div key={a.id} style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', fontSize: 13 }}>
                                                <span>{a.nombre} <span style={{ color: 'var(--text-muted)' }}>({a.dni || 'sin DNI'})</span></span>
                                                <span style={{ float: 'right', display: 'flex', gap: 6 }}>
                                                    {ofertasActivas.map((o) => {
                                                        const activo = selected.some((s) => s.ofertaId === o.id && s.alumnoId === a.id);
                                                        return (
                                                            <button key={o.id} title={o.titulo} onClick={() => toggle(o.id, a.id)}
                                                                style={{
                                                                    fontSize: 11, padding: '2px 8px', borderRadius: 12, cursor: 'pointer',
                                                                    background: activo ? 'var(--accent-bg)' : 'var(--surface-2)',
                                                                    border: `1px solid ${activo ? 'var(--accent-border)' : 'var(--border)'}`,
                                                                    color: activo ? 'var(--accent)' : 'var(--text-muted)', fontWeight: activo ? 700 : 400
                                                                }}>
                                                                {o.titulo.length > 18 ? o.titulo.slice(0, 18) + '…' : o.titulo}
                                                            </button>
                                                        );
                                                    })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )
                        )}

                        <div className="field" style={{ maxWidth: 320 }}>
                            <label>Curso del ciclo {CICLO_FP} (opcional — también queda como inscripción definitiva)</label>
                            <select value={cursoId} onChange={(e) => setCursoId(e.target.value)}>
                                <option value="">— Sin curso —</option>
                                {cursos.map((c) => <option key={c.id} value={c.id}>{c.anio}° {c.division} — {c.ciclo}</option>)}
                            </select>
                            <label style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center', fontWeight: 400 }}>
                                <input type="checkbox" checked={generarCurso} onChange={(e) => setGenerarCurso(e.target.checked)} />
                                Generar un curso nuevo para esta oferta
                            </label>
                            {generarCurso && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                    <input type="number" placeholder={`Año (${CICLO_FP})`} value={nuevoCurso.anio} onChange={(e) => setNuevoCurso({ ...nuevoCurso, anio: e.target.value })} />
                                    <input placeholder="División (ej: 1RA)" value={nuevoCurso.division} onChange={(e) => setNuevoCurso({ ...nuevoCurso, division: e.target.value })} />
                                    <input placeholder="Turno" value={nuevoCurso.turno} onChange={(e) => setNuevoCurso({ ...nuevoCurso, turno: e.target.value })} />
                                </div>
                            )}
                        </div>

                        {selected.length > 0 && (
                            <div className="status loading" style={{ marginBottom: 10 }}>
                                {selected.length} selección(es): {selected.map((s) => `${alumnos.find((a) => a.id === s.alumnoId)?.nombre} → ${ofertasActivas.find((o) => o.id === s.ofertaId)?.titulo}`).join(' · ')}
                            </div>
                        )}
                        <button className="btn block" onClick={confirmarPreinscripciones} disabled={selected.length === 0}>Confirmar preinscripciones</button>
                        {status && <div className={`status ${status.tipo}`}>{status.mensaje}</div>}
                    </div>
                )}

                {tab === 'listas' && ofertas !== null && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        {ofertas.map((o) => {
                            const vigentes = (o.preinscripciones_fp || []).filter((p) => p.estado !== 'anulada');
                            const lleno = o.cupo != null && vigentes.length >= o.cupo;
                            return (
                                <div key={o.id} style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)', padding: 16 }}>
                                    <div className="toolbar" style={{ marginBottom: 8 }}>
                                        <div className="titulo">
                                            <h2>{o.titulo} {!o.activa && <span style={{ fontSize: 11, color: 'var(--danger)' }}>(inactiva)</span>}</h2>
                                            <p>{o.especialidad || 'FP'}{o.horario ? ` · ${o.horario}` : ''}{o.aula ? ` · Aula ${o.aula}` : ''}{o.preceptor ? ` · Preceptor: ${o.preceptor.nombre}` : ''}</p>
                                            {o.descripcion && <p style={{ marginTop: 4 }}>{o.descripcion}</p>}
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: lleno ? 'var(--danger)' : 'var(--success)' }}>
                                            {vigentes.length}{o.cupo != null ? ` / ${o.cupo}` : ''} preinscriptos {lleno ? '— cupo completo' : ''}
                                        </div>
                                    </div>

                                    {vigentes.length === 0
                                        ? <div className="empty" style={{ padding: '10px 0' }}>Todavía no hay preinscriptos en esta oferta.</div>
                                        : (
                                            <div style={{ overflowX: 'auto' }}>
                                                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                                                    <thead><tr style={{ background: 'var(--surface-2)' }}><th style={th}>Alumno</th><th style={th}>DNI</th><th style={th}>Estado</th><th style={th}>Acción</th></tr></thead>
                                                    <tbody>
                                                        {[...(o.preinscripciones_fp || [])].sort((a, b) => (a.alumnos?.nombre || '').localeCompare(b.alumnos?.nombre || '')).map((p) => (
                                                            <tr key={p.id} style={{ borderTop: '1px solid var(--border)', opacity: p.estado === 'anulada' ? 0.5 : 1 }}>
                                                                <td style={td}>{p.alumnos?.nombre}</td>
                                                                <td style={td}>{p.alumnos?.dni || '—'}</td>
                                                                <td style={td}><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: p.estado === 'confirmada' ? '#f0fdf4' : p.estado === 'anulada' ? 'var(--danger-bg)' : 'var(--amber-bg)', color: p.estado === 'confirmada' ? 'var(--success)' : p.estado === 'anulada' ? 'var(--danger)' : 'var(--amber)' }}>{p.estado}</span></td>
                                                                <td style={td}>
                                                                    {p.estado === 'pendiente' && (<>
                                                                        <button style={linkBtnOk} onClick={() => cambiarEstado(p.id, 'confirmada')}>Confirmar</button>
                                                                        <button style={linkBtnDanger} onClick={() => cambiarEstado(p.id, 'anulada')}>Anular</button>
                                                                    </>)}
                                                                    {p.estado === 'anulada' && <button style={linkBtnOk} onClick={() => cambiarEstado(p.id, 'pendiente')}>Reactivar</button>}
                                                                    {p.estado === 'confirmada' && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.curso_id ? 'Inscripto en curso ✓' : '—'}</span>}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                    {generarCurso && (
                                        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <input type="number" placeholder={`Año (${CICLO_FP})`} value={nuevoCurso.anio} onChange={(e) => setNuevoCurso({ ...nuevoCurso, anio: e.target.value })} style={{ width: 90 }} />
                                            <input placeholder="División" value={nuevoCurso.division} onChange={(e) => setNuevoCurso({ ...nuevoCurso, division: e.target.value })} style={{ width: 120 }} />
                                            <input placeholder="Turno" value={nuevoCurso.turno} onChange={(e) => setNuevoCurso({ ...nuevoCurso, turno: e.target.value })} style={{ width: 120 }} />
                                            <button className="btn" onClick={() => crearCursoYVincular(o)}>Crear curso e inscribir</button>
                                            <button style={linkBtnDanger} onClick={() => setGenerarCurso(false)}>Cancelar</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {status && tab === 'listas' && <div className={`status ${status.tipo}`}>{status.mensaje}</div>}
                    </div>
                )}
            </main>
        </>
    );
}

const th = { padding: '8px 10px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.03em', color: 'var(--text-muted)' };
const td = { padding: '8px 10px' };
const btnGhost = { background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer' };
const linkBtnOk = { background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', fontSize: 12, marginRight: 8, fontWeight: 600 };
const linkBtnDanger = { background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 12, fontWeight: 600 };
