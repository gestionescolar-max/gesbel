'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Sidebar from '@/components/Sidebar';

// ============================================================
// CONSTANTES
// ============================================================
const TIPOS_EVIDENCIA = ['conocimiento', 'desempeno', 'producto'];
const TIPOS_EVIDENCIA_LABEL = {
    conocimiento: 'C',
    desempeno: 'D',
    producto: 'P'
};

const ESTADOS_BLOQUEADOS = ['abandono', 'abandono_justificado', 'nunca_asistio', 'diferido'];

const Iconos = {
    volver: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
    check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>,
    alerta: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    bloqueado: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    planilla: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>,
    proyecto: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
    libro: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>,
    acta: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function CursoFPDetallePage() {
    const params = useParams();
    const router = useRouter();
    const { docente, cargando: cargandoDocente } = useDocente();
    const cursoId = params?.id ? Number(params.id) : null;

    // Estados de datos
    const [curso, setCurso] = useState(null);
    const [funciones, setFunciones] = useState([]);
    const [funcionActiva, setFuncionActiva] = useState(null);
    const [capacidades, setCapacidades] = useState([]);
    const [evidencias, setEvidencias] = useState({});
    const [alumnos, setAlumnos] = useState([]);
    const [calificaciones, setCalificaciones] = useState({});
    const [tabActiva, setTabActiva] = useState('planilla');

    // Estados de UI
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState(null);

    // ============================================================
    // CARGA INICIAL
    // ============================================================
    useEffect(() => {
        if (!docente || !cursoId) return;
        cargarDatos();
    }, [docente, cursoId]);

    useEffect(() => {
        if (funcionActiva && alumnos.length > 0) {
            cargarCapacidadesYCalificaciones();
        }
    }, [funcionActiva]);

    async function cargarDatos() {
        setCargando(true);
        try {
            const { data: cursoData, error: errorCurso } = await supabase
                .from('fp_cursos')
                .select('*')
                .eq('id', cursoId)
                .single();
            if (errorCurso) throw errorCurso;
            setCurso(cursoData);

            const { data: funcionesData, error: errorFunciones } = await supabase
                .from('fp_funciones')
                .select('*')
                .eq('fp_curso_id', cursoId)
                .order('orden');
            if (errorFunciones) throw errorFunciones;
            setFunciones(funcionesData || []);
            if (funcionesData && funcionesData.length > 0) {
                setFuncionActiva(funcionesData[0]);
            }

            const { data: inscripcionesData, error: errorInsc } = await supabase
                .from('fp_inscripciones')
                .select(`
                    id, fp_alumno_id, estado, legajo,
                    fp_alumnos(id, dni, apellido, nombre)
                `)
                .eq('fp_curso_id', cursoId)
                .order('creado_en');
            if (errorInsc) throw errorInsc;

            const alumnosProcesados = (inscripcionesData || []).map(insc => ({
                inscripcionId: insc.id,
                alumnoId: insc.fp_alumno_id,
                legajo: insc.legajo,
                estado: insc.estado,
                dni: insc.fp_alumnos?.dni,
                apellido: insc.fp_alumnos?.apellido,
                nombre: insc.fp_alumnos?.nombre,
                bloqueado: ESTADOS_BLOQUEADOS.includes(insc.estado)
            }));
            setAlumnos(alumnosProcesados);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error al cargar: ${err.message}` });
        } finally {
            setCargando(false);
        }
    }

    async function cargarCapacidadesYCalificaciones() {
        if (!funcionActiva) return;
        try {
            const { data: capsData, error: errorCaps } = await supabase
                .from('fp_capacidades')
                .select('*')
                .eq('fp_funcion_id', funcionActiva.id)
                .order('orden');
            if (errorCaps) throw errorCaps;
            setCapacidades(capsData || []);

            const capIds = (capsData || []).map(c => c.id);
            const { data: evidData, error: errorEvid } = await supabase
                .from('fp_evidencias')
                .select('*')
                .in('fp_capacidad_id', capIds)
                .order('orden');
            if (errorEvid) throw errorEvid;

            const evidPorCap = {};
            (evidData || []).forEach(e => {
                if (!evidPorCap[e.fp_capacidad_id]) evidPorCap[e.fp_capacidad_id] = [];
                evidPorCap[e.fp_capacidad_id].push(e);
            });
            setEvidencias(evidPorCap);

            const inscIds = alumnos.map(a => a.inscripcionId);
            const evidIds = (evidData || []).map(e => e.id);

            if (inscIds.length > 0 && evidIds.length > 0) {
                const { data: califsData, error: errorCalifs } = await supabase
                    .from('fp_calificaciones')
                    .select('*')
                    .in('fp_inscripcion_id', inscIds)
                    .in('fp_evidencia_id', evidIds);
                if (errorCalifs) throw errorCalifs;

                const califsMap = {};
                (califsData || []).forEach(c => {
                    califsMap[`${c.fp_inscripcion_id}_${c.fp_evidencia_id}`] = c.valor;
                });
                setCalificaciones(califsMap);
            } else {
                setCalificaciones({});
            }
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error al cargar capacidades: ${err.message}` });
        }
    }

    // ============================================================
    // GUARDAR CALIFICACIÓN
    // ============================================================
    async function guardarCalificacion(inscripcionId, evidenciaId, valor, alumnoBloqueado) {
        if (alumnoBloqueado) {
            setMensaje({
                tipo: 'error',
                texto: 'Este alumno no puede ser calificado (estado: abandono, nunca asistió o diferido).'
            });
            return;
        }

        const key = `${inscripcionId}_${evidenciaId}`;
        const valorActual = calificaciones[key];
        const nuevoValor = valorActual === valor ? null : valor;

        setGuardando(true);
        try {
            if (nuevoValor) {
                const { error } = await supabase
                    .from('fp_calificaciones')
                    .upsert({
                        fp_inscripcion_id: inscripcionId,
                        fp_evidencia_id: evidenciaId,
                        valor: nuevoValor,
                        docente_id: docente?.id || null,
                        fecha_registro: new Date().toISOString().split('T')[0]
                    }, { onConflict: 'fp_inscripcion_id,fp_evidencia_id' });
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('fp_calificaciones')
                    .delete()
                    .eq('fp_inscripcion_id', inscripcionId)
                    .eq('fp_evidencia_id', evidenciaId);
                if (error) throw error;
            }

            setCalificaciones(prev => {
                const nuevo = { ...prev };
                if (nuevoValor) {
                    nuevo[key] = nuevoValor;
                } else {
                    delete nuevo[key];
                }
                return nuevo;
            });
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error al guardar: ${err.message}` });
        } finally {
            setGuardando(false);
        }
    }

    // ============================================================
    // CÁLCULOS
    // ============================================================
    function calcularCapacidadesAlcanzadas(inscripcionId) {
        let alcanzadas = 0;
        const total = capacidades.length;

        capacidades.forEach(cap => {
            const evidsCap = evidencias[cap.id] || [];
            const todasA = evidsCap.length === 3 &&
                evidsCap.every(e => calificaciones[`${inscripcionId}_${e.id}`] === 'A');
            if (todasA) alcanzadas++;
        });

        return { alcanzadas, total };
    }

    function obtenerEstadoSugerido(alcanzadas, total) {
        if (total === 0) return { estado: 'sin_evaluar', color: '#9ca3af', texto: 'Sin evaluar' };
        const porcentaje = (alcanzadas / total) * 100;
        if (porcentaje >= 50) return { estado: 'aprobado', color: '#15803d', texto: 'Aprobado' };
        if (alcanzadas > 0) return { estado: 'en_proceso', color: '#d97706', texto: 'En proceso' };
        return { estado: 'no_alcanzado', color: '#991b1b', texto: 'No alcanzado' };
    }

    function getBgColor(color, opacity) {
        // Convierte hex a rgba para opacidad
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // ============================================================
    // RENDER
    // ============================================================
    if (cargandoDocente || cargando) {
        return (
            <Sidebar docente={docente} titulo="Cargando...">
                <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>Cargando curso...</div>
            </Sidebar>
        );
    }

    if (!curso) {
        return (
            <Sidebar docente={docente} titulo="Curso no encontrado">
                <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
                    <div style={{ fontSize: 16, marginBottom: 16 }}>No se encontró el curso solicitado.</div>
                    <button onClick={() => router.push('/docente/cursos')} style={{ background: '#1e3a8a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, cursor: 'pointer' }}>
                        Volver a mis cursos
                    </button>
                </div>
            </Sidebar>
        );
    }

    if (funciones.length === 0) {
        return (
            <Sidebar docente={docente} titulo={curso.nombre}>
                <div style={{ padding: 60, textAlign: 'center', color: '#6b7280', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, margin: 24 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Este curso no tiene funciones cargadas</div>
                    <div style={{ fontSize: 14 }}>El administrador debe cargar el diseño curricular del perfil.</div>
                    <button onClick={() => router.push('/docente/cursos')} style={{ marginTop: 16, background: '#1e3a8a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, cursor: 'pointer' }}>
                        Volver a mis cursos
                    </button>
                </div>
            </Sidebar>
        );
    }

    return (
        <Sidebar docente={docente} titulo={curso.nombre}>
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>

                {mensaje && (
                    <div style={{
                        background: mensaje.tipo === 'ok' ? '#f0fdf4' : mensaje.tipo === 'error' ? '#fef2f2' : '#eff6ff',
                        border: `1px solid ${mensaje.tipo === 'ok' ? '#bbf7d0' : mensaje.tipo === 'error' ? '#fecaca' : '#bfdbfe'}`,
                        color: mensaje.tipo === 'ok' ? '#15803d' : mensaje.tipo === 'error' ? '#b91c1c' : '#1e40af',
                        padding: 14, borderRadius: 8, marginBottom: 20, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8
                    }}>
                        {mensaje.tipo === 'error' && Iconos.alerta}
                        {mensaje.tipo === 'ok' && Iconos.check}
                        <span>{mensaje.texto}</span>
                    </div>
                )}

                <div style={{ marginBottom: 24 }}>
                    <button onClick={() => router.push('/docente/cursos')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#1e3a8a', fontSize: 14, fontWeight: 500, cursor: 'pointer', padding: 0, marginBottom: 12 }}>
                        {Iconos.volver} Volver a mis cursos
                    </button>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a', marginBottom: 4, marginTop: 0 }}>
                        {curso.nombre.replace(/\s*[-–—]\s*\d{4}\s*$/, '').trim()}
                    </h2>
                    <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                        Ciclo {curso.anio} · {curso.turno} · {alumnos.length} alumnos inscriptos
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #e5e7eb' }}>
                    {[
                        { id: 'planilla', label: 'Planilla de calificaciones', icon: Iconos.planilla },
                        { id: 'proyecto', label: 'Proyecto áulico', icon: Iconos.proyecto },
                        { id: 'libro', label: 'Libro de temas', icon: Iconos.libro },
                        { id: 'acta', label: 'Acta de finalización', icon: Iconos.acta }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setTabActiva(tab.id)}
                            style={{
                                padding: '12px 20px',
                                background: tabActiva === tab.id ? '#1e3a8a' : 'transparent',
                                color: tabActiva === tab.id ? '#fff' : '#4b5563',
                                border: 'none',
                                borderBottom: tabActiva === tab.id ? '2px solid #1e3a8a' : '2px solid transparent',
                                fontSize: 14,
                                fontWeight: tabActiva === tab.id ? 600 : 400,
                                cursor: 'pointer',
                                marginBottom: -2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {tabActiva === 'planilla' && (
                    <div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                            {funciones.map(fn => (
                                <button
                                    key={fn.id}
                                    onClick={() => setFuncionActiva(fn)}
                                    style={{
                                        padding: '10px 16px',
                                        background: funcionActiva?.id === fn.id ? '#1e3a8a' : '#fff',
                                        color: funcionActiva?.id === fn.id ? '#fff' : '#4b5563',
                                        border: `1px solid ${funcionActiva?.id === fn.id ? '#1e3a8a' : '#d1d5db'}`,
                                        borderRadius: 6,
                                        fontSize: 13,
                                        fontWeight: funcionActiva?.id === fn.id ? 600 : 400,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        maxWidth: 320
                                    }}
                                >
                                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>F{fn.nro_funcion}</div>
                                    <div style={{ fontSize: 12, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {fn.descripcion}
                                    </div>
                                    {fn.carga_horaria && (
                                        <div style={{ fontSize: 10, marginTop: 4, opacity: 0.8 }}>{fn.carga_horaria} hs</div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {funcionActiva && (
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 16, marginBottom: 24 }}>
                                <div style={{ fontSize: 12, color: '#1e40af', fontWeight: 700, marginBottom: 4 }}>
                                    FUNCIÓN {funcionActiva.nro_funcion} DE {funciones.length}
                                </div>
                                <div style={{ fontSize: 14, color: '#1e3a8a', fontWeight: 600, marginBottom: 4 }}>
                                    {funcionActiva.descripcion}
                                </div>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>
                                    {capacidades.length} capacidades · {capacidades.length * 3} evidencias a evaluar
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', fontSize: 12, color: '#6b7280' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 24, height: 24, background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#15803d', fontSize: 11 }}>A</span>
                                <span>Alcanzado</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 24, height: 24, background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#92400e', fontSize: 11 }}>EP</span>
                                <span>En proceso</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 24, height: 24, background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#991b1b', fontSize: 11 }}>NA</span>
                                <span>No alcanzado</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                                {Iconos.bloqueado}
                                <span>Alumno bloqueado</span>
                            </div>
                        </div>

                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 800 }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, position: 'sticky', left: 0, background: '#f9fafb', zIndex: 10, minWidth: 200 }}>
                                                Alumno
                                            </th>
                                            {capacidades.map(cap => (
                                                <th
                                                    key={cap.id}
                                                    colSpan={3}
                                                    style={{
                                                        padding: '8px 4px',
                                                        textAlign: 'center',
                                                        fontSize: 10,
                                                        textTransform: 'uppercase',
                                                        color: '#1e3a8a',
                                                        fontWeight: 700,
                                                        borderBottom: '2px solid #e5e7eb',
                                                        borderLeft: '1px solid #e5e7eb',
                                                        minWidth: 120
                                                    }}
                                                >
                                                    <div style={{ fontSize: 10, marginBottom: 2 }}>Cap. {cap.nro_capacidad}</div>
                                                    <div style={{ fontSize: 9, fontWeight: 400, color: '#6b7280', lineHeight: 1.2, maxHeight: 32, overflow: 'hidden' }} title={cap.descripcion}>
                                                        {cap.descripcion}
                                                    </div>
                                                </th>
                                            ))}
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, borderLeft: '2px solid #e5e7eb', minWidth: 80 }}>
                                                Alcanzadas
                                            </th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, minWidth: 100 }}>
                                                Estado
                                            </th>
                                        </tr>
                                        <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                            <th style={{ padding: 0, background: '#f9fafb', position: 'sticky', left: 0, zIndex: 10 }}></th>
                                            {capacidades.map(cap => (
                                                TIPOS_EVIDENCIA.map(tipo => (
                                                    <th
                                                        key={`${cap.id}_${tipo}`}
                                                        style={{
                                                            padding: '6px 4px',
                                                            textAlign: 'center',
                                                            fontSize: 10,
                                                            color: '#6b7280',
                                                            fontWeight: 600,
                                                            borderLeft: '1px solid #e5e7eb'
                                                        }}
                                                    >
                                                        {TIPOS_EVIDENCIA_LABEL[tipo]}
                                                    </th>
                                                ))
                                            ))}
                                            <th style={{ padding: 0, borderLeft: '2px solid #e5e7eb', background: '#f9fafb' }}></th>
                                            <th style={{ padding: 0, background: '#f9fafb' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {alumnos.map((alumno, idxAlumno) => {
                                            const { alcanzadas, total } = calcularCapacidadesAlcanzadas(alumno.inscripcionId);
                                            const estadoSugerido = obtenerEstadoSugerido(alcanzadas, total);

                                            return (
                                                <tr
                                                    key={alumno.inscripcionId}
                                                    style={{
                                                        borderBottom: idxAlumno < alumnos.length - 1 ? '1px solid #e5e7eb' : 'none',
                                                        background: alumno.bloqueado ? '#f9fafb' : '#fff',
                                                        opacity: alumno.bloqueado ? 0.7 : 1
                                                    }}
                                                >
                                                    <td style={{ padding: '10px 16px', position: 'sticky', left: 0, background: alumno.bloqueado ? '#f9fafb' : '#fff', zIndex: 5, borderBottom: idxAlumno < alumnos.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                                        <div style={{ fontWeight: 600, color: '#1e3a8a', fontSize: 13 }}>
                                                            {alumno.apellido ? `${alumno.apellido}, ${alumno.nombre}` : alumno.nombre}
                                                        </div>
                                                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                                                            DNI {alumno.dni || '—'}
                                                            {alumno.legajo && <span style={{ marginLeft: 8 }}>· {alumno.legajo}</span>}
                                                        </div>
                                                        {alumno.bloqueado && (
                                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, padding: '2px 6px', background: '#fee2e2', color: '#991b1b', borderRadius: 3, fontSize: 10, fontWeight: 600 }}>
                                                                {Iconos.bloqueado} {alumno.estado}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {capacidades.map(cap => {
                                                        const evidsCap = evidencias[cap.id] || [];
                                                        return TIPOS_EVIDENCIA.map(tipo => {
                                                            const evidencia = evidsCap.find(e => e.tipo_evidencia === tipo);
                                                            if (!evidencia) {
                                                                return <td key={`${cap.id}_${tipo}`} style={{ padding: 0, borderLeft: '1px solid #e5e7eb' }}></td>;
                                                            }
                                                            const key = `${alumno.inscripcionId}_${evidencia.id}`;
                                                            const valorActual = calificaciones[key];

                                                            const estilosBoton = {
                                                                A: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
                                                                EP: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
                                                                NA: { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
                                                                vacio: { bg: '#f9fafb', color: '#9ca3af', border: '#e5e7eb' }
                                                            };
                                                            const estilo = estilosBoton[valorActual] || estilosBoton.vacio;

                                                            return (
                                                                <td
                                                                    key={`${cap.id}_${tipo}`}
                                                                    style={{
                                                                        padding: '4px',
                                                                        textAlign: 'center',
                                                                        borderLeft: '1px solid #e5e7eb'
                                                                    }}
                                                                >
                                                                    <button
                                                                        onClick={() => guardarCalificacion(alumno.inscripcionId, evidencia.id, 'A', alumno.bloqueado)}
                                                                        disabled={guardando || alumno.bloqueado}
                                                                        title={alumno.bloqueado ? 'Alumno bloqueado' : 'Alcanzado'}
                                                                        style={{
                                                                            width: 28,
                                                                            height: 28,
                                                                            borderRadius: 4,
                                                                            border: `1px solid ${estilo.border}`,
                                                                            background: valorActual === 'A' ? estilo.bg : '#fff',
                                                                            color: valorActual === 'A' ? estilo.color : '#9ca3af',
                                                                            fontSize: 10,
                                                                            fontWeight: 700,
                                                                            cursor: alumno.bloqueado ? 'not-allowed' : 'pointer',
                                                                            opacity: alumno.bloqueado ? 0.4 : 1
                                                                        }}
                                                                    >
                                                                        A
                                                                    </button>
                                                                </td>
                                                            );
                                                        });
                                                    })}

                                                    <td style={{ padding: '10px 16px', textAlign: 'center', borderLeft: '2px solid #e5e7eb', fontWeight: 700, color: '#1e3a8a', fontSize: 13 }}>
                                                        {alcanzadas}/{total}
                                                    </td>

                                                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            padding: '4px 10px',
                                                            borderRadius: 4,
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            background: getBgColor(estadoSugerido.color, 0.1),
                                                            color: estadoSugerido.color,
                                                            border: `1px solid ${getBgColor(estadoSugerido.color, 0.3)}`
                                                        }}>
                                                            {estadoSugerido.texto}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {alumnos.length === 0 && (
                                <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
                                    No hay alumnos inscriptos en este curso.
                                </div>
                            )}
                        </div>

                        {alumnos.length > 0 && (
                            <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, borderLeft: '3px solid #1e3a8a' }}>
                                    <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Total alumnos</div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: '#1e3a8a' }}>{alumnos.length}</div>
                                </div>
                                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, borderLeft: '3px solid #15803d' }}>
                                    <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Activos</div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: '#15803d' }}>
                                        {alumnos.filter(a => !a.bloqueado).length}
                                    </div>
                                </div>
                                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, borderLeft: '3px solid #991b1b' }}>
                                    <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Bloqueados</div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: '#991b1b' }}>
                                        {alumnos.filter(a => a.bloqueado).length}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {tabActiva === 'proyecto' && (
                    <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📋</div>
                        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Proyecto Áulico</div>
                        <div style={{ fontSize: 14 }}>Próximamente disponible.</div>
                    </div>
                )}

                {tabActiva === 'libro' && (
                    <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📖</div>
                        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Libro de Temas</div>
                        <div style={{ fontSize: 14 }}>Próximamente disponible.</div>
                    </div>
                )}

                {tabActiva === 'acta' && (
                    <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📜</div>
                        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Acta de Finalización</div>
                        <div style={{ fontSize: 14 }}>
                            El acta se genera cuando el alumno completa todas las funciones del perfil.
                            <br />
                            <strong>Funciones del curso:</strong> {funciones.length}
                        </div>
                    </div>
                )}
            </div>
        </Sidebar>
    );
}