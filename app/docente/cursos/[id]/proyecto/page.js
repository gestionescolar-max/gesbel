'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Sidebar from '@/components/Sidebar';

export default function ProyectoAulicoPage() {
    const params = useParams();
    const router = useRouter();
    const { docente, cargando: cargandoDocente } = useDocente();
    const cursoId = params?.id ? Number(params.id) : null;

    const [curso, setCurso] = useState(null);
    const [funciones, setFunciones] = useState([]);
    const [capacidadesPorFuncion, setCapacidadesPorFuncion] = useState({});
    const [proyecto, setProyecto] = useState(null);
    const [seleccionadas, setSeleccionadas] = useState(new Set());
    const [estadoCapacidad, setEstadoCapacidad] = useState({});
    const [conNotas, setConNotas] = useState(new Set());
    const [inscripcionIds, setInscripcionIds] = useState([]);

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState(null);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [form, setForm] = useState({ titulo: '', descripcion: '', archivo_url: '' });
    const [uid, setUid] = useState(null);

    useEffect(() => {
        if (!docente || !cursoId) return;
        cargarTodo();
    }, [docente, cursoId]);

    async function cargarTodo() {
        setCargando(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setUid(user?.id || null);

            const { data: cursoData } = await supabase.from('fp_cursos').select('*').eq('id', cursoId).single();
            setCurso(cursoData);
            const anio = cursoData?.anio || new Date().getFullYear();

            const { data: funcs } = await supabase.from('fp_funciones').select('*').eq('fp_curso_id', cursoId).order('orden');
            setFunciones(funcs || []);

            const funcIds = (funcs || []).map(f => f.id);
            const { data: caps } = await supabase.from('fp_capacidades').select('*').in('fp_funcion_id', funcIds).order('orden');
            const porFunc = {};
            (caps || []).forEach(c => {
                if (!porFunc[c.fp_funcion_id]) porFunc[c.fp_funcion_id] = [];
                porFunc[c.fp_funcion_id].push(c);
            });
            setCapacidadesPorFuncion(porFunc);

            const { data: insc } = await supabase.from('fp_inscripciones').select('id').eq('fp_curso_id', cursoId);
            const ids = (insc || []).map(i => i.id);
            setInscripcionIds(ids);

            const capIds = (caps || []).map(c => c.id);
            const { data: evids } = await supabase.from('fp_evidencias').select('id, fp_capacidad_id').in('fp_capacidad_id', capIds);
            const evidIds = (evids || []).map(e => e.id);
            const conNotasSet = new Set();
            if (ids.length > 0 && evidIds.length > 0) {
                const { data: califs } = await supabase.from('fp_calificaciones').select('fp_evidencia_id').in('fp_inscripcion_id', ids).in('fp_evidencia_id', evidIds);
                const mapEvid = {};
                (evids || []).forEach(e => { mapEvid[e.id] = e.fp_capacidad_id; });
                (califs || []).forEach(c => { const cid = mapEvid[c.fp_evidencia_id]; if (cid) conNotasSet.add(cid); });
            }
            setConNotas(conNotasSet);

            const { data: proy } = await supabase.from('fp_proyectos_aulicos').select('*').eq('fp_curso_id', cursoId).eq('anio_lectivo', anio).maybeSingle();
            if (proy) {
                setProyecto(proy);
                setForm({ titulo: proy.titulo, descripcion: proy.descripcion || '', archivo_url: proy.archivo_url || '' });
                const { data: pc } = await supabase.from('fp_proyecto_capacidades').select('*').eq('fp_proyecto_id', proy.id);
                const sel = new Set();
                const est = {};
                (pc || []).forEach(p => { if (p.evaluable) sel.add(p.fp_capacidad_id); est[p.fp_capacidad_id] = p.estado; });
                setSeleccionadas(sel);
                setEstadoCapacidad(est);
            } else {
                setModoEdicion(true);
            }
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error al cargar: ${err.message}` });
        } finally {
            setCargando(false);
        }
    }

    function toggleCapacidad(capId) {
        if (estadoCapacidad[capId] === 'cerrada') {
            setMensaje({ tipo: 'error', texto: 'Esta capacidad está cerrada. No se puede modificar.' });
            return;
        }
        if (conNotas.has(capId)) {
            setMensaje({ tipo: 'error', texto: 'Esta capacidad ya tiene notas cargadas. Ciérrala o pedile al admin que la reabra.' });
            return;
        }
        setSeleccionadas(prev => {
            const nuevo = new Set(prev);
            if (nuevo.has(capId)) nuevo.delete(capId); else nuevo.add(capId);
            return nuevo;
        });
    }

    async function cerrarCapacidad(capId) {
        if (!conNotas.has(capId)) {
            setMensaje({ tipo: 'error', texto: 'No se puede cerrar una capacidad sin notas cargadas.' });
            return;
        }
        if (!confirm('¿Cerrar esta capacidad? Ya no podrás modificar sus notas.')) return;
        try {
            const { error } = await supabase.from('fp_proyecto_capacidades').update({ estado: 'cerrada', fecha_cierre: new Date().toISOString().split('T')[0] }).eq('fp_proyecto_id', proyecto.id).eq('fp_capacidad_id', capId);
            if (error) throw error;
            setEstadoCapacidad(prev => ({ ...prev, [capId]: 'cerrada' }));
            setMensaje({ tipo: 'ok', texto: 'Capacidad cerrada.' });
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        }
    }

    async function guardarProyecto() {
        if (!form.titulo.trim()) { setMensaje({ tipo: 'error', texto: 'El título es obligatorio.' }); return; }
        setGuardando(true);
        try {
            const anio = curso?.anio || new Date().getFullYear();
            let proyId = proyecto?.id;

            if (proyId) {
                const { error } = await supabase.from('fp_proyectos_aulicos').update({ titulo: form.titulo, descripcion: form.descripcion || null, archivo_url: form.archivo_url || null, actualizado_en: new Date().toISOString() }).eq('id', proyId);
                if (error) throw error;
            } else {
                const { data: nuevo, error } = await supabase.from('fp_proyectos_aulicos').insert({ fp_curso_id: cursoId, docente_id: uid, titulo: form.titulo, descripcion: form.descripcion || null, archivo_url: form.archivo_url || null, anio_lectivo: anio }).select().single();
                if (error) throw error;
                proyId = nuevo.id;
            }

            const { data: actuales } = await supabase.from('fp_proyecto_capacidades').select('fp_capacidad_id, estado').eq('fp_proyecto_id', proyId);
            const actualesMap = {};
            (actuales || []).forEach(a => { actualesMap[a.fp_capacidad_id] = a.estado; });

            const aBorrar = Object.keys(actualesMap).map(Number).filter(cid => !seleccionadas.has(cid) && actualesMap[cid] !== 'cerrada' && !conNotas.has(cid));
            if (aBorrar.length) await supabase.from('fp_proyecto_capacidades').delete().eq('fp_proyecto_id', proyId).in('fp_capacidad_id', aBorrar);

            const aInsertar = [...seleccionadas].filter(cid => !(cid in actualesMap)).map(cid => ({ fp_proyecto_id: proyId, fp_capacidad_id: cid, evaluable: true, estado: 'abierta' }));
            if (aInsertar.length) await supabase.from('fp_proyecto_capacidades').insert(aInsertar);

            setMensaje({ tipo: 'ok', texto: 'Proyecto guardado.' });
            setModoEdicion(false);
            await cargarTodo();
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error al guardar: ${err.message}` });
        } finally {
            setGuardando(false);
        }
    }

    // Cálculo de estado por función
    function estadoFuncion(fn) {
        const caps = capacidadesPorFuncion[fn.id] || [];
        const evaluables = caps.filter(c => seleccionadas.has(c.id));
        const cerradas = evaluables.filter(c => estadoCapacidad[c.id] === 'cerrada').length;
        const abiertas = evaluables.length - cerradas;
        const total = caps.length;
        const porcentaje = total > 0 ? Math.round((evaluables.length / total) * 100) : 0;
        return { total, evaluables: evaluables.length, cerradas, abiertas, porcentaje };
    }

    function tramoActual() {
        // Primera función con capacidades abiertas
        for (const fn of funciones) {
            const est = estadoFuncion(fn);
            if (est.abiertas > 0) return fn;
        }
        return null;
    }

    if (cargandoDocente || cargando) return <Sidebar docente={docente} titulo="Cargando..."><div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>Cargando proyecto áulico...</div></Sidebar>;

    const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' };
    const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, background: '#fff', color: '#1e3a8a' };

    const tramo = tramoActual();

    return (
        <Sidebar docente={docente} titulo={curso?.nombre}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                {mensaje && (
                    <div style={{ background: mensaje.tipo === 'ok' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${mensaje.tipo === 'ok' ? '#bbf7d0' : '#fecaca'}`, color: mensaje.tipo === 'ok' ? '#15803d' : '#b91c1c', padding: 14, borderRadius: 8, marginBottom: 20, fontSize: 14 }}>{mensaje.texto}</div>
                )}

                <button onClick={() => router.push(`/docente/cursos/${cursoId}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#1e3a8a', fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}>← Volver al curso</button>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a', marginBottom: 4, marginTop: 0 }}>Proyecto Áulico</h2>
                <p style={{ fontSize: 14, color: '#6b7280', marginTop: 0 }}>{curso?.nombre?.replace(/\s*[-–—]\s*\d{4}\s*$/, '').trim()} · Ciclo {curso?.anio}</p>

                {/* ============================================================ */}
                {/* PANEL DE ESTADO DEL PROYECTO (si ya existe) */}
                {/* ============================================================ */}
                {proyecto && !modoEdicion && (
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, marginBottom: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>{proyecto.titulo}</h3>
                                {proyecto.descripcion && <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 8px 0' }}>{proyecto.descripcion}</p>}
                                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                                    Creado: {new Date(proyecto.creado_en).toLocaleDateString('es-AR')}
                                    {proyecto.actualizado_en && proyecto.actualizado_en !== proyecto.creado_en && ` · Actualizado: ${new Date(proyecto.actualizado_en).toLocaleDateString('es-AR')}`}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {proyecto.archivo_url && <a href={proyecto.archivo_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '8px 14px', borderRadius: 4, fontSize: 12, textDecoration: 'none', fontWeight: 500 }}>📄 Ver en Drive</a>}
                                <button onClick={() => setModoEdicion(true)} style={{ background: '#fff', color: '#d97706', border: '1px solid #d97706', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>Editar</button>
                            </div>
                        </div>

                        {/* Barra de progreso general */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                                <span>Avance del proyecto</span>
                                <span><strong>{Object.values(estadoCapacidad).filter(e => e === 'cerrada').length}</strong> de <strong>{seleccionadas.size}</strong> capacidades cerradas</span>
                            </div>
                            <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${seleccionadas.size > 0 ? (Object.values(estadoCapacidad).filter(e => e === 'cerrada').length / seleccionadas.size) * 100 : 0}%`, background: '#10b981', transition: 'width 0.3s' }} />
                            </div>
                        </div>

                        {/* Tramo actual */}
                        {tramo && (
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: 12, marginBottom: 20, fontSize: 13, color: '#1e40af' }}>
                                <strong>📍 Tramo actual:</strong> Función {tramo.nro_funcion} — {tramo.descripcion}
                            </div>
                        )}
                        {!tramo && seleccionadas.size > 0 && (
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: 12, marginBottom: 20, fontSize: 13, color: '#15803d' }}>
                                ✅ Todas las capacidades evaluables están cerradas. El curso está listo para generar el acta.
                            </div>
                        )}

                        {/* Panel de las 5 funciones */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                            {funciones.map(fn => {
                                const est = estadoFuncion(fn);
                                const esTramoActual = tramo?.id === fn.id;
                                return (
                                    <div key={fn.id} style={{ padding: 14, borderRadius: 6, border: `2px solid ${esTramoActual ? '#1e3a8a' : '#e5e7eb'}`, background: esTramoActual ? '#eff6ff' : '#fff' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: '#1e3a8a' }}>F{fn.nro_funcion}</span>
                                            {est.cerradas === est.evaluables && est.evaluables > 0 && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: '#dcfce7', color: '#15803d', fontWeight: 600 }}>Cerrada</span>}
                                            {est.abiertas > 0 && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>En curso</span>}
                                            {est.evaluables === 0 && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: '#f3f4f6', color: '#6b7280', fontWeight: 600 }}>No incluida</span>}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 10, lineHeight: 1.3, minHeight: 32, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{fn.descripcion}</div>
                                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>{est.evaluables}/{est.total} capacidades</div>
                                        <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${est.porcentaje}%`, background: est.porcentaje === 100 ? '#10b981' : '#1e3a8a' }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Botón ir a planilla */}
                        <div style={{ marginTop: 20, textAlign: 'right' }}>
                            <button onClick={() => router.push(`/docente/cursos/${cursoId}`)} style={{ background: '#1e3a8a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Ir a la planilla →</button>
                        </div>
                    </div>
                )}

                {/* ============================================================ */}
                {/* FORMULARIO DE EDICIÓN */}
                {/* ============================================================ */}
                {modoEdicion && (
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, marginBottom: 24 }}>
                        <div style={{ marginBottom: 16 }}><label style={labelStyle}>Título del proyecto *</label><input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} style={inputStyle} placeholder="Ej: Proyecto Áulico OIAG 2026" /></div>
                        <div style={{ marginBottom: 16 }}><label style={labelStyle}>Descripción / fundamentación</label><textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={4} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Resumen del proyecto..." /></div>
                        <div style={{ marginBottom: 16 }}><label style={labelStyle}>Link de Google Drive (PDF/Word)</label><input value={form.archivo_url} onChange={(e) => setForm({ ...form, archivo_url: e.target.value })} style={inputStyle} placeholder="https://drive.google.com/..." /></div>
                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: 12, marginBottom: 16, fontSize: 12, color: '#1e40af' }}>💡 Subí el archivo al Drive escolar, compartilo como "Cualquiera con el link" y pegá la URL acá. Lo que define la evaluación son las capacidades que tildes abajo.</div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            {proyecto && <button onClick={() => { setModoEdicion(false); setForm({ titulo: proyecto.titulo, descripcion: proyecto.descripcion || '', archivo_url: proyecto.archivo_url || '' }); }} style={{ background: '#fff', color: '#4b5563', border: '1px solid #d1d5db', padding: '10px 18px', borderRadius: 4, cursor: 'pointer' }}>Cancelar</button>}
                            <button onClick={guardarProyecto} disabled={guardando} style={{ background: guardando ? '#9ca3af' : '#1e3a8a', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 4, cursor: guardando ? 'not-allowed' : 'pointer', fontWeight: 600 }}>{guardando ? 'Guardando...' : 'Guardar proyecto'}</button>
                        </div>
                    </div>
                )}

                {/* ============================================================ */}
                {/* SELECCIÓN DE CAPACIDADES */}
                {/* ============================================================ */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e3a8a', margin: 0 }}>Capacidades a evaluar</h3>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>{seleccionadas.size} de {Object.values(capacidadesPorFuncion).flat().length} tildadas</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#6b7280', marginTop: 0, marginBottom: 16 }}>Tildá las capacidades que vas a desarrollar. Las que tienen notas o están cerradas no se pueden desmarcar.</p>

                    {funciones.map(fn => (
                        <div key={fn.id} style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #e5e7eb' }}>Función {fn.nro_funcion}: {fn.descripcion}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {(capacidadesPorFuncion[fn.id] || []).map(cap => {
                                    const tildada = seleccionadas.has(cap.id);
                                    const estado = estadoCapacidad[cap.id];
                                    const tieneNotas = conNotas.has(cap.id);
                                    const bloqueada = estado === 'cerrada' || (tildada && tieneNotas);
                                    return (
                                        <div key={cap.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 6, border: `1px solid ${tildada ? '#1e3a8a' : '#e5e7eb'}`, background: tildada ? '#eff6ff' : '#fff', opacity: bloqueada ? 0.85 : 1 }}>
                                            <input type="checkbox" checked={tildada} onChange={() => toggleCapacidad(cap.id)} disabled={bloqueada} style={{ width: 16, height: 16, cursor: bloqueada ? 'not-allowed' : 'pointer' }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a' }}>Cap. {cap.nro_capacidad}</div>
                                                <div style={{ fontSize: 12, color: '#4b5563' }}>{cap.descripcion}</div>
                                            </div>
                                            {estado === 'cerrada' && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 3, background: '#f3f4f6', color: '#4b5563' }}>🔒 Cerrada</span>}
                                            {estado === 'abierta' && tieneNotas && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 3, background: '#fef3c7', color: '#92400e' }}>Con notas</span>}
                                            {estado === 'abierta' && !tieneNotas && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 3, background: '#dcfce7', color: '#15803d' }}>Abierta</span>}
                                            {tildada && estado === 'abierta' && tieneNotas && <button onClick={() => cerrarCapacidad(cap.id)} style={{ background: '#1e3a8a', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>Cerrar</button>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    {proyecto && !modoEdicion && <div style={{ textAlign: 'right', marginTop: 16 }}><button onClick={guardarProyecto} disabled={guardando} style={{ background: guardando ? '#9ca3af' : '#1e3a8a', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 4, cursor: guardando ? 'not-allowed' : 'pointer', fontWeight: 600 }}>Guardar selección</button></div>}
                </div>
            </div>
        </Sidebar>
    );
}