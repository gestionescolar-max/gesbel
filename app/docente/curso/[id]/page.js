'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Sidebar from '@/components/Sidebar';

const Iconos = {
    volver: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
    acta: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
    usuarios: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>,
    check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>,
    alerta: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
    calendario: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    bloqueado: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    externo: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
};

export default function DetalleCursoPage() {
    const params = useParams();
    const router = useRouter();
    const { docente, cargando } = useDocente();
    const [curso, setCurso] = useState(null);
    const [alumnos, setAlumnos] = useState([]);
    const [modulos, setModulos] = useState([]);
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [busqueda, setBusqueda] = useState('');
    const [mensaje, setMensaje] = useState(null);
    const [cargandoDatos, setCargandoDatos] = useState(true);

    const cursoId = params.id;

    useEffect(() => {
        if (!docente || !cursoId) return;
        cargarDatos();
    }, [docente, cursoId]);

    async function cargarDatos() {
        setCargandoDatos(true);
        try {
            // 1. Cargar el curso
            const { data: cursoData, error: errorCurso } = await supabase
                .from('fp_cursos')
                .select('*')
                .eq('id', cursoId)
                .single();

            if (errorCurso) throw errorCurso;

            // Validar que el docente tenga acceso
            if (!docente.esAdmin && !docente.esDirectivo && cursoData.profesor_id !== docente.id) {
                setMensaje({ tipo: 'error', texto: 'No tenés permisos para ver este curso' });
                setCargandoDatos(false);
                return;
            }

            setCurso(cursoData);

            // 2. Cargar módulos del curso
            const { data: modulosData } = await supabase
                .from('fp_modulos')
                .select('*')
                .eq('fp_perfil_id', cursoData.fp_perfil_id)
                .order('numero');
            setModulos(modulosData || []);

            // 3. Cargar alumnos inscriptos
            const { data: inscripciones, error: errorInsc } = await supabase
                .from('fp_inscripciones')
                .select('*')
                .eq('fp_curso_id', cursoId)
                .order('apellido');

            if (errorInsc) throw errorInsc;

            // 4. Para cada alumno, calcular asistencia y módulos
            const alumnosConDatos = await Promise.all(
                (inscripciones || []).map(async (insc) => {
                    // Asistencia
                    const { data: asistencias } = await supabase
                        .from('fp_asistencia')
                        .select('estado')
                        .eq('fp_inscripcion_id', insc.id);

                    const total = asistencias?.length || 0;
                    const presentes = asistencias?.filter(a => a.estado === 'presente').length || 0;
                    const porcentajeAsistencia = total > 0 ? Math.round((presentes / total) * 100) : 0;

                    // Módulos
                    const { data: modulosAlumno } = await supabase
                        .from('fp_alumno_modulos')
                        .select('fp_modulo_id, estado')
                        .eq('fp_inscripcion_id', insc.id);

                    const modulosAprobados = modulosAlumno?.filter(m => m.estado === 'aprobado').length || 0;

                    // Acta (si existe)
                    const { data: detalleActa } = await supabase
                        .from('fp_actas_detalle')
                        .select('condicion, observacion')
                        .eq('fp_inscripcion_id', insc.id)
                        .maybeSingle();

                    return {
                        ...insc,
                        asistencia: { total, presentes, porcentaje: porcentajeAsistencia },
                        modulos: { aprobados: modulosAprobados, total: modulosData?.length || 0 },
                        condicion_acta: detalleActa?.condicion || null,
                        observacion_acta: detalleActa?.observacion || null
                    };
                })
            );

            setAlumnos(alumnosConDatos);
        } catch (err) {
            console.error('Error al cargar datos:', err);
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        } finally {
            setCargandoDatos(false);
        }
    }

    function obtenerEstadoCurso() {
        if (!curso) return null;
        const hoy = new Date();
        const inicio = new Date(curso.fecha_inicio);
        const fin = new Date(curso.fecha_fin);
        if (hoy < inicio) return { estado: 'proximo', color: '#3b82f6', label: 'Próximo a iniciar' };
        if (hoy > fin) return { estado: 'finalizado', color: '#6b7280', label: 'Finalizado' };
        return { estado: 'en_cursada', color: '#10b981', label: 'En cursada' };
    }

    function formatearFecha(fecha) {
        if (!fecha) return '—';
        return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    const alumnosFiltrados = alumnos.filter(a => {
        if (filtroEstado !== 'todos' && a.estado !== filtroEstado) return false;
        if (busqueda) {
            const q = busqueda.toLowerCase();
            const nombreCompleto = `${a.apellido || ''} ${a.nombre || ''}`.toLowerCase();
            if (!nombreCompleto.includes(q) && !(a.dni && a.dni.includes(q))) return false;
        }
        return true;
    });

    const estadoCurso = obtenerEstadoCurso();
    const puedeCargarActa = estadoCurso?.estado === 'finalizado' || estadoCurso?.estado === 'en_cursada';

    if (cargando || !docente) return null;

    const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' };
    const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, background: '#fff', outline: 'none', color: '#1e3a8a' };

    return (
        <Sidebar docente={docente} titulo="Detalle del Curso">
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>

                {mensaje && (
                    <div style={{
                        background: mensaje.tipo === 'ok' ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${mensaje.tipo === 'ok' ? '#bbf7d0' : '#fecaca'}`,
                        color: mensaje.tipo === 'ok' ? '#15803d' : '#b91c1c',
                        padding: 14, borderRadius: 8, marginBottom: 20, fontSize: 14
                    }}>
                        {mensaje.texto}
                    </div>
                )}

                {cargandoDatos ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>Cargando datos del curso...</div>
                ) : !curso ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>Curso no encontrado</div>
                ) : (
          <>
                        {/* HEADER DEL CURSO */}
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, marginBottom: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                                <div style={{ flex: 1 }}>
                                    <button
                                        onClick={() => router.push('/docente/cursos')}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', marginBottom: 12, padding: 0 }}
                                    >
                                        {Iconos.volver} Volver a Mis Cursos
                                    </button>
                                    <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>
                                        {curso.nombre.replace(/\s*[-–—]\s*\d{4}\s*$/, '').trim()}
                                    </h2>
                                    <div style={{ fontSize: 14, color: '#6b7280' }}>
                                        {curso.turno} · {curso.anio} · Cohorte {curso.cohorte}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    {estadoCurso && (
                                        <div style={{
                                            background: estadoCurso.color,
                                            color: '#fff',
                                            padding: '6px 14px',
                                            borderRadius: 4,
                                            fontSize: 12,
                                            fontWeight: 600
                                        }}>
                                            {estadoCurso.label}
                                        </div>
                                    )}
                                    {puedeCargarActa && (
                                        <button
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                                background: '#1e3a8a', color: '#fff', border: 'none',
                                                padding: '8px 16px', borderRadius: 4, fontSize: 13, fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => setMensaje({ tipo: 'ok', texto: 'Función "Cargar Acta" disponible en el próximo paso' })}
                                        >
                                            {Iconos.acta} Cargar Acta
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginTop: 20, paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
                                <div>
                                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Período</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#1e3a8a', fontWeight: 500 }}>
                                        {Iconos.calendario}
                                        {formatearFecha(curso.fecha_inicio)} → {formatearFecha(curso.fecha_fin)}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Alumnos</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#1e3a8a', fontWeight: 500 }}>
                                        {Iconos.usuarios}
                                        <strong>{alumnos.length}</strong> inscriptos {curso.cupo && `/ ${curso.cupo} cupos`}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Módulos</div>
                                    <div style={{ fontSize: 14, color: '#1e3a8a', fontWeight: 500 }}>
                                        {modulos.length} módulos definidos
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Asistencia mínima</div>
                                    <div style={{ fontSize: 14, color: '#1e3a8a', fontWeight: 500 }}>
                                        {curso.asistencia_minima || 75}%
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* FILTROS */}
                        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                            <div style={{ width: 200 }}>
                                <label style={labelStyle}>Estado</label>
                                <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={inputStyle}>
                                    <option value="todos">Todos los estados</option>
                                    <option value="preinscrito">Pre-inscripto</option>
                                    <option value="inscripto">Inscripto</option>
                                    <option value="en_curso">En curso</option>
                                    <option value="egresado">Egresado</option>
                                    <option value="abandono">Abandono</option>
                                </select>
                            </div>
                            <div style={{ flex: 1, minWidth: 200 }}>
                                <label style={labelStyle}>Búsqueda</label>
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, apellido o DNI..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        {/* TABLA DE ALUMNOS */}
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 600 }}>Legajo</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 600 }}>Alumno</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 600 }}>DNI</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 600 }}>Asistencia</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 600 }}>Módulos</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 600 }}>Estado</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 600 }}>Cond. Acta</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 600 }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {alumnosFiltrados.map((a, idx) => {
                                            const asistenciaBaja = a.asistencia.porcentaje < (curso.asistencia_minima || 75);
                                            return (
                                                <tr key={a.id} style={{ borderBottom: idx < alumnosFiltrados.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                                    <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'monospace', color: '#6b7280', fontWeight: 600 }}>
                                                        {a.legajo || '—'}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e3a8a' }}>
                                                        {a.apellido ? `${a.apellido}, ${a.nombre}` : a.nombre}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', color: '#4b5563' }}>{a.dni || '—'}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                            <span style={{
                                                                fontWeight: 700,
                                                                fontSize: 13,
                                                                color: asistenciaBaja ? '#b91c1c' : '#15803d'
                                                            }}>
                                                                {a.asistencia.porcentaje}%
                                                            </span>
                                                            {asistenciaBaja && (
                                                                <span title="Asistencia por debajo del mínimo" style={{ color: '#b91c1c' }}>
                                                                    {Iconos.alerta}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                                                            {a.asistencia.presentes}/{a.asistencia.total} clases
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1e3a8a' }}>
                                                            {a.modulos.aprobados}/{a.modulos.total}