'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Sidebar from '@/components/Sidebar';

const Iconos = {
    calendario: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    presente: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>,
    ausente: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
    tarde: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    guardar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
};

export default function AsistenciasPage() {
    const { docente, cargando } = useDocente();
    const [cursos, setCursos] = useState([]);
    const [cursoSeleccionado, setCursoSeleccionado] = useState(null);
    const [alumnos, setAlumnos] = useState([]);
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [asistencias, setAsistencias] = useState({});
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

            // Si es docente puro, solo sus cursos. Si es preceptor/admin/directivo, todos
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
            // Cargar inscripciones del curso
            const { data: inscripciones } = await supabase
                .from('fp_inscripciones')
                .select('*')
                .eq('fp_curso_id', cursoSeleccionado)
                .order('apellido');

            setAlumnos(inscripciones || []);

            // Cargar asistencias de la fecha seleccionada
            if (inscripciones && inscripciones.length > 0) {
                const idsInscripciones = inscripciones.map(i => i.id);
                const { data: asistenciasData } = await supabase
                    .from('fp_asistencia')
                    .select('*')
                    .in('fp_inscripcion_id', idsInscripciones)
                    .eq('fecha', fecha);

                const asistenciasMap = {};
                (asistenciasData || []).forEach(a => {
                    asistenciasMap[a.fp_inscripcion_id] = a.estado;
                });

                // Inicializar con 'presente' por defecto si no existe
                inscripciones.forEach(insc => {
                    if (!asistenciasMap[insc.id]) {
                        asistenciasMap[insc.id] = 'presente';
                    }
                });

                setAsistencias(asistenciasMap);
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
            const asistenciasAGuardar = Object.entries(asistencias).map(([inscripcionId, estado]) => ({
                fp_inscripcion_id: inscripcionId,
                fecha: fecha,
                estado: estado,
                cargado_por: docente.userId
            }));

            // Primero eliminamos las asistencias existentes de esa fecha
            const idsInscripciones = Object.keys(asistencias);
            await supabase
                .from('fp_asistencia')
                .delete()
                .in('fp_inscripcion_id', idsInscripciones)
                .eq('fecha', fecha);

            // Luego insertamos las nuevas
            const { error } = await supabase
                .from('fp_asistencia')
                .insert(asistenciasAGuardar);

            if (error) throw error;

            setMensaje({ tipo: 'ok', texto: 'Asistencias guardadas correctamente' });
            setTimeout(() => setMensaje(null), 3000);
        } catch (err) {
            console.error('Error al guardar:', err);
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        } finally {
            setGuardando(false);
        }
    }

    function actualizarAsistencia(inscripcionId, estado) {
        setAsistencias(prev => ({
            ...prev,
            [inscripcionId]: estado
        }));
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
    const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6b7280', textTransform: 'uppercase' };
    const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 };

    return (
        <Sidebar docente={docente} titulo="Registro de Asistencias">
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>

                {mensaje && (
                    <div style={{
                        background: mensaje.tipo === 'ok' ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${mensaje.tipo === 'ok' ? '#bbf7d0' : '#fecaca'}`,
                        color: mensaje.tipo === 'ok' ? '#15803d' : '#b91c1c',
                        padding: 14, borderRadius: 8, marginBottom: 20
                    }}>
                        {mensaje.texto}
                    </div>
                )}

                {/* Filtros */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, marginBottom: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
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
                        {/* Estadísticas */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 16 }}>
                                <div style={{ fontSize: 11, color: '#15803d', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Presentes</div>
                                <div style={{ fontSize: 28, fontWeight: 700, color: '#15803d' }}>{stats.presentes}</div>
                            </div>
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16 }}>
                                <div style={{ fontSize: 11, color: '#b91c1c', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Ausentes</div>
                                <div style={{ fontSize: 28, fontWeight: 700, color: '#b91c1c' }}>{stats.ausentes}</div>
                            </div>
                            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: 16 }}>
                                <div style={{ fontSize: 11, color: '#92400e', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Tarde</div>
                                <div style={{ fontSize: 28, fontWeight: 700, color: '#92400e' }}>{stats.tarde}</div>
                            </div>
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 16 }}>
                                <div style={{ fontSize: 11, color: '#1e40af', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Total Alumnos</div>
                                <div style={{ fontSize: 28, fontWeight: 700, color: '#1e40af' }}>{stats.total}</div>
                            </div>
                        </div>

                        {/* Lista de alumnos */}
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                                <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Registro de Asistencia</h3>
                            </div>

                            {cargandoDatos ? (
                                <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Cargando...</div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Legajo</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Alumno</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>DNI</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {alumnos.map((alumno, idx) => (
                                                <tr key={alumno.id} style={{ borderBottom: idx < alumnos.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>
                                                        {alumno.legajo || '—'}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                                                        {alumno.apellido ? `${alumno.apellido}, ${alumno.nombre}` : alumno.nombre}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', color: '#4b5563' }}>
                                                        {alumno.dni || '—'}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <div style={{ display: 'inline-flex', gap: 8 }}>
                                                            <button
                                                                onClick={() => actualizarAsistencia(alumno.id, 'presente')}
                                                                title="Presente"
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    borderRadius: 4,
                                                                    border: '1px solid',
                                                                    background: asistencias[alumno.id] === 'presente' ? '#dcfce7' : '#fff',
                                                                    borderColor: asistencias[alumno.id] === 'presente' ? '#15803d' : '#d1d5db',
                                                                    color: asistencias[alumno.id] === 'presente' ? '#15803d' : '#6b7280',
                                                                    cursor: 'pointer',
                                                                    fontSize: 12,
                                                                    fontWeight: 600
                                                                }}
                                                            >
                                                                {Iconos.presente} P
                                                            </button>
                                                            <button
                                                                onClick={() => actualizarAsistencia(alumno.id, 'tarde')}
                                                                title="Tarde"
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    borderRadius: 4,
                                                                    border: '1px solid',
                                                                    background: asistencias[alumno.id] === 'tarde' ? '#fef3c7' : '#fff',
                                                                    borderColor: asistencias[alumno.id] === 'tarde' ? '#92400e' : '#d1d5db',
                                                                    color: asistencias[alumno.id] === 'tarde' ? '#92400e' : '#6b7280',
                                                                    cursor: 'pointer',
                                                                    fontSize: 12,
                                                                    fontWeight: 600
                                                                }}
                                                            >
                                                                {Iconos.tarde} T
                                                            </button>
                                                            <button
                                                                onClick={() => actualizarAsistencia(alumno.id, 'ausente')}
                                                                title="Ausente"
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    borderRadius: 4,
                                                                    border: '1px solid',
                                                                    background: asistencias[alumno.id] === 'ausente' ? '#fef2f2' : '#fff',
                                                                    borderColor: asistencias[alumno.id] === 'ausente' ? '#b91c1c' : '#d1d5db',
                                                                    color: asistencias[alumno.id] === 'ausente' ? '#b91c1c' : '#6b7280',
                                                                    cursor: 'pointer',
                                                                    fontSize: 12,
                                                                    fontWeight: 600
                                                                }}
                                                            >
                                                                {Iconos.ausente} A
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={guardarAsistencias}
                                    disabled={guardando}
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
                    <div style={{ padding: 60, textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📅</div>
                        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Seleccioná un curso para registrar asistencia</div>
                        <div style={{ fontSize: 14 }}>Elegí un curso y la fecha del día para comenzar</div>
                    </div>
                )}
            </div>
        </Sidebar>
    );
}