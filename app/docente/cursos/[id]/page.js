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
    alerta: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
    calendario: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    externo: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>,
    check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>,
    imprimir: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
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

    // Estados del modal de acta
    const [modalActaAbierto, setModalActaAbierto] = useState(false);
    const [numeroManual, setNumeroManual] = useState(false);
    const [numeroActa, setNumeroActa] = useState('');
    const [fechaActa, setFechaActa] = useState(new Date().toISOString().split('T')[0]);
    const [resolucion, setResolucion] = useState('5036/16');
    const [equipoDocente, setEquipoDocente] = useState('');
    const [observacionesGenerales, setObservacionesGenerales] = useState('');
    const [alumnosSeleccionados, setAlumnosSeleccionados] = useState({});
    const [cargandoActa, setCargandoActa] = useState(false);

    const cursoId = params.id;

    useEffect(() => {
        if (!docente || !cursoId) return;
        cargarDatos();
    }, [docente, cursoId]);

    async function cargarDatos() {
        setCargandoDatos(true);
        try {
            const { data: cursoData, error: errorCurso } = await supabase
                .from('fp_cursos')
                .select('*')
                .eq('id', cursoId)
                .single();

            if (errorCurso) throw errorCurso;

            if (!docente.esAdmin && !docente.esDirectivo && cursoData.profesor_id !== docente.id) {
                setMensaje({ tipo: 'error', texto: 'No tenés permisos para ver este curso' });
                setCargandoDatos(false);
                return;
            }

            setCurso(cursoData);

            const { data: modulosData } = await supabase
                .from('fp_modulos')
                .select('*')
                .eq('fp_perfil_id', cursoData.fp_perfil_id)
                .order('numero');
            setModulos(modulosData || []);

            const { data: inscripciones, error: errorInsc } = await supabase
                .from('fp_inscripciones')
                .select('*')
                .eq('fp_curso_id', cursoId)
                .order('apellido');

            if (errorInsc) throw errorInsc;

            const alumnosConDatos = await Promise.all(
                (inscripciones || []).map(async (insc) => {
                    const { data: asistencias } = await supabase
                        .from('fp_asistencia')
                        .select('estado')
                        .eq('fp_inscripcion_id', insc.id);

                    const total = asistencias?.length || 0;
                    const presentes = asistencias?.filter(a => a.estado === 'presente').length || 0;
                    const porcentajeAsistencia = total > 0 ? Math.round((presentes / total) * 100) : 0;

                    const { data: modulosAlumno } = await supabase
                        .from('fp_alumno_modulos')
                        .select('fp_modulo_id, estado')
                        .eq('fp_inscripcion_id', insc.id);

                    const modulosAprobados = modulosAlumno?.filter(m => m.estado === 'aprobado').length || 0;

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

            // Inicializar alumnos seleccionados (todos por defecto)
            const seleccionInicial = {};
            alumnosConDatos.forEach(a => {
                seleccionInicial[a.id] = {
                    seleccionado: true,
                    condicion: 'aprobado',
                    observacion: ''
                };
            });
            setAlumnosSeleccionados(seleccionInicial);

            // Generar número de acta automático
            const { count } = await supabase
                .from('fp_actas')
                .select('*', { count: 'exact', head: true })
                .eq('fp_curso_id', cursoId);

            const siguienteNumero = (count || 0) + 1;
            const anioCurso = cursoData.anio || new Date().getFullYear();
            setNumeroActa(`FP-${anioCurso}-${String(siguienteNumero).padStart(3, '0')}`);

        } catch (err) {
            console.error('Error al cargar datos:', err);
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        } finally {
            setCargandoDatos(false);
        }
    }

    function obtenerEstadoCurso() {
        if (!curso) return null;
        const anioActual = new Date().getFullYear();
        const mesActual = new Date().getMonth();
        const anioCurso = curso.anio;

        if (anioCurso < anioActual) return { estado: 'finalizado', color: '#6b7280', label: 'Finalizado' };
        if (anioCurso > anioActual) return { estado: 'proximo', color: '#3b82f6', label: 'Próximo a iniciar' };
        if (anioCurso === anioActual && mesActual >= 10) return { estado: 'finalizado', color: '#6b7280', label: 'Finalizado' };
        return { estado: 'en_cursada', color: '#10b981', label: 'En cursada' };
    }

    function formatearFecha(fecha) {
        if (!fecha) return '—';
        try {
            return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
            return '—';
        }
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

    function toggleSeleccionAlumno(id) {
        setAlumnosSeleccionados(prev => ({
            ...prev,
            [id]: { ...prev[id], seleccionado: !prev[id]?.seleccionado }
        }));
    }

    function actualizarCondicionAlumno(id, condicion) {
        setAlumnosSeleccionados(prev => ({
            ...prev,
            [id]: { ...prev[id], condicion }
        }));
    }

    function actualizarObservacionAlumno(id, observacion) {
        setAlumnosSeleccionados(prev => ({
            ...prev,
            [id]: { ...prev[id], observacion }
        }));
    }

    function seleccionarTodos() {
        const todos = {};
        alumnos.forEach(a => {
            todos[a.id] = { ...alumnosSeleccionados[a.id], seleccionado: true };
        });
        setAlumnosSeleccionados(todos);
    }

    function deseleccionarTodos() {
        const ninguno = {};
        alumnos.forEach(a => {
            ninguno[a.id] = { ...alumnosSeleccionados[a.id], seleccionado: false };
        });
        setAlumnosSeleccionados(ninguno);
    }

    async function confirmarActa() {
        const alumnosActa = alumnos.filter(a => alumnosSeleccionados[a.id]?.seleccionado);

        if (alumnosActa.length === 0) {
            setMensaje({ tipo: 'error', texto: 'Debes seleccionar al menos un alumno para el acta' });
            return;
        }

        if (!numeroActa.trim()) {
            setMensaje({ tipo: 'error', texto: 'El número de acta es obligatorio' });
            return;
        }

        if (!fechaActa) {
            setMensaje({ tipo: 'error', texto: 'La fecha del acta es obligatoria' });
            return;
        }

        setCargandoActa(true);
        try {
            // 1. Crear el acta
            const { data: actaData, error: errorActa } = await supabase
                .from('fp_actas')
                .insert({
                    fp_curso_id: cursoId,
                    numero: numeroActa,
                    fecha: fechaActa,
                    estado: 'cargada',
                    cargada_por: docente.id,
                    observaciones: observacionesGenerales
                })
                .select()
                .single();

            if (errorActa) throw errorActa;

            // 2. Crear los detalles del acta
            const detalles = alumnosActa.map(a => ({
                fp_acta_id: actaData.id,
                fp_inscripcion_id: a.id,
                condicion: alumnosSeleccionados[a.id].condicion,
                observacion: alumnosSeleccionados[a.id].observacion || null
            }));

            const { error: errorDetalles } = await supabase
                .from('fp_actas_detalle')
                .insert(detalles);

            if (errorDetalles) throw errorDetalles;

            // 3. Actualizar estado de alumnos aprobados
            const aprobados = alumnosActa.filter(a => alumnosSeleccionados[a.id].condicion === 'aprobado');
            if (aprobados.length > 0) {
                const idsAprobados = aprobados.map(a => a.id);
                await supabase
                    .from('fp_inscripciones')
                    .update({ estado: 'egresado' })
                    .in('id', idsAprobados);
            }

            setMensaje({ tipo: 'ok', texto: `Acta ${numeroActa} cargada correctamente. ${aprobados.length} alumno(s) egresado(s).` });
            setModalActaAbierto(false);
            await cargarDatos();
        } catch (err) {
            console.error('Error al cargar acta:', err);
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        } finally {
            setCargandoActa(false);
        }
    }

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
                                            onClick={() => setModalActaAbierto(true)}
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
                                                        </div>
                                                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>aprobados</div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            padding: '3px 10px',
                                                            borderRadius: 4,
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            textTransform: 'uppercase',
                                                            background: a.estado === 'inscripto' || a.estado === 'en_curso' ? '#dcfce7' : a.estado === 'egresado' ? '#dbeafe' : '#fef3c7',
                                                            color: a.estado === 'inscripto' || a.estado === 'en_curso' ? '#15803d' : a.estado === 'egresado' ? '#1e40af' : '#92400e',
                                                            border: `1px solid ${a.estado === 'inscripto' || a.estado === 'en_curso' ? '#bbf7d0' : a.estado === 'egresado' ? '#bfdbfe' : '#fde68a'}`
                                                        }}>
                                                            {a.estado}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        {a.condicion_acta ? (
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '3px 10px',
                                                                borderRadius: 4,
                                                                fontSize: 11,
                                                                fontWeight: 600,
                                                                background: a.condicion_acta === 'aprobado' ? '#dcfce7' : '#fef3c7',
                                                                color: a.condicion_acta === 'aprobado' ? '#15803d' : '#92400e'
                                                            }}>
                                                                {a.condicion_acta}
                                                            </span>
                                                        ) : (
                                                            <span style={{ fontSize: 12, color: '#9ca3af' }}>Sin acta</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                        {a.url_carpeta_drive && (
                                                            <a
                                                                href={a.url_carpeta_drive}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1e3a8a', fontSize: 12, textDecoration: 'none', marginRight: 8 }}
                                                                title="Ver carpeta de Drive"
                                                            >
                                                                {Iconos.externo}
                                                            </a>
                                                        )}
                                                        <button
                                                            onClick={() => setMensaje({ tipo: 'ok', texto: `Ficha de ${a.apellido || a.nombre} - función en desarrollo` })}
                                                            style={{ background: '#f3f4f6', color: '#1e3a8a', border: '1px solid #d1d5db', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
                                                        >
                                                            Ver ficha
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {alumnosFiltrados.length === 0 && (
                                <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
                                    No se encontraron alumnos con los filtros seleccionados.
                                </div>
                            )}
                        </div>

                        {/* MODAL DE CARGA DE ACTA */}
                        {modalActaAbierto && (
                            <div style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0,0,0,0.7)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1000,
                                padding: 20
                            }} onClick={() => !cargandoActa && setModalActaAbierto(false)}>
                                <div style={{
                                    background: '#fff',
                                    borderRadius: 8,
                                    padding: 32,
                                    maxWidth: 1000,
                                    width: '100%',
                                    maxHeight: '90vh',
                                    overflow: 'auto',
                                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                                }} onClick={(e) => e.stopPropagation()}>

                                    <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #1e3a8a' }}>
                                        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>
                                            Cargar Acta de Finalización
                                        </h3>
                                        <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                                            {curso.nombre} · {curso.turno} {curso.anio}
                                        </p>
                                    </div>

                                    {/* Datos del acta */}
                                    <div style={{ marginBottom: 24 }}>
                                        <h4 style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase' }}>
                                            Datos del Acta
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                                            <div>
                                                <label style={labelStyle}>Número de Acta</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4b5563', cursor: 'pointer' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={numeroManual}
                                                            onChange={(e) => setNumeroManual(e.target.checked)}
                                                            style={{ width: 14, height: 14 }}
                                                        />
                                                        Ingresar manualmente
                                                    </label>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={numeroActa}
                                                    onChange={(e) => setNumeroActa(e.target.value)}
                                                    style={inputStyle}
                                                    placeholder="FP-2026-001"
                                                />
                                            </div>
                                            <div>
                                                <label style={labelStyle}>Fecha</label>
                                                <input
                                                    type="date"
                                                    value={fechaActa}
                                                    onChange={(e) => setFechaActa(e.target.value)}
                                                    style={inputStyle}
                                                />
                                            </div>
                                            <div>
                                                <label style={labelStyle}>Resolución</label>
                                                <input
                                                    type="text"
                                                    value={resolucion}
                                                    onChange={(e) => setResolucion(e.target.value)}
                                                    style={inputStyle}
                                                    placeholder="5036/16"
                                                />
                                            </div>
                                        </div>
                                        <div style={{ marginTop: 16 }}>
                                            <label style={labelStyle}>Equipo Docente</label>
                                            <textarea
                                                value={equipoDocente}
                                                onChange={(e) => setEquipoDocente(e.target.value)}
                                                style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                                                placeholder="Nombres de los docentes que integran el equipo..."
                                            />
                                        </div>
                                    </div>

                                    {/* Tabla de alumnos */}
                                    <div style={{ marginBottom: 24 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <h4 style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a', textTransform: 'uppercase', margin: 0 }}>
                                                Alumnos ({alumnos.filter(a => alumnosSeleccionados[a.id]?.seleccionado).length} seleccionados)
                                            </h4>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    onClick={seleccionarTodos}
                                                    style={{ background: '#f3f4f6', border: '1px solid #d1d5db', padding: '4px 12px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
                                                >
                                                    Seleccionar todos
                                                </button>
                                                <button
                                                    onClick={deseleccionarTodos}
                                                    style={{ background: '#f3f4f6', border: '1px solid #d1d5db', padding: '4px 12px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
                                                >
                                                    Deseleccionar todos
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                                <thead>
                                                    <tr style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                                                        <th style={{ padding: '8px 12px', textAlign: 'center', width: 40 }}>✓</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>DNI</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Apellido y Nombre</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'center', width: 140 }}>Condición</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Observación</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {alumnos.map(a => {
                                                        const seleccion = alumnosSeleccionados[a.id] || { seleccionado: true, condicion: 'aprobado', observacion: '' };
                                                        return (
                                                            <tr key={a.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={seleccion.seleccionado}
                                                                        onChange={() => toggleSeleccionAlumno(a.id)}
                                                                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                                                                    />
                                                                </td>
                                                                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>
                                                                    {a.dni || '—'}
                                                                </td>
                                                                <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                                                                    {a.apellido ? `${a.apellido}, ${a.nombre}` : a.nombre}
                                                                </td>
                                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                                    <select
                                                                        value={seleccion.condicion}
                                                                        onChange={(e) => actualizarCondicionAlumno(a.id, e.target.value)}
                                                                        disabled={!seleccion.seleccionado}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '4px 8px',
                                                                            borderRadius: 4,
                                                                            border: '1px solid #d1d5db',
                                                                            fontSize: 12,
                                                                            background: seleccion.seleccionado ? '#fff' : '#f3f4f6'
                                                                        }}
                                                                    >
                                                                        <option value="aprobado">Aprobado</option>
                                                                        <option value="libre">Libre</option>
                                                                        <option value="ausente">Ausente</option>
                                                                        <option value="desaprobado">Desaprobado</option>
                                                                    </select>
                                                                </td>
                                                                <td style={{ padding: '8px 12px' }}>
                                                                    <input
                                                                        type="text"
                                                                        value={seleccion.observacion}
                                                                        onChange={(e) => actualizarObservacionAlumno(a.id, e.target.value)}
                                                                        disabled={!seleccion.seleccionado}
                                                                        placeholder="Opcional"
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '4px 8px',
                                                                            borderRadius: 4,
                                                                            border: '1px solid #d1d5db',
                                                                            fontSize: 12,
                                                                            background: seleccion.seleccionado ? '#fff' : '#f3f4f6'
                                                                        }}
                                                                    />
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Resumen */}
                                    <div style={{ marginBottom: 24, padding: 16, background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                                        <h4 style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase' }}>
                                            Resumen
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                                            <div>
                                                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Total seleccionados</div>
                                                <div style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a' }}>
                                                    {alumnos.filter(a => alumnosSeleccionados[a.id]?.seleccionado).length}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 11, color: '#15803d', marginBottom: 4 }}>Aprobados</div>
                                                <div style={{ fontSize: 20, fontWeight: 700, color: '#15803d' }}>
                                                    {alumnos.filter(a => alumnosSeleccionados[a.id]?.seleccionado && alumnosSeleccionados[a.id].condicion === 'aprobado').length}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 11, color: '#92400e', marginBottom: 4 }}>Libres</div>
                                                <div style={{ fontSize: 20, fontWeight: 700, color: '#92400e' }}>
                                                    {alumnos.filter(a => alumnosSeleccionados[a.id]?.seleccionado && alumnosSeleccionados[a.id].condicion === 'libre').length}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Ausentes</div>
                                                <div style={{ fontSize: 20, fontWeight: 700, color: '#6b7280' }}>
                                                    {alumnos.filter(a => alumnosSeleccionados[a.id]?.seleccionado && alumnosSeleccionados[a.id].condicion === 'ausente').length}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 11, color: '#b91c1c', marginBottom: 4 }}>Desaprobados</div>
                                                <div style={{ fontSize: 20, fontWeight: 700, color: '#b91c1c' }}>
                                                    {alumnos.filter(a => alumnosSeleccionados[a.id]?.seleccionado && alumnosSeleccionados[a.id].condicion === 'desaprobado').length}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Observaciones generales */}
                                    <div style={{ marginBottom: 24 }}>
                                        <label style={labelStyle}>Observaciones Generales</label>
                                        <textarea
                                            value={observacionesGenerales}
                                            onChange={(e) => setObservacionesGenerales(e.target.value)}
                                            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                                            placeholder="Observaciones generales del acta..."
                                        />
                                    </div>

                                    {/* Botones */}
                                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                                        <button
                                            onClick={() => setModalActaAbierto(false)}
                                            disabled={cargandoActa}
                                            style={{
                                                background: '#fff',
                                                color: '#4b5563',
                                                border: '1px solid #d1d5db',
                                                padding: '10px 20px',
                                                borderRadius: 4,
                                                fontSize: 13,
                                                fontWeight: 500,
                                                cursor: cargandoActa ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={confirmarActa}
                                            disabled={cargandoActa}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                background: cargandoActa ? '#9ca3af' : '#1e3a8a',
                                                color: '#fff',
                                                border: 'none',
                                                padding: '10px 20px',
                                                borderRadius: 4,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: cargandoActa ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            {cargandoActa ? 'Cargando...' : (
                                                <>
                                                    {Iconos.check} Confirmar y Cargar Acta
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Sidebar>
    );
}