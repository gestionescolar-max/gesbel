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
// FUNCIONES HELPER (para el acta legal)
// ============================================================
function numeroALetras(num) {
    const unidades = ['Cero', 'Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho', 'Nueve', 'Diez', 'Once', 'Doce', 'Trece', 'Catorce', 'Quince', 'Dieciseis', 'Diecisiete', 'Dieciocho', 'Diecinueve', 'Veinte'];
    if (num === 0) return 'Ninguno';
    if (num <= 20) return unidades[num];
    if (num < 30) return 'Veinti' + unidades[num - 20].toLowerCase();
    if (num === 30) return 'Treinta';
    if (num < 40) return 'Treinta y ' + unidades[num - 30].toLowerCase();
    if (num === 40) return 'Cuarenta';
    return num.toString();
}

function mesALetras(mesIndex) {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[mesIndex] || '';
}

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
    const [tabActiva, setTabActiva] = useState('proyecto');

    // Estados de UI
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState(null);
    const [uid, setUid] = useState(null);
    const [proyectosHistorial, setProyectosHistorial] = useState([]);
    const [esMobile, setEsMobile] = useState(false);

    // Estados para el Acta
    const [actaFirmada, setActaFirmada] = useState(false);
    const [actaId, setActaId] = useState(null);
    const [calificacionesActa, setCalificacionesActa] = useState({});
    const [guardandoActa, setGuardandoActa] = useState(false);
    const [fechaCierre, setFechaCierre] = useState(null);

    useEffect(() => {
        const checkMobile = () => setEsMobile(window.innerWidth < 768);
        checkMobile(); // Verificar al cargar
        window.addEventListener('resize', checkMobile); // Escuchar cambios de tamaño
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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
    }, [funcionActiva, alumnos.length]);

    async function cargarDatos() {
        setCargando(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setUid(user?.id || null);

            // 1. Obtener el curso
            const { data: cursoData, error: errorCurso } = await supabase
                .from('fp_cursos')
                .select('*')
                .eq('id', cursoId)
                .single();
            if (errorCurso) throw errorCurso;
            setCurso(cursoData);

            // 2. Obtener las funciones USANDO EL ID DEL PERFIL (no del curso)
            const { data: funcionesData, error: errorFunciones } = await supabase
                .from('fp_funciones')
                .select('*')
                .eq('fp_perfil_id', cursoData.fp_perfil_id) // ✅ CAMBIO CLAVE
                .order('orden');
            if (errorFunciones) throw errorFunciones;

            setFunciones(funcionesData || []);
            if (funcionesData && funcionesData.length > 0) {
                setFuncionActiva(funcionesData[0]);
            }

            // 3. Obtener inscripciones (alumnos)
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

            // 4. Obtener historial de proyectos áulicos
            const { data: proyectosHist, error: errorHist } = await supabase
                .from('fp_proyectos_aulicos')
                .select(`
                    id, titulo, descripcion, archivo_url, anio_lectivo, creado_en,
                    fp_proyecto_capacidades (id)
                `)
                .eq('fp_curso_id', cursoId)
                .order('anio_lectivo', { ascending: false });

            if (errorHist) throw errorHist;

            const proyectosConCapacidades = (proyectosHist || []).map(p => ({
                ...p,
                capacidades_evaluables: (p.fp_proyecto_capacidades || []).length
            }));
            setProyectosHistorial(proyectosConCapacidades);

            setAlumnos(alumnosProcesados);

            // NOTA: No llamamos a cargarCapacidadesYCalificaciones() aquí manualmente.
            // El useEffect que ya tienes al inicio del componente se encargará de 
            // dispararlo automáticamente cuando funcionActiva y alumnos.length se actualicen.

        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error al cargar: ${err.message}` });
        } finally {
            setCargando(false);
        }
    }

    async function cargarCapacidadesYCalificaciones() {
        if (!funcionActiva) return;
        try {
            // 1. Verificar si existe proyecto áulico para este curso
            const anio = curso?.anio || new Date().getFullYear();
            const { data: proyectoData, error: errorProy } = await supabase
                .from('fp_proyectos_aulicos')
                .select('id')
                .eq('fp_curso_id', cursoId)
                .eq('anio_lectivo', anio)
                .maybeSingle();

            if (errorProy) throw errorProy;

            if (!proyectoData) {
                // No hay proyecto áulico → mostrar aviso
                setCapacidades([]);
                setEvidencias({});
                setCalificaciones({});
                setMensaje({
                    tipo: 'warning',
                    texto: 'El docente no cargó el Proyecto Áulico. Sin proyecto no se pueden evaluar capacidades. Andá a la pestaña "Proyecto áulico" para cargarlo.'
                });
                return;
            }

            // 2. Obtener capacidades tildadas en el proyecto para esta función
            const { data: capsDelProyecto, error: errorCapsProy } = await supabase
                .from('fp_proyecto_capacidades')
                .select('fp_capacidad_id')
                .eq('fp_proyecto_id', proyectoData.id)
                .eq('evaluable', true);

            if (errorCapsProy) throw errorCapsProy;

            const capsTildadasIds = new Set((capsDelProyecto || []).map(c => c.fp_capacidad_id));

            // 3. Cargar todas las capacidades de la función activa
            const { data: capsData, error: errorCaps } = await supabase
                .from('fp_capacidades')
                .select('*')
                .eq('fp_funcion_id', funcionActiva.id)
                .order('orden');

            if (errorCaps) throw errorCaps;

            // 4. Filtrar solo las que están tildadas en el proyecto
            const capsFiltradas = (capsData || []).filter(c => capsTildadasIds.has(c.id));
            setCapacidades(capsFiltradas);

            // 5. Si no hay capacidades tildadas para esta función, mostrar aviso
            if (capsFiltradas.length === 0) {
                setEvidencias({});
                setCalificaciones({});
                setMensaje({
                    tipo: 'warning',
                    texto: `No hay capacidades evaluables para la Función ${funcionActiva.nro_funcion}. El docente debe tildarlas en el Proyecto Áulico.`
                });
                return;
            }

            // 6. Cargar evidencias de las capacidades filtradas
            const capIds = capsFiltradas.map(c => c.id);
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

            // 7. Cargar calificaciones existentes
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

            // Limpiar mensaje de error si todo salió bien
            setMensaje(null);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error al cargar capacidades: ${err.message}` });
        }
    }

    async function cargarActa() {
        if (!cursoId || alumnos.length === 0) return;

        // 1. Buscar si ya existe un acta para este curso
        const { data: actasExistentes } = await supabase
            .from('fp_actas')
            .select('*')
            .eq('fp_curso_id', cursoId) // Nota: Si tu tabla usa fp_perfil_id, cámbialo aquí
            .order('creado_en', { ascending: false })
            .limit(1);

        if (actasExistentes && actasExistentes.length > 0) {
            const acta = actasExistentes[0];
            setActaId(acta.id);
            setActaFirmada(acta.estado === 'firmada' || !!acta.docente_firma);
            setFechaCierre(acta.fecha);
            // Cargar las calificaciones guardadas
            const { data: detalles } = await supabase
                .from('fp_actas_detalle')
                .select('*')
                .eq('fp_acta_id', acta.id);

            const califs = {};
            detalles.forEach(d => {
                califs[d.fp_inscripcion_id] = { condicion: d.condicion, confirmado: true };
            });
            setCalificacionesActa(califs);
        } else {
            // 2. Si no existe, inicializar con los valores calculados automáticamente
            const califsIniciales = {};
            alumnos.forEach(alumno => {
                const { alcanzadas, total } = calcularCapacidadesAlcanzadas(alumno.inscripcionId);
                let condicion = 'Desaprobado';
                if (alumno.bloqueado) condicion = 'Ausente';
                else if (total > 0 && (alcanzadas / total) >= 0.5) condicion = 'Aprobado';

                califsIniciales[alumno.inscripcionId] = { condicion, confirmado: false };
            });
            setCalificacionesActa(califsIniciales);
        }
    }

    // Efecto para cargar el acta cuando se abre la pestaña
    useEffect(() => {
        if (tabActiva === 'acta' && alumnos.length > 0) {
            cargarActa();
        }
    }, [tabActiva, alumnos.length]);

    // Funciones para manejar los cambios en la UI
    const handleCalificacionChange = (inscripcionId, nuevaCondicion) => {
        setCalificacionesActa(prev => ({
            ...prev,
            [inscripcionId]: { ...prev[inscripcionId], condicion: nuevaCondicion }
        }));
    };

    const handleConfirmChange = (inscripcionId, confirmado) => {
        setCalificacionesActa(prev => ({
            ...prev,
            [inscripcionId]: { ...prev[inscripcionId], confirmado }
        }));
    };

    // Función para guardar y firmar
    async function firmarYGuardarActa() {
        const noConfirmados = alumnos.filter(a => !calificacionesActa[a.inscripcionId]?.confirmado);
        if (noConfirmados.length > 0) {
            if (!confirm(`Hay ${noConfirmados.length} alumnos sin marcar como "Confirmados". ¿Desea firmar de todos modos?`)) {
                return;
            }
        }

        setGuardandoActa(true);
        try {
            // Contar resultados
            const conteo = { Aprobado: 0, Desaprobado: 0, Ausente: 0 };
            Object.values(calificacionesActa).forEach(c => {
                conteo[c.condicion] = (conteo[c.condicion] || 0) + 1;
            });

            const actaData = {
                fp_curso_id: cursoId, // Asegúrate de que esta columna exista en fp_actas
                fp_perfil_id: curso.fp_perfil_id,
                resolucion: curso.resolucion || 'Res. Min. 5036/16',
                fecha: new Date().toISOString().split('T')[0],
                total_alumnos: alumnos.length,
                aprobados: conteo.Aprobado,
                desaprobados: conteo.Desaprobado,
                ausentes: conteo.Ausente,
                docente_firma: docente?.nombre || 'Docente a cargo',
                estado: 'firmada'
            };

            let idActaLocal = actaId;
            if (!idActaLocal) {
                const { data: nuevaActa, error: errorActa } = await supabase
                    .from('fp_actas')
                    .insert(actaData)
                    .select()
                    .single();
                if (errorActa) throw errorActa;
                idActaLocal = nuevaActa.id;
                setActaId(idActaLocal);
            } else {
                const { error: errorUpdate } = await supabase
                    .from('fp_actas')
                    .update(actaData)
                    .eq('id', idActaLocal);
                if (errorUpdate) throw errorUpdate;
            }

            // Guardar detalles (upsert para permitir re-guardar si hubo error a mitad de camino)
            const detallesParaGuardar = Object.entries(calificacionesActa).map(([inscripcionId, data]) => ({
                fp_acta_id: idActaLocal,
                fp_inscripcion_id: parseInt(inscripcionId),
                condicion: data.condicion
            }));

            const { error: errorDetalle } = await supabase
                .from('fp_actas_detalle')
                .upsert(detallesParaGuardar, { onConflict: 'fp_acta_id,fp_inscripcion_id' });

            if (errorDetalle) throw errorDetalle;

            const fechaHoy = new Date().toISOString().split('T')[0];
            setFechaCierre(fechaHoy);  // ← AGREGAR ESTA LÍNEA

            setActaFirmada(true);
            setMensaje({ tipo: 'ok', texto: '✅ Acta firmada, guardada y bloqueada correctamente.' });
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error al guardar el acta: ${err.message}` });
        } finally {
            setGuardandoActa(false);
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
                        docente_id: uid,
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
                        { id: 'proyecto', label: 'Proyecto áulico', icon: Iconos.proyecto },
                        { id: 'libro', label: 'Libro de temas', icon: Iconos.libro },
                        { id: 'planilla', label: 'Planilla de calificaciones', icon: Iconos.planilla },
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
                        {/* 1. SELECTOR DE FUNCIONES */}
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

                        {/* 2. INFO DE LA FUNCIÓN ACTIVA */}
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

                        {/* 3. LEYENDA DE ESTADOS */}
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

                        {/* 4. MENSAJE DE ADVERTENCIA SI NO HAY CAPACIDADES */}
                        {funcionActiva && capacidades.length === 0 && (
                            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: 16, marginBottom: 24, fontSize: 13, color: '#92400e' }}>
                                ⚠️ No hay capacidades evaluables para esta función. El docente debe definir qué capacidades evalúa en el <button onClick={() => setTabActiva('proyecto')} style={{ background: 'none', border: 'none', color: '#92400e', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}>Proyecto Áulico</button>.
                            </div>
                        )}

                        {/* 5. ÁREA DE DATOS: MOBILE VS DESKTOP */}
                        {funcionActiva && capacidades.length > 0 && (
                            esMobile ? (
                                // ==========================================
                                // VISTA MOBILE: Tarjetas verticales por Capacidad
                                // ==========================================
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {capacidades.map((cap) => {
                                        const evidsCap = evidencias[cap.id] || [];
                                        return (
                                            <div key={cap.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                                {/* Encabezado de la Capacidad */}
                                                <div style={{ background: '#1e3a8a', color: '#fff', padding: '12px 16px' }}>
                                                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, marginBottom: 4 }}>CAPACIDAD {cap.nro_capacidad}</div>
                                                    <div style={{ fontSize: 13, lineHeight: 1.3, fontWeight: 500 }}>{cap.descripcion}</div>
                                                </div>

                                                {/* Lista de Alumnos dentro de esta capacidad */}
                                                <div style={{ padding: 12 }}>
                                                    {alumnos.map((alumno, idx) => {
                                                        const { alcanzadas, total } = calcularCapacidadesAlcanzadas(alumno.inscripcionId);
                                                        const estadoSugerido = obtenerEstadoSugerido(alcanzadas, total);

                                                        return (
                                                            <div key={alumno.inscripcionId} style={{ padding: '12px 0', borderBottom: idx < alumnos.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                                                {/* Datos del Alumno */}
                                                                <div style={{ marginBottom: 10 }}>
                                                                    <div style={{ fontWeight: 600, color: '#1e3a8a', fontSize: 14 }}>
                                                                        {alumno.apellido ? `${alumno.apellido}, ${alumno.nombre}` : alumno.nombre}
                                                                    </div>
                                                                    <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                        <span>DNI {alumno.dni || '—'}</span>
                                                                        {alumno.bloqueado && (
                                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', background: '#fee2e2', color: '#991b1b', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                                                                                {Iconos.bloqueado} Bloqueado
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Botones de Calificación (C, D, P) */}
                                                                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                                                                    {TIPOS_EVIDENCIA.map(tipo => {
                                                                        const evidencia = evidsCap.find(e => e.tipo_evidencia === tipo);
                                                                        if (!evidencia) return null;

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
                                                                            <button
                                                                                key={tipo}
                                                                                onClick={() => guardarCalificacion(alumno.inscripcionId, evidencia.id, 'A', alumno.bloqueado)}
                                                                                disabled={guardando || alumno.bloqueado}
                                                                                style={{
                                                                                    flex: 1,
                                                                                    padding: '10px 0',
                                                                                    borderRadius: 6,
                                                                                    border: `1px solid ${estilo.border}`,
                                                                                    background: valorActual === 'A' ? estilo.bg : '#fff',
                                                                                    color: valorActual === 'A' ? estilo.color : '#9ca3af',
                                                                                    fontSize: 13,
                                                                                    fontWeight: 700,
                                                                                    cursor: alumno.bloqueado ? 'not-allowed' : 'pointer',
                                                                                    opacity: alumno.bloqueado ? 0.5 : 1,
                                                                                    transition: 'all 0.2s'
                                                                                }}
                                                                            >
                                                                                {TIPOS_EVIDENCIA_LABEL[tipo]}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>

                                                                {/* Estado Sugerido del Alumno */}
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                                                    <span style={{ color: '#6b7280' }}>Alcanzadas: <strong style={{ color: '#1e3a8a' }}>{alcanzadas}/{total}</strong></span>
                                                                    <span style={{
                                                                        padding: '4px 8px',
                                                                        borderRadius: 4,
                                                                        background: estadoSugerido.color + '15',
                                                                        color: estadoSugerido.color,
                                                                        fontWeight: 600,
                                                                        border: `1px solid ${estadoSugerido.color}30`
                                                                    }}>
                                                                        {estadoSugerido.texto}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                // ==========================================
                                // VISTA DESKTOP: Tu tabla horizontal original
                                // ==========================================
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
                            )
                        )}

                        {/* 6. TARJETAS DE RESUMEN (Footer) */}
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
                    <div>
                        {/* Encabezado */}
                        <div style={{ marginBottom: 24 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>Proyecto Áulico</h3>
                            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                                Gestioná el proyecto del ciclo actual y consultá el historial de años anteriores.
                            </p>
                        </div>

                        {/* Proyecto vigente (año actual) */}
                        {(() => {
                            const anioActual = new Date().getFullYear();
                            const vigente = proyectosHistorial.find(p => p.anio_lectivo === anioActual);

                            if (vigente) {
                                return (
                                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 20, marginBottom: 24 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                            <div>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', marginBottom: 4 }}>✅ Proyecto Vigente {anioActual}</div>
                                                <h4 style={{ fontSize: 16, fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>{vigente.titulo}</h4>
                                                {vigente.descripcion && <p style={{ fontSize: 13, color: '#4b5563', margin: '0 0 4px 0' }}>{vigente.descripcion}</p>}
                                                <div style={{ fontSize: 11, color: '#6b7280' }}>
                                                    Creado: {new Date(vigente.creado_en).toLocaleDateString('es-AR')}
                                                    {vigente.capacidades_evaluables > 0 && ` · ${vigente.capacidades_evaluables} capacidades evaluables`}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                {vigente.archivo_url && (
                                                    <a href={vigente.archivo_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '8px 12px', borderRadius: 4, fontSize: 12, textDecoration: 'none', fontWeight: 500 }}>
                                                        📄 Ver en Drive
                                                    </a>
                                                )}
                                                <button onClick={() => router.push(`/docente/cursos/${cursoId}/proyecto`)} style={{ background: '#15803d', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                                                    Editar capacidades →
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: 20, marginBottom: 24, textAlign: 'center' }}>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>⚠️ No hay proyecto áulico cargado para {anioActual}</div>
                                    <div style={{ fontSize: 13, color: '#78350f', marginBottom: 16 }}>
                                        Debés cargar el proyecto y definir qué capacidades vas a evaluar este ciclo.
                                    </div>
                                    <button onClick={() => router.push(`/docente/cursos/${cursoId}/proyecto`)} style={{ background: '#d97706', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>
                                        Cargar Proyecto Áulico →
                                    </button>
                                </div>
                            );
                        })()}

                        {/* Historial de proyectos anteriores */}
                        {(() => {
                            const anioActual = new Date().getFullYear();
                            const anteriores = proyectosHistorial
                                .filter(p => p.anio_lectivo < anioActual)
                                .sort((a, b) => b.anio_lectivo - a.anio_lectivo);

                            if (anteriores.length === 0) {
                                return (
                                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, textAlign: 'center', color: '#6b7280' }}>
                                        <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>📚</div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>Sin historial de proyectos</div>
                                        <div style={{ fontSize: 12 }}>Los proyectos que cargues en ciclos anteriores aparecerán acá.</div>
                                    </div>
                                );
                            }

                            return (
                                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                                    <div style={{ padding: '14px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', margin: 0 }}>📋 Historial de Proyectos Áulicos</h4>
                                        <span style={{ fontSize: 12, color: '#6b7280' }}>{anteriores.length} {anteriores.length === 1 ? 'proyecto' : 'proyectos'} anterior(es)</span>
                                    </div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                        <thead>
                                            <tr style={{ background: '#fafafa', borderBottom: '1px solid #e5e7eb' }}>
                                                <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Ciclo</th>
                                                <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Título</th>
                                                <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Creado</th>
                                                <th style={{ padding: '10px 20px', textAlign: 'center', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Capacidades</th>
                                                <th style={{ padding: '10px 20px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {anteriores.map((p, idx) => (
                                                <tr key={p.id} style={{ borderBottom: idx < anteriores.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                                    <td style={{ padding: '12px 20px', fontWeight: 700, color: '#1e3a8a' }}>{p.anio_lectivo}</td>
                                                    <td style={{ padding: '12px 20px', color: '#1e3a8a', fontWeight: 500 }}>{p.titulo}</td>
                                                    <td style={{ padding: '12px 20px', color: '#6b7280', fontSize: 12 }}>{new Date(p.creado_en).toLocaleDateString('es-AR')}</td>
                                                    <td style={{ padding: '12px 20px', textAlign: 'center', color: '#6b7280', fontSize: 12 }}>{p.capacidades_evaluables || '—'}</td>
                                                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                                                        {p.archivo_url ? (
                                                            <a href={p.archivo_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1e40af', fontSize: 12, textDecoration: 'none', fontWeight: 500 }}>
                                                                📄 Ver en Drive
                                                            </a>
                                                        ) : (
                                                            <span style={{ fontSize: 11, color: '#9ca3af' }}>Sin archivo</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}
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
                    <div className="acta-container" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 40, maxWidth: 900, margin: '0 auto' }}>
                        {/* Encabezado del Acta */}
                        <div style={{ textAlign: 'center', marginBottom: 30, borderBottom: '2px solid #1e3a8a', paddingBottom: 20 }}>
                            <h3 style={{ fontSize: 14, color: '#6b7280', margin: '0 0 10px 0', textTransform: 'uppercase' }}>Escuela Técnica Fray Luis Beltrán</h3>
                            <h2 style={{ fontSize: 22, color: '#1e3a8a', margin: '0 0 10px 0', fontWeight: 700 }}>ACTA DE CALIFICACIONES FINALES</h2>
                            <p style={{ fontSize: 14, color: '#4b5563', margin: 0 }}>{curso?.resolucion || 'Resolución N° 5036/16'}</p>
                        </div>

                        {/* Datos del Perfil */}
                        <div style={{ marginBottom: 30, fontSize: 14, lineHeight: 1.8 }}>
                            <p style={{ margin: '0 0 10px 0' }}><strong>SECTOR:</strong> {curso?.sector || 'NO ESPECIFICADO'}</p>
                            <p style={{ margin: '0 0 10px 0' }}><strong>PERFIL PROFESIONAL:</strong> {curso?.nombre?.replace(/\s*[-–—]\s*\d{4}\s*$/, '').trim()}</p>
                            <p style={{ margin: '0 0 10px 0' }}><strong>NIVEL DE CUALIFICACIÓN:</strong> {curso?.nivel_certificacion || 'II'}</p>
                            <p style={{ margin: '0 0 20px 0' }}><strong>Duración Total en Horas:</strong> {curso?.carga_horaria || 500}</p>

                            {(() => {
                                const fechaUsar = fechaCierre ? new Date(fechaCierre + 'T12:00:00') : new Date();
                                return (
                                    <p style={{ margin: '20px 0' }}>
                                        A los <strong>{numeroALetras(fechaUsar.getDate())}</strong> días del mes de <strong>{mesALetras(fechaUsar.getMonth())}</strong> de dos mil <strong>{numeroALetras(fechaUsar.getFullYear() - 2000)}</strong>,
                                        reunido el equipo Docente correspondiente al Perfil Profesional mencionado, proceden a registrar las Calificaciones Finales.
                                    </p>
                                );
                            })()}
                        </div>

                        {/* Tabla de Alumnos */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 30, fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #1e3a8a' }}>
                                    <th style={{ padding: 10, textAlign: 'left', border: '1px solid #e5e7eb', width: '5%' }}>Nº</th>
                                    <th style={{ padding: 10, textAlign: 'left', border: '1px solid #e5e7eb', width: '15%' }}>D.N.I.</th>
                                    <th style={{ padding: 10, textAlign: 'left', border: '1px solid #e5e7eb', width: '40%' }}>APELLIDO Y NOMBRE</th>
                                    <th style={{ padding: 10, textAlign: 'center', border: '1px solid #e5e7eb', width: '25%' }}>CALIFICACIÓN DEFINITIVA</th>
                                    <th style={{ padding: 10, textAlign: 'center', border: '1px solid #e5e7eb', width: '15%' }}>CHECKLIST</th>
                                    <th style={{ padding: 10, textAlign: 'center', border: '1px solid #e5e7eb', width: '15%' }} className="col-checklist">CHECKLIST</th>
                                </tr>
                            </thead>
                            <tbody>
                                {alumnos.map((alumno, index) => {
                                    const datoActa = calificacionesActa[alumno.inscripcionId] || {};
                                    const colorTexto = datoActa.condicion === 'Aprobado' ? '#15803d' : datoActa.condicion === 'Ausente' ? '#6b7280' : '#b91c1c';

                                    return (
                                        <tr key={alumno.inscripcionId}>
                                            {/* Columna 1: Nº */}
                                            <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>
                                                {index + 1}
                                            </td>

                                            {/* Columna 2: D.N.I. */}
                                            <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>
                                                {alumno.dni || '—'}
                                            </td>

                                            {/* Columna 3: APELLIDO Y NOMBRE */}
                                            <td style={{ padding: 8, border: '1px solid #e5e7eb', fontWeight: 600 }}>
                                                {alumno.apellido ? `${alumno.apellido.toUpperCase()}, ${alumno.nombre.toUpperCase()}` : alumno.nombre.toUpperCase()}
                                            </td>

                                            {/* Columna 4: CALIFICACIÓN DEFINITIVA (lista desplegable) */}
                                            <td style={{ padding: 8, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                                <select
                                                    value={datoActa.condicion || 'Desaprobado'}
                                                    onChange={(e) => handleCalificacionChange(alumno.inscripcionId, e.target.value)}
                                                    disabled={actaFirmada}
                                                    style={{
                                                        width: '100%', padding: '6px', borderRadius: 4,
                                                        border: actaFirmada ? 'none' : '1px solid #d1d5db',
                                                        fontWeight: 700, color: colorTexto,
                                                        backgroundColor: actaFirmada ? 'transparent' : '#fff',
                                                        cursor: actaFirmada ? 'default' : 'pointer'
                                                    }}
                                                >
                                                    <option value="Aprobado">Aprobado</option>
                                                    <option value="Desaprobado">Desaprobado</option>
                                                    <option value="Ausente">Ausente</option>
                                                </select>
                                            </td>

                                            {/* ✅ Columna 5: CHECKLIST (la que agregamos) */}
                                            <td style={{ padding: 8, border: '1px solid #e5e7eb', textAlign: 'center' }} className="col-checklist">
                                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: actaFirmada ? 'default' : 'pointer', opacity: actaFirmada ? 0.7 : 1 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={datoActa.confirmado || false}
                                                        onChange={(e) => handleConfirmChange(alumno.inscripcionId, e.target.checked)}
                                                        disabled={actaFirmada}
                                                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                                                    />
                                                    <span style={{ fontSize: 11 }}>Revisado</span>
                                                </label>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Pie del Acta (Conteo en números y letras) */}
                        {(() => {
                            const totalAlumnos = alumnos.length;
                            const conteo = { Aprobado: 0, Desaprobado: 0, Ausente: 0 };
                            Object.values(calificacionesActa).forEach(c => {
                                conteo[c.condicion] = (conteo[c.condicion] || 0) + 1;
                            });

                            return (
                                <div style={{ fontSize: 14, lineHeight: 1.8, borderTop: '1px solid #e5e7eb', paddingTop: 20 }}>
                                    <p>Se hace constar que examinados <strong>{totalAlumnos} ({numeroALetras(totalAlumnos)})</strong> alumnos, resultaron:</p>
                                    <p style={{ marginLeft: 20 }}><strong>{conteo.Aprobado} ({numeroALetras(conteo.Aprobado)}) APROBADOS</strong>,</p>
                                    <p style={{ marginLeft: 20 }}><strong>{conteo.Desaprobado} ({numeroALetras(conteo.Desaprobado)}) DESAPROBADOS</strong> y,</p>
                                    <p style={{ marginLeft: 20 }}><strong>{conteo.Ausente} ({numeroALetras(conteo.Ausente)}) AUSENTES</strong>.</p>
                                    <p style={{ marginTop: 20 }}>Total de Alumnos: <strong>{totalAlumnos} ({numeroALetras(totalAlumnos)})</strong>.</p>
                                </div>
                            );
                        })()}

                        {/* Firmas */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 60, paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
                            <div style={{ textAlign: 'center', width: '30%' }}>
                                <div style={{ borderBottom: '1px solid #000', marginBottom: 5, height: 40 }}></div>
                                <p style={{ fontSize: 11, margin: 0 }}>Firma Equipo Docente</p>
                            </div>
                            <div style={{ textAlign: 'center', width: '30%' }}>
                                <div style={{ borderBottom: '1px solid #000', marginBottom: 5, height: 40 }}></div>
                                <p style={{ fontSize: 11, margin: 0 }}>Firma Preceptor/a</p>
                            </div>
                            <div style={{ textAlign: 'center', width: '30%' }}>
                                <div style={{ borderBottom: '1px solid #000', marginBottom: 5, height: 40 }}></div>
                                <p style={{ fontSize: 11, margin: 0 }}>Firma J.T.E.P.</p>
                            </div>
                        </div>

                        {/* Botones de Acción (No se imprimen) */}
                        <div className="no-print" style={{ marginTop: 40, display: 'flex', gap: 12, justifyContent: 'center' }}>
                            {!actaFirmada ? (
                                <button
                                    onClick={firmarYGuardarActa}
                                    disabled={guardandoActa}
                                    style={{
                                        background: '#15803d', color: '#fff', border: 'none', padding: '12px 24px',
                                        borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14,
                                        opacity: guardandoActa ? 0.7 : 1
                                    }}
                                >
                                    {guardandoActa ? 'Guardando...' : '🔒 Firmar y Cerrar Acta'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => window.print()}
                                    style={{
                                        background: '#1e3a8a', color: '#fff', border: 'none', padding: '12px 24px',
                                        borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14
                                    }}
                                >
                                    🖨️ Imprimir Acta Final
                                </button>
                            )}
                        </div>

                        {/* Estilos específicos para impresión */}
                        <style>{`
            @media print {
                body * { visibility: hidden; }
                .acta-container, .acta-container * { visibility: visible; }
                .acta-container { 
                    position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; border: none; 
                }
                .no-print { display: none !important; }
                /* Hace que el select parezca texto plano al imprimir */
                select { 
                    appearance: none; border: none; background: transparent; 
                    font-weight: bold; color: black; padding: 0; 
                }
                /* Estiliza el checkbox para que se vea marcado si lo está */
                input[type="checkbox"] { 
                    appearance: none; width: 12px; height: 12px; border: 1px solid black; 
                    display: inline-block; position: relative;
                }
                input[type="checkbox"]:checked { background-color: black; }
            }
        `}</style>
                        <style>{`
    @media print {
        body * { visibility: hidden; }
        .acta-container, .acta-container * { visibility: visible; }
        .acta-container { 
            position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; border: none; 
        }
        .no-print { display: none !important; }
        
        /* ✅ OCULTAR COLUMNA CHECKLIST AL IMPRIMIR */
        .col-checklist { display: none !important; }
        
        /* Ajustar el ancho de la tabla al quitar una columna */
        .acta-container table { table-layout: fixed; }
        .acta-container th:nth-child(5),
        .acta-container td:nth-child(5) { display: none !important; }
        
        /* Hace que el select parezca texto plano al imprimir */
        select { 
            appearance: none; border: none; background: transparent; 
            font-weight: bold; color: black; padding: 0; 
        }
        input[type="checkbox"] { display: none !important; }
    }
`}</style>
                    </div>
                )}
            </div>
        </Sidebar>
    );
}