'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Sidebar from '@/components/Sidebar';

const Iconos = {
    calendario: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    presente: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>,
    ausente: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
    tarde: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    guardar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
};

function formatearHora(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function formatearFechaLarga(fechaISO) {
    if (!fechaISO) return '—';
    const [anio, mes, dia] = fechaISO.split('-').map(Number);
    const d = new Date(anio, mes - 1, dia);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Formatea un timestamp ISO a hora local (HH:MM)
function formatearHora(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export default function AsistenciasPage() {
    const { docente, cargando } = useDocente();
    const [cursos, setCursos] = useState([]);
    const [cursoSeleccionado, setCursoSeleccionado] = useState(null);
    const [alumnos, setAlumnos] = useState([]);
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [asistencias, setAsistencias] = useState({});
    const [horasCarga, setHorasCarga] = useState({});
    const [cargandoDatos, setCargandoDatos] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState(null);

    useEffect(() => {
        if (!docente) return;
        cargarCursos();
    }, [docente]);

    useEffect(() => {
        if (cursoSeleccionado) {
            cargarAlumnosYAsistencias();
        }
    }, [cursoSeleccionado, fecha]);

    async function cargarCursos() {
        try {
            let query = supabase
                .from('fp_cursos')
                .select('*')
                .order('nombre');

            if (docente.id && !docente.esAdmin && !docente.esDirectivo && !docente.esPreceptor) {
                query = query.eq('profesor_id', docente.id);
            }

            const { data, error } = await query;
            if (error) throw error;
            setCursos(data || []);
        } catch (err) {
            console.error('Error al cargar cursos:', err);
        }
    }

    async function cargarAlumnosYAsistencias() {
        setCargandoDatos(true);
        try {
            const { data: inscripciones } = await supabase
                .from('fp_inscripciones')
                .select('*')
                .eq('fp_curso_id', cursoSeleccionado)
                .order('apellido');

            setAlumnos(inscripciones || []);

            if (inscripciones && inscripciones.length > 0) {
                const idsInscripciones = inscripciones.map(i => i.id);
                const { data: asistenciasData } = await supabase
                    .from('fp_asistencia')
                    .select('*')
                    .in('fp_inscripcion_id', idsInscripciones)
                    .eq('fecha', fecha);

                const asistenciasMap = {};
                const horasMap = {};
                (asistenciasData || []).forEach(a => {
                    asistenciasMap[a.fp_inscripcion_id] = a.estado;
                    horasMap[a.fp_inscripcion_id] = a.creado_en;
                });

                // Default: todos AUSENTES hasta que el preceptor los marque
                inscripciones.forEach(insc => {
                    if (!asistenciasMap[insc.id]) {
                        asistenciasMap[insc.id] = 'ausente';
                        horasMap[insc.id] = null;
                    }
                });

                setAsistencias(asistenciasMap);
                setHorasCarga(horasMap);
            } else {
                setAsistencias({});
                setHorasCarga({});
            }
        } catch (err) {
            console.error('Error al cargar datos:', err);
        } finally {
            setCargandoDatos(false);
        }
    }

    async function guardarAsistencias() {
        setGuardando(true);
        try {
            const { data: { user }, error: errorUser } = await supabase.auth.getUser();
            if (errorUser || !user) {
                throw new Error('No se pudo identificar al usuario. Cerrá sesión y volvé a ingresar.');
            }

            const userIdUUID = user.id;
            const horaActual = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

            const asistenciasAGuardar = Object.entries(asistencias).map(([inscripcionId, estado]) => ({
                fp_inscripcion_id: Number(inscripcionId),
                fecha: fecha,
                estado: estado,
                cargado_por: userIdUUID
            }));

            const idsInscripciones = Object.keys(asistencias).map(id => Number(id));
            await supabase
                .from('fp_asistencia')
                .delete()
                .in('fp_inscripcion_id', idsInscripciones)
                .eq('fecha', fecha);

            const { error } = await supabase
                .from('fp_asistencia')
                .insert(asistenciasAGuardar);

            if (error) throw error;

            const s = contarAsistencias();
            setMensaje({ tipo: 'ok', texto: `Asistencias registradas a las ${horaActual}. ${s.presentes} presentes, ${s.tarde} tardes, ${s.ausentes} ausentes.` });
            await cargarAlumnosYAsistencias(); // refresca las horas de carga
            setTimeout(() => setMensaje(null), 4000);
        } catch (err) {
            console.error('Error al guardar:', err);
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        } finally {
            setGuardando(false);
        }
    }

    function actualizarAsistencia(inscripcionId, estado) {
        setAsistencias(prev => ({ ...prev, [inscripcionId]: estado }));
    }

    function contarAsistencias() {
        const estados = Object.values(asistencias);
        return {
            presentes: estados.filter(e => e === 'presente').length,
            ausentes: estados.filter(e => e === 'ausente').length,
            tarde: estados.filter(e => e === 'tarde').length,
            total: estados.length
        };
    }

    if (cargando || !docente) return null;

    const stats = contarAsistencias();
    const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' };
    const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, background: '#fff', color: '#1e3a8a' };

    // Renderiza los 3 botones de estado (reutilizado en tabla y cards)
    function BotonesEstado(alumnoId) {
        const estado = asistencias[alumnoId];
        return (
            <div style={{ display: 'inline-flex', gap: 6 }}>
                <button
                    onClick={() => actualizarAsistencia(alumnoId, 'presente')}
                    className={`btn-asist btn-asist-p ${estado === 'presente' ? 'activo' : ''}`}
                    style={{ padding: '6px 10px' }}
                    title="Presente"
                >
                    {Iconos.presente} P
                </button>
                <button
                    onClick={() => actualizarAsistencia(alumnoId, 'tarde')}
                    className={`btn-asist btn-asist-t ${estado === 'tarde' ? 'activo' : ''}`}
                    style={{ padding: '6px 10px' }}
                    title="Tarde"
                >
                    {Iconos.tarde} T
                </button>
                <button
                    onClick={() => actualizarAsistencia(alumnoId, 'ausente')}
                    className={`btn-asist btn-asist-a ${estado === 'ausente' ? 'activo' : ''}`}
                    style={{ padding: '6px 10px' }}
                    title="Ausente"
                >
                    {Iconos.ausente} A
                </button>
            </div>
        );
    }

    return (
        <Sidebar docente={docente} titulo="Registro de Asistencia">
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>

                {mensaje && (
                    <div style={{
                        background: mensaje.tipo === 'ok' ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${mensaje.tipo === 'ok' ? '#bbf7d0' : '#fecaca'}`,
                        color: mensaje.tipo === 'ok' ? '#065f46' : '#b91c1c',
                        padding: 14, borderRadius: 8, marginBottom: 20, fontSize: 14
                    }}>
                        {mensaje.texto}
                    </div>
                )}

                {/* Filtros */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20, marginBottom: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                        <div>
                            <label style={labelStyle}>Curso</label>
                            <select
                                value={cursoSeleccionado || ''}
                                onChange={(e) => setCursoSeleccionado(e.target.value ? Number(e.target.value) : null)}
                                style={inputStyle}
                            >
                                <option value="">Seleccionar curso...</option>
                                {cursos.map(curso => (
                                    <option key={curso.id} value={curso.id}>
                                        {curso.nombre} - {curso.turno} {curso.anio}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Fecha</label>
                            <input
                                type="date"
                                value={fecha}
                                onChange={(e) => setFecha(e.target.value)}
                                style={inputStyle}
                            />
                        </div>
                    </div>
                </div>

                {cursoSeleccionado && (
                    <>
                        {/* Métricas */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 16 }}>
                                <div style={{ fontSize: 10, color: '#065f46', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>Presentes</div>
                                <div style={{ fontSize: 28, fontWeight: 700, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>{stats.presentes}</div>
                            </div>
                            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: 16 }}>
                                <div style={{ fontSize: 10, color: '#92400e', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>Tardes</div>
                                <div style={{ fontSize: 28, fontWeight: 700, color: '#d97706', fontVariantNumeric: 'tabular-nums' }}>{stats.tarde}</div>
                            </div>
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16 }}>
                                <div style={{ fontSize: 10, color: '#991b1b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>Ausentes</div>
                                <div style={{ fontSize: 28, fontWeight: 700, color: '#b91c1c', fontVariantNumeric: 'tabular-nums' }}>{stats.ausentes}</div>
                            </div>
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 16 }}>
                                <div style={{ fontSize: 10, color: '#1e40af', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>Total</div>
                                <div style={{ fontSize: 28, fontWeight: 700, color: '#1e3a8a', fontVariantNumeric: 'tabular-nums' }}>{stats.total}</div>
                            </div>
                        </div>

                        {/* Registro */}
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Registro de Asistencia
                                </h3>
                                <span style={{ fontSize: 12, color: '#6b7280' }}>
                                    {formatearFechaLarga(fecha)}
                                </span>
                            </div>

                            {cargandoDatos ? (
                                <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>Cargando datos...</div>
                            ) : alumnos.length === 0 ? (
                                <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>No hay alumnos inscriptos en este curso.</div>
                            ) : (
                                <>
                                    {/* ===== VISTA ESCRITORIO: TABLA ===== */}
                                    <div className="vista-desktop">
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 720 }}>
                                                <thead>
                                                    <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, letterSpacing: '0.05em' }}>Estado</th>
                                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, letterSpacing: '0.05em' }}>Legajo</th>
                                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, letterSpacing: '0.05em' }}>Alumno</th>
                                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, letterSpacing: '0.05em' }}>DNI</th>
                                                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, letterSpacing: '0.05em' }}>Hora de carga</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {alumnos.map((alumno, idx) => (
                                                        <tr key={alumno.id} style={{ borderBottom: idx < alumnos.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                                {BotonesEstado(alumno.id)}
                                                            </td>
                                                            <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>
                                                                {alumno.legajo || '—'}
                                                            </td>
                                                            <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e3a8a' }}>
                                                                {alumno.apellido ? `${alumno.apellido}, ${alumno.nombre}` : alumno.nombre}
                                                            </td>
                                                            <td style={{ padding: '12px 16px', color: '#4b5563', fontVariantNumeric: 'tabular-nums' }}>
                                                                {alumno.dni || '—'}
                                                            </td>
                                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, color: horasCarga[alumno.id] ? '#059669' : '#9ca3af', fontWeight: 600 }}>
                                                                {formatearHora(horasCarga[alumno.id])}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* ===== VISTA MÓVIL: CARDS ===== */}
                                    <div className="vista-mobile" style={{ padding: 12 }}>
                                        {alumnos.map(alumno => (
                                            <div key={alumno.id} className="card-asistencia">
                                                <div className="card-asistencia-top">
                                                    <div>
                                                        <div className="card-asistencia-nombre">
                                                            {alumno.apellido ? `${alumno.apellido}, ${alumno.nombre}` : alumno.nombre}
                                                        </div>
                                                        <div className="card-asistencia-meta">
                                                            {alumno.legajo ? `${alumno.legajo} · ` : ''}DNI {alumno.dni || '—'}
                                                        </div>
                                                    </div>
                                                    <div className="card-asistencia-hora">
                                                        Carga: {formatearHora(horasCarga[alumno.id])}
                                                    </div>
                                                </div>
                                                <div className="card-asistencia-botones">
                                                    <button
                                                        onClick={() => actualizarAsistencia(alumno.id, 'presente')}
                                                        className={`btn-asist btn-asist-p ${asistencias[alumno.id] === 'presente' ? 'activo' : ''}`}
                                                    >
                                                        {Iconos.presente} Presente
                                                    </button>
                                                    <button
                                                        onClick={() => actualizarAsistencia(alumno.id, 'tarde')}
                                                        className={`btn-asist btn-asist-t ${asistencias[alumno.id] === 'tarde' ? 'activo' : ''}`}
                                                    >
                                                        {Iconos.tarde} Tarde
                                                    </button>
                                                    <button
                                                        onClick={() => actualizarAsistencia(alumno.id, 'ausente')}
                                                        className={`btn-asist btn-asist-a ${asistencias[alumno.id] === 'ausente' ? 'activo' : ''}`}
                                                    >
                                                        {Iconos.ausente} Ausente
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Guardar */}
                            <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={guardarAsistencias}
                                    disabled={guardando || alumnos.length === 0}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        background: guardando ? '#9ca3af' : '#1e3a8a',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: 6,
                                        fontSize: 14,
                                        fontWeight: 600,
                                        cursor: guardando ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {Iconos.guardar} {guardando ? 'Guardando...' : 'Guardar Asistencias'}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {!cursoSeleccionado && (
                    <div style={{ padding: 48, textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                        <div style={{ color: '#9ca3af', display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: '#1e3a8a' }}>Seleccione un curso para registrar asistencia</div>
                        <div style={{ fontSize: 13 }}>Elija el curso y la fecha correspondiente para comenzar.</div>
                    </div>
                )}
            </div>
        </Sidebar>
    );
}