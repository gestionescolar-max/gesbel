'use client';
import { useState, useEffect, useRef } from 'react';
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
    imprimir: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>,
    anular: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
};

function numeroALetras(num) {
    const unidades = ['Cero', 'Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho', 'Nueve', 'Diez', 'Once', 'Doce', 'Trece', 'Catorce', 'Quince', 'Dieciséis', 'Diecisiete', 'Dieciocho', 'Diecinueve', 'Veinte'];
    if (num >= 0 && num <= 20) return unidades[num];
    return num.toString();
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export default function DetalleCursoPage() {
    const params = useParams();
    const router = useRouter();
    const { docente, cargando } = useDocente();
    const [curso, setCurso] = useState(null);
    const [perfil, setPerfil] = useState(null);
    const [alumnos, setAlumnos] = useState([]);
    const [modulos, setModulos] = useState([]);
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [busqueda, setBusqueda] = useState('');
    const [mensaje, setMensaje] = useState(null);
    const [cargandoDatos, setCargandoDatos] = useState(true);
    const [actaExistente, setActaExistente] = useState(null);

    const [modalActaAbierto, setModalActaAbierto] = useState(false);
    const [numeroManual, setNumeroManual] = useState(false);
    const [numeroActa, setNumeroActa] = useState('');
    const [fechaActa, setFechaActa] = useState(new Date().toISOString().split('T')[0]);
    const [equipoDocente, setEquipoDocente] = useState('');
    const [alumnosSeleccionados, setAlumnosSeleccionados] = useState({});
    const [cargandoActa, setCargandoActa] = useState(false);
    const [actaCreada, setActaCreada] = useState(null);
    const [mostrarImpresion, setMostrarImpresion] = useState(false);
    const fichaRef = useRef(null);

    // Nuevos estados para modales de alumno
    const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
    const [modalFichaAbierto, setModalFichaAbierto] = useState(false);
    const [modalDocumentacionAbierto, setModalDocumentacionAbierto] = useState(false);

    const [modalAnularAbierto, setModalAnularAbierto] = useState(false);
    const [motivoAnulacion, setMotivoAnulacion] = useState('');
    const [cargandoAnulacion, setCargandoAnulacion] = useState(false);

    const cursoId = params.id;

    useEffect(() => {
        if (!docente || !cursoId) return;
        cargarDatos();
    }, [docente, cursoId]);

    async function cargarDatos() {
        setCargandoDatos(true);
        try {
            const { data: cursoData, error: errorCurso } = await supabase.from('fp_cursos').select('*').eq('id', cursoId).single();
            if (errorCurso) throw errorCurso;
            setCurso(cursoData);

            if (cursoData.fp_perfil_id) {
                const { data: perfilData } = await supabase.from('fp_perfiles').select('*').eq('id', cursoData.fp_perfil_id).single();
                setPerfil(perfilData);
            }

            const { data: modulosData } = await supabase.from('fp_modulos').select('*').eq('fp_perfil_id', cursoData.fp_perfil_id).order('numero');
            setModulos(modulosData || []);

            const { data: inscripciones } = await supabase.from('fp_inscripciones').select('*').eq('fp_curso_id', cursoId).order('apellido');

            const alumnosConDatos = await Promise.all(
                (inscripciones || []).map(async (insc) => {
                    const { data: asistencias } = await supabase.from('fp_asistencia').select('estado').eq('fp_inscripcion_id', insc.id);
                    const total = asistencias?.length || 0;
                    const presentes = asistencias?.filter(a => a.estado === 'presente').length || 0;
                    const porcentajeAsistencia = total > 0 ? Math.round((presentes / total) * 100) : 0;

                    const { data: modulosAlumno } = await supabase.from('fp_alumno_modulos').select('fp_modulo_id, estado').eq('fp_inscripcion_id', insc.id);
                    const modulosAprobados = modulosAlumno?.filter(m => m.estado === 'aprobado').length || 0;

                    const { data: detalleActa } = await supabase.from('fp_actas_detalle').select('condicion, observacion').eq('fp_inscripcion_id', insc.id).maybeSingle();

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

            const seleccionInicial = {};
            alumnosConDatos.forEach(a => {
                seleccionInicial[a.id] = { seleccionado: true, condicion: 'aprobado', observacion: '' };
            });
            setAlumnosSeleccionados(seleccionInicial);

            const { data: acta } = await supabase.from('fp_actas').select('*').eq('fp_curso_id', cursoId).order('creado_en', { ascending: false }).limit(1).maybeSingle();
            setActaExistente(acta);

            const { count } = await supabase.from('fp_actas').select('*', { count: 'exact', head: true }).eq('fp_curso_id', cursoId);
            const siguienteNumero = (count || 0) + 1;
            const anioCurso = cursoData.anio || new Date().getFullYear();
            setNumeroActa(`FP-${anioCurso}-${String(siguienteNumero).padStart(3, '0')}`);

            if (cursoData.profesor_id) {
                const { data: profesor } = await supabase.from('profesores').select('nombre').eq('id', cursoData.profesor_id).single();
                if (profesor) setEquipoDocente(`Prof. ${profesor.nombre}`);
            }
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
        try { return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return '—'; }
    }

    function formatearFechaLarga(fecha) {
        if (!fecha) return '';
        const d = new Date(fecha);
        return `${d.getDate()} días del mes de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
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
    const esProfesorDelCurso = curso.profesor_id === docente.id;
    // Solo puede CARGAR acta si es el profesor titular de ESTE curso, o es admin/directivo
    const puedeCargarActa = (esProfesorDelCurso || docente.esAdmin || docente.esDirectivo) && (!actaExistente || actaExistente.anulada);

    // Puede VER/IMPRIMIR acta si existe una acta (todos menos alumnos)
    const puedeVerActa = actaExistente && !actaExistente.anulada;
    const actaAnulada = actaExistente?.anulada;

    function toggleSeleccionAlumno(id) {
        setAlumnosSeleccionados(prev => ({ ...prev, [id]: { ...prev[id], seleccionado: !prev[id]?.seleccionado } }));
    }
    function actualizarCondicionAlumno(id, condicion) {
        setAlumnosSeleccionados(prev => ({ ...prev, [id]: { ...prev[id], condicion } }));
    }
    function actualizarObservacionAlumno(id, observacion) {
        setAlumnosSeleccionados(prev => ({ ...prev, [id]: { ...prev[id], observacion } }));
    }
    function seleccionarTodos() {
        const todos = {};
        alumnos.forEach(a => { todos[a.id] = { ...alumnosSeleccionados[a.id], seleccionado: true }; });
        setAlumnosSeleccionados(todos);
    }
    function deseleccionarTodos() {
        const ninguno = {};
        alumnos.forEach(a => { ninguno[a.id] = { ...alumnosSeleccionados[a.id], seleccionado: false }; });
        setAlumnosSeleccionados(ninguno);
    }

    async function confirmarActa() {
        const alumnosActa = alumnos.filter(a => alumnosSeleccionados[a.id]?.seleccionado);
        if (alumnosActa.length === 0) { setMensaje({ tipo: 'error', texto: 'Debes seleccionar al menos un alumno' }); return; }
        if (!numeroActa.trim()) { setMensaje({ tipo: 'error', texto: 'El número de acta es obligatorio' }); return; }
        if (!fechaActa) { setMensaje({ tipo: 'error', texto: 'La fecha del acta es obligatoria' }); return; }

        setCargandoActa(true);
        try {
            const { data: actaData, error: errorActa } = await supabase.from('fp_actas').insert({
                fp_curso_id: cursoId, numero: numeroActa, fecha: fechaActa, estado: 'firmada', cargada_por: docente.userId, observaciones: `Equipo docente: ${equipoDocente}`
            }).select().single();
            if (errorActa) throw errorActa;

            const detalles = alumnosActa.map(a => ({
                fp_acta_id: actaData.id, fp_inscripcion_id: a.id, condicion: alumnosSeleccionados[a.id].condicion, observacion: alumnosSeleccionados[a.id].observacion || null, estado_original: a.estado
            }));
            const { error: errorDetalles } = await supabase.from('fp_actas_detalle').insert(detalles);
            if (errorDetalles) throw errorDetalles;

            const aprobados = alumnosActa.filter(a => alumnosSeleccionados[a.id].condicion === 'aprobado');
            if (aprobados.length > 0) {
                await supabase.from('fp_inscripciones').update({ estado: 'egresado' }).in('id', aprobados.map(a => a.id));
            }
            await supabase.from('fp_cursos').update({ estado: 'finalizado', fecha_finalizacion: fechaActa }).eq('id', cursoId);

            setActaCreada({ ...actaData, alumnos: alumnosActa });
            setModalActaAbierto(false);
            setMostrarImpresion(true);
            await cargarDatos();
        } catch (err) {
            console.error('Error al cargar acta:', err);
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        } finally {
            setCargandoActa(false);
        }
    }

    async function anularActa() {
        if (!motivoAnulacion.trim()) { setMensaje({ tipo: 'error', texto: 'Debes indicar el motivo de anulación' }); return; }
        if (!confirm(`¿Confirmar anulación del acta ${actaExistente.numero}?\n\nEsta acción revertirá el estado de los alumnos y reabrirá el curso.`)) return;

        setCargandoAnulacion(true);
        try {
            await supabase.from('fp_actas').update({ anulada: true, motivo_anulacion: motivoAnulacion, anulada_por: docente.userId, fecha_anulacion: new Date().toISOString().split('T')[0] }).eq('id', actaExistente.id);
            const { data: detalles } = await supabase.from('fp_actas_detalle').select('fp_inscripcion_id, estado_original').eq('fp_acta_id', actaExistente.id);
            if (detalles && detalles.length > 0) {
                for (const detalle of detalles) {
                    if (detalle.estado_original) await supabase.from('fp_inscripciones').update({ estado: detalle.estado_original }).eq('id', detalle.fp_inscripcion_id);
                }
            }
            await supabase.from('fp_cursos').update({ estado: 'en_cursada', fecha_finalizacion: null }).eq('id', cursoId);
            setMensaje({ tipo: 'ok', texto: `Acta ${actaExistente.numero} anulada correctamente. El curso fue reabierto.` });
            setModalAnularAbierto(false);
            setMotivoAnulacion('');
            await cargarDatos();
        } catch (err) {
            console.error('Error al anular acta:', err);
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        } finally {
            setCargandoAnulacion(false);
        }
    }

    function handleImprimir() {
        const contenido = fichaRef.current;
        if (!contenido) return;
        const ventana = window.open('', '_blank');
        ventana.document.write(`<html><head><title>Acta de Finalización - ${actaExistente?.numero || actaCreada?.numero}</title><style>body { font-family: Arial, sans-serif; padding: 40px; color: #000; font-size: 12px; } .header { text-align: center; margin-bottom: 20px; } .header h1 { font-size: 16px; margin: 0 0 4px 0; } .header h2 { font-size: 14px; margin: 0 0 4px 0; font-weight: normal; } table { width: 100%; border-collapse: collapse; margin: 20px 0; } th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; } th { background: #f0f0f0; font-weight: bold; } .firmas { display: flex; justify-content: space-between; margin-top: 60px; } .firma-box { width: 200px; text-align: center; } .firma-linea { border-top: 1px solid #000; padding-top: 4px; margin-top: 40px; } @media print { body { padding: 20px; } }</style></head><body>${contenido.innerHTML}</body></html>`);
        ventana.document.close();
        setTimeout(() => { ventana.print(); ventana.close(); }, 500);
    }

    if (cargando || !docente) return null;

    const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' };
    const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, background: '#fff', outline: 'none', color: '#1e3a8a' };

    const alumnosActa = actaCreada?.alumnos || alumnos.filter(a => alumnosSeleccionados[a.id]?.seleccionado);
    const totalSeleccionados = alumnosActa.length;
    const aprobados = alumnosActa.filter(a => { const cond = actaCreada ? a.condicion_acta : alumnosSeleccionados[a.id]?.condicion; return cond === 'aprobado'; }).length;
    const desaprobados = alumnosActa.filter(a => { const cond = actaCreada ? a.condicion_acta : alumnosSeleccionados[a.id]?.condicion; return cond === 'desaprobado'; }).length;
    const ausentes = alumnosActa.filter(a => { const cond = actaCreada ? a.condicion_acta : alumnosSeleccionados[a.id]?.condicion; return cond === 'ausente'; }).length;
    const libres = alumnosActa.filter(a => { const cond = actaCreada ? a.condicion_acta : alumnosSeleccionados[a.id]?.condicion; return cond === 'libre'; }).length;

    return (
        <Sidebar docente={docente} titulo="Detalle del Curso">
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                {mensaje && (
                    <div style={{ background: mensaje.tipo === 'ok' ? '#f0fdf4' : mensaje.tipo === 'error' ? '#fef2f2' : '#eff6ff', border: `1px solid ${mensaje.tipo === 'ok' ? '#bbf7d0' : mensaje.tipo === 'error' ? '#fecaca' : '#bfdbfe'}`, color: mensaje.tipo === 'ok' ? '#15803d' : mensaje.tipo === 'error' ? '#b91c1c' : '#1e40af', padding: 14, borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
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
                                    <button onClick={() => router.push('/docente/cursos')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', marginBottom: 12, padding: 0 }}>
                                        {Iconos.volver} Volver a Mis Cursos
                                    </button>
                                    <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>{curso.nombre.replace(/\s*[-–—]\s*\d{4}\s*$/, '').trim()}</h2>
                                    <div style={{ fontSize: 14, color: '#6b7280' }}>{curso.turno} · {curso.anio} · Cohorte {curso.cohorte}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
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

                                    {/* Botón VER ACTA - Visible para todos si existe un acta cargada */}
                                    {puedeVerActa && (
                                        <button
                                            onClick={() => setMostrarImpresion(true)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                background: '#fff',
                                                color: '#1e3a8a',
                                                border: '1px solid #1e3a8a',
                                                padding: '8px 16px',
                                                borderRadius: 4,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {Iconos.imprimir} Ver Acta
                                        </button>
                                    )}

                                    {/* Botón ANULAR ACTA - Solo admin/directivo o profesor titular */}
                                    {actaExistente && !actaAnulada && (esProfesorDelCurso || docente.esAdmin || docente.esDirectivo) && (
                                        <button
                                            onClick={() => setModalAnularAbierto(true)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                background: '#fff',
                                                color: '#b91c1c',
                                                border: '1px solid #b91c1c',
                                                padding: '8px 16px',
                                                borderRadius: 4,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {Iconos.anular} Anular Acta
                                        </button>
                                    )}

                                    {/* Botón CARGAR ACTA - Solo profesor titular o admin/directivo */}
                                    {puedeCargarActa && (
                                        <button
                                            onClick={() => setModalActaAbierto(true)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                background: '#1e3a8a',
                                                color: '#fff',
                                                border: 'none',
                                                padding: '8px 16px',
                                                borderRadius: 4,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {Iconos.acta} {actaAnulada ? 'Nueva Acta' : 'Cargar Acta'}
                                        </button>
                                    )}
                                </div>
                            </div>
                            {actaAnulada && (<div style={{ marginTop: 16, padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 13, color: '#b91c1c' }}><strong>⚠️ Acta anterior anulada:</strong> {actaExistente.numero} — Motivo: {actaExistente.motivo_anulacion}</div>)}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginTop: 20, paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
                                <div><div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Período</div><div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#1e3a8a', fontWeight: 500 }}>{Iconos.calendario} {formatearFecha(curso.fecha_inicio)} → {formatearFecha(curso.fecha_fin)}</div></div>
                                <div><div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Alumnos</div><div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#1e3a8a', fontWeight: 500 }}>{Iconos.usuarios} <strong>{alumnos.length}</strong> inscriptos</div></div>
                                <div><div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Módulos</div><div style={{ fontSize: 14, color: '#1e3a8a', fontWeight: 500 }}>{modulos.length} módulos</div></div>
                                <div><div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Asistencia mínima</div><div style={{ fontSize: 14, color: '#1e3a8a', fontWeight: 500 }}>{curso.asistencia_minima || 75}%</div></div>
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
                                <input type="text" placeholder="Buscar por nombre, apellido o DNI..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={inputStyle} />
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
                                                    <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'monospace', color: '#6b7280', fontWeight: 600 }}>{a.legajo || '—'}</td>
                                                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e3a8a' }}>{a.apellido ? `${a.apellido}, ${a.nombre}` : a.nombre}</td>
                                                    <td style={{ padding: '12px 16px', color: '#4b5563' }}>{a.dni || '—'}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                            <span style={{ fontWeight: 700, fontSize: 13, color: asistenciaBaja ? '#b91c1c' : '#15803d' }}>{a.asistencia.porcentaje}%</span>
                                                            {asistenciaBaja && <span title="Asistencia por debajo del mínimo" style={{ color: '#b91c1c' }}>{Iconos.alerta}</span>}
                                                        </div>
                                                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{a.asistencia.presentes}/{a.asistencia.total} clases</div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1e3a8a' }}>{a.modulos.aprobados}/{a.modulos.total}</div>
                                                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>aprobados</div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', background: a.estado === 'inscripto' || a.estado === 'en_curso' ? '#dcfce7' : a.estado === 'egresado' ? '#dbeafe' : '#fef3c7', color: a.estado === 'inscripto' || a.estado === 'en_curso' ? '#15803d' : a.estado === 'egresado' ? '#1e40af' : '#92400e', border: `1px solid ${a.estado === 'inscripto' || a.estado === 'en_curso' ? '#bbf7d0' : a.estado === 'egresado' ? '#bfdbfe' : '#fde68a'}` }}>{a.estado}</span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        {a.condicion_acta ? (<span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: a.condicion_acta === 'aprobado' ? '#dcfce7' : '#fef3c7', color: a.condicion_acta === 'aprobado' ? '#15803d' : '#92400e' }}>{a.condicion_acta}</span>) : (<span style={{ fontSize: 12, color: '#9ca3af' }}>Sin acta</span>)}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                            {a.url_carpeta_drive && (
                                                                <a href={a.url_carpeta_drive} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1e3a8a', fontSize: 12, textDecoration: 'none', padding: '4px 8px', background: '#eff6ff', borderRadius: 4 }} title="Ver carpeta de Drive">{Iconos.externo}</a>
                                                            )}
                                                            <div style={{ position: 'relative' }}>
                                                                <button onClick={() => setAlumnoSeleccionado(alumnoSeleccionado?.id === a.id ? null : a)} style={{ background: '#f3f4f6', color: '#1e3a8a', border: '1px solid #d1d5db', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>Acciones ▾</button>
                                                                {alumnoSeleccionado?.id === a.id && (
                                                                    <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, minWidth: 200 }}>
                                                                        <button onClick={() => { setModalFichaAbierto(true); setAlumnoSeleccionado(null); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#1e3a8a', borderBottom: '1px solid #f3f4f6' }}>👤 Ver ficha completa</button>
                                                                        <button onClick={() => { setModalDocumentacionAbierto(true); setAlumnoSeleccionado(null); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#1e3a8a' }}>📄 Ver documentación</button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {alumnosFiltrados.length === 0 && (<div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>No se encontraron alumnos con los filtros seleccionados.</div>)}
                        </div>

                        {/* MODAL DE CARGA DE ACTA */}
                        {modalActaAbierto && (
                            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => !cargandoActa && setModalActaAbierto(false)}>
                                <div style={{ background: '#fff', borderRadius: 8, padding: 32, maxWidth: 1000, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
                                    <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #1e3a8a' }}>
                                        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Cargar Acta de Finalización</h3>
                                        <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>{curso.nombre} · {curso.turno} {curso.anio}</p>
                                    </div>
                                    <div style={{ marginBottom: 24 }}>
                                        <h4 style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase' }}>Datos del Acta</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                                            <div>
                                                <label style={labelStyle}>Número de Acta</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4b5563', cursor: 'pointer' }}><input type="checkbox" checked={numeroManual} onChange={(e) => setNumeroManual(e.target.checked)} style={{ width: 14, height: 14 }} /> Ingresar manualmente</label>
                                                </div>
                                                <input type="text" value={numeroActa} onChange={(e) => setNumeroActa(e.target.value)} style={inputStyle} placeholder="FP-2026-001" />
                                            </div>
                                            <div>
                                                <label style={labelStyle}>Fecha</label>
                                                <input type="date" value={fechaActa} onChange={(e) => setFechaActa(e.target.value)} style={inputStyle} />
                                            </div>
                                        </div>
                                        <div style={{ marginTop: 16 }}>
                                            <label style={labelStyle}>Equipo Docente</label>
                                            <textarea value={equipoDocente} onChange={(e) => setEquipoDocente(e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} placeholder="Prof. Nombre Apellido, Prof. Nombre Apellido..." />
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: 24 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <h4 style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a', textTransform: 'uppercase', margin: 0 }}>Alumnos ({alumnos.filter(a => alumnosSeleccionados[a.id]?.seleccionado).length} seleccionados)</h4>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button onClick={seleccionarTodos} style={{ background: '#f3f4f6', border: '1px solid #d1d5db', padding: '4px 12px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>Seleccionar todos</button>
                                                <button onClick={deseleccionarTodos} style={{ background: '#f3f4f6', border: '1px solid #d1d5db', padding: '4px 12px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>Deseleccionar todos</button>
                                            </div>
                                        </div>
                                        <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                                <thead><tr style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                                                    <th style={{ padding: '8px 12px', textAlign: 'center', width: 40 }}>✓</th>
                                                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>DNI</th>
                                                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Apellido y Nombre</th>
                                                    <th style={{ padding: '8px 12px', textAlign: 'center', width: 140 }}>Condición</th>
                                                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Observación</th>
                                                </tr></thead>
                                                <tbody>
                                                    {alumnos.map(a => {
                                                        const seleccion = alumnosSeleccionados[a.id] || { seleccionado: true, condicion: 'aprobado', observacion: '' };
                                                        return (
                                                            <tr key={a.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}><input type="checkbox" checked={seleccion.seleccionado} onChange={() => toggleSeleccionAlumno(a.id)} style={{ width: 16, height: 16, cursor: 'pointer' }} /></td>
                                                                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>{a.dni || '—'}</td>
                                                                <td style={{ padding: '8px 12px', fontWeight: 500 }}>{a.apellido ? `${a.apellido}, ${a.nombre}` : a.nombre}</td>
                                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                                    <select value={seleccion.condicion} onChange={(e) => actualizarCondicionAlumno(a.id, e.target.value)} disabled={!seleccion.seleccionado} style={{ width: '100%', padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db', fontSize: 12, background: seleccion.seleccionado ? '#fff' : '#f3f4f6' }}>
                                                                        <option value="aprobado">Aprobado</option><option value="libre">Libre</option><option value="ausente">Ausente</option><option value="desaprobado">Desaprobado</option>
                                                                    </select>
                                                                </td>
                                                                <td style={{ padding: '8px 12px' }}><input type="text" value={seleccion.observacion} onChange={(e) => actualizarObservacionAlumno(a.id, e.target.value)} disabled={!seleccion.seleccionado} placeholder="Opcional" style={{ width: '100%', padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db', fontSize: 12, background: seleccion.seleccionado ? '#fff' : '#f3f4f6' }} /></td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: 24, padding: 16, background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                                        <h4 style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase' }}>Resumen</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                                            <div><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Total</div><div style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a' }}>{totalSeleccionados}</div></div>
                                            <div><div style={{ fontSize: 11, color: '#15803d', marginBottom: 4 }}>Aprobados</div><div style={{ fontSize: 20, fontWeight: 700, color: '#15803d' }}>{aprobados}</div></div>
                                            <div><div style={{ fontSize: 11, color: '#92400e', marginBottom: 4 }}>Libres</div><div style={{ fontSize: 20, fontWeight: 700, color: '#92400e' }}>{libres}</div></div>
                                            <div><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Ausentes</div><div style={{ fontSize: 20, fontWeight: 700, color: '#6b7280' }}>{ausentes}</div></div>
                                            <div><div style={{ fontSize: 11, color: '#b91c1c', marginBottom: 4 }}>Desaprobados</div><div style={{ fontSize: 20, fontWeight: 700, color: '#b91c1c' }}>{desaprobados}</div></div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                                        <button onClick={() => setModalActaAbierto(false)} disabled={cargandoActa} style={{ background: '#fff', color: '#4b5563', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: cargandoActa ? 'not-allowed' : 'pointer' }}>Cancelar</button>
                                        <button onClick={confirmarActa} disabled={cargandoActa} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: cargandoActa ? '#9ca3af' : '#1e3a8a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: cargandoActa ? 'not-allowed' : 'pointer' }}>{cargandoActa ? 'Cargando...' : <>{Iconos.check} Confirmar y Firmar Acta</>}</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* MODAL DE ANULACIÓN */}
                        {modalAnularAbierto && (
                            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => !cargandoAnulacion && setModalAnularAbierto(false)}>
                                <div style={{ background: '#fff', borderRadius: 8, padding: 32, maxWidth: 500, width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
                                    <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #b91c1c' }}>
                                        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#b91c1c', marginBottom: 4 }}>Anular Acta</h3>
                                        <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Acta: {actaExistente?.numero}</p>
                                    </div>
                                    <div style={{ marginBottom: 24, padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 13, color: '#b91c1c' }}>
                                        <strong>⚠️ Atención:</strong> Esta acción revertirá el estado de todos los alumnos al estado anterior y reabrirá el curso. El acta quedará registrada como anulada con el motivo que indiques.
                                    </div>
                                    <div style={{ marginBottom: 24 }}>
                                        <label style={labelStyle}>Motivo de Anulación (obligatorio)</label>
                                        <textarea value={motivoAnulacion} onChange={(e) => setMotivoAnulacion(e.target.value)} style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} placeholder="Indicar el motivo por el cual se anula el acta..." />
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                                        <button onClick={() => setModalAnularAbierto(false)} disabled={cargandoAnulacion} style={{ background: '#fff', color: '#4b5563', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: cargandoAnulacion ? 'not-allowed' : 'pointer' }}>Cancelar</button>
                                        <button onClick={anularActa} disabled={cargandoAnulacion || !motivoAnulacion.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: cargandoAnulacion || !motivoAnulacion.trim() ? '#9ca3af' : '#b91c1c', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: cargandoAnulacion || !motivoAnulacion.trim() ? 'not-allowed' : 'pointer' }}>{cargandoAnulacion ? 'Anulando...' : <>{Iconos.anular} Confirmar Anulación</>}</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* MODAL DE IMPRESIÓN DEL ACTA */}
                        {mostrarImpresion && (actaExistente || actaCreada) && (
                            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setMostrarImpresion(false)}>
                                <div style={{ background: '#fff', borderRadius: 8, padding: 40, maxWidth: 900, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
                                    <div ref={fichaRef} style={{ fontFamily: 'Arial, sans-serif', color: '#000', fontSize: 12 }}>
                                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                            <h1 style={{ fontSize: 16, margin: '0 0 4px 0', fontWeight: 700 }}>Escuela Técnica Fray Luis Beltrán</h1>
                                            <h2 style={{ fontSize: 14, margin: '0 0 4px 0', fontWeight: 700 }}>ACTA DE FINALIZACIÓN</h2>
                                            <div style={{ fontSize: 12 }}>Acta N°: <strong>{actaExistente?.numero || actaCreada?.numero}</strong></div>
                                            <div style={{ fontSize: 12 }}>Resolución N°: <strong>{perfil?.resolucion || '5036/16'}</strong></div>
                                        </div>
                                        <div style={{ marginBottom: 16 }}>
                                            <div style={{ marginBottom: 8 }}><strong>SECTOR:</strong> {perfil?.sector || '—'}</div>
                                            <div style={{ marginBottom: 8 }}><strong>PERFIL PROFESIONAL:</strong> {curso?.nombre?.replace(/\s*[-–—]\s*\d{4}\s*$/, '').trim() || '—'}</div>
                                            <div style={{ marginBottom: 8 }}><strong>NIVEL DE CUALIFICACIÓN:</strong> {perfil?.nivel_certificacion ? `Nivel ${perfil.nivel_certificacion}` : '—'}</div>
                                            <div style={{ marginBottom: 8 }}><strong>Duración Total en Horas:</strong> {perfil?.carga_horaria || '—'}</div>
                                        </div>
                                        <div style={{ marginBottom: 16, lineHeight: 1.6 }}>
                                            A los <strong>{formatearFechaLarga(actaExistente?.fecha || actaCreada?.fecha || fechaActa)}</strong>, reunido el equipo Docente correspondiente al Perfil Profesional mencionado, integrado por: <strong>{equipoDocente || '—'}</strong>, proceden a registrar las Calificaciones Finales. Luego de aplicar oportunamente las Evidencias de: Conocimiento, Desempeño y Producto, vinculadas con las Capacidades expresadas en el Proyecto vinculado al Perfil Profesional, obteniéndose los resultados expresados a continuación:
                                        </div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
                                            <thead><tr>
                                                <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', width: 40 }}>Nº</th>
                                                <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', width: 100 }}>D.N.I. Nº</th>
                                                <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'left' }}>APELLIDO Y NOMBRE</th>
                                                <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', width: 140 }}>CALIFICACIÓN DEFINITIVA</th>
                                            </tr></thead>
                                            <tbody>
                                                {alumnosActa.map((a, idx) => {
                                                    const condicion = actaCreada ? a.condicion_acta : alumnosSeleccionados[a.id]?.condicion;
                                                    return (
                                                        <tr key={a.id}>
                                                            <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>{idx + 1}</td>
                                                            <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>{a.dni || '—'}</td>
                                                            <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{a.apellido ? `${a.apellido}, ${a.nombre}` : a.nombre}</td>
                                                            <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>{condicion ? condicion.charAt(0).toUpperCase() + condicion.slice(1) : '—'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        <div style={{ lineHeight: 1.8, marginBottom: 40 }}>
                                            Se hace constar que examinados <strong>{totalSeleccionados}</strong> ({numeroALetras(totalSeleccionados)}) alumnos, resultaron <strong>{aprobados}</strong> ({numeroALetras(aprobados)}) APROBADOS, <strong>{desaprobados}</strong> ({numeroALetras(desaprobados)}) DESAPROBADOS, <strong>{ausentes}</strong> ({numeroALetras(ausentes)}) AUSENTES y <strong>{libres}</strong> ({numeroALetras(libres)}) LIBRES. Total de Alumnos: <strong>{totalSeleccionados}</strong> ({numeroALetras(totalSeleccionados)}).
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 60 }}>
                                            <div style={{ width: 200, textAlign: 'center' }}><div style={{ marginBottom: 40 }}>Firma y Aclaración</div><div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>Docente</div></div>
                                            <div style={{ width: 200, textAlign: 'center' }}><div style={{ marginBottom: 40 }}>Firma y Aclaración</div><div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>Directivo</div></div>
                                            <div style={{ width: 200, textAlign: 'center' }}><div style={{ marginBottom: 40 }}>Firma y Aclaración</div><div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>Secretario</div></div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                                        <button onClick={() => setMostrarImpresion(false)} style={{ background: '#fff', color: '#4b5563', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cerrar</button>
                                        <button onClick={handleImprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1e3a8a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{Iconos.imprimir} Imprimir Acta</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* MODAL: FICHA COMPLETA DEL ALUMNO */}
                        {modalFichaAbierto && alumnoSeleccionado && (
                            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setModalFichaAbierto(false)}>
                                <div style={{ background: '#fff', borderRadius: 8, padding: 32, maxWidth: 800, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
                                    <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #1e3a8a' }}>
                                        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Ficha del Alumno</h3>
                                        <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>{alumnoSeleccionado.apellido ? `${alumnoSeleccionado.apellido}, ${alumnoSeleccionado.nombre}` : alumnoSeleccionado.nombre}</p>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                                        <div>
                                            <h4 style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase' }}>Datos Personales</h4>
                                            <div style={{ fontSize: 13, marginBottom: 8 }}><strong>DNI:</strong> {alumnoSeleccionado.dni || '—'}</div>
                                            <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Legajo:</strong> {alumnoSeleccionado.legajo || '—'}</div>
                                            <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Fecha de Nacimiento:</strong> {formatearFecha(alumnoSeleccionado.fecha_nac)}</div>
                                            <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Nacionalidad:</strong> {alumnoSeleccionado.nacionalidad || '—'}</div>
                                        </div>
                                        <div>
                                            <h4 style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase' }}>Datos de Contacto</h4>
                                            <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Teléfono:</strong> {alumnoSeleccionado.telefono || '—'}</div>
                                            <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Email:</strong> {alumnoSeleccionado.email || '—'}</div>
                                            <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Domicilio:</strong> {alumnoSeleccionado.domicilio || '—'}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                                        <div>
                                            <h4 style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase' }}>Datos Académicos</h4>
                                            <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Estudios Obtenidos:</strong> {alumnoSeleccionado.estudios_obtenidos || '—'}</div>
                                            <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Situación Laboral:</strong> {alumnoSeleccionado.situacion_laboral || '—'}</div>
                                            <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Módulos Aprobados:</strong> {alumnoSeleccionado.modulos?.aprobados || 0} / {alumnoSeleccionado.modulos?.total || 0}</div>
                                        </div>
                                        <div>
                                            <h4 style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase' }}>Asistencia</h4>
                                            <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Porcentaje:</strong> <span style={{ marginLeft: 8, fontWeight: 700, color: alumnoSeleccionado.asistencia?.porcentaje < 75 ? '#b91c1c' : '#15803d' }}>{alumnoSeleccionado.asistencia?.porcentaje || 0}%</span></div>
                                            <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Clases:</strong> {alumnoSeleccionado.asistencia?.presentes || 0} / {alumnoSeleccionado.asistencia?.total || 0}</div>
                                            <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Estado:</strong> <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: alumnoSeleccionado.asistencia?.porcentaje < 75 ? '#fef2f2' : '#f0fdf4', color: alumnoSeleccionado.asistencia?.porcentaje < 75 ? '#b91c1c' : '#15803d' }}>{alumnoSeleccionado.asistencia?.porcentaje < 75 ? 'Insuficiente' : 'Suficiente'}</span></div>
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: 24 }}>
                                        <h4 style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase' }}>Datos de Emergencia</h4>
                                        <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Nombre:</strong> {alumnoSeleccionado.emergencia_nombre || '—'}</div>
                                        <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Parentesco:</strong> {alumnoSeleccionado.emergencia_parentesco || '—'}</div>
                                        <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Teléfono:</strong> {alumnoSeleccionado.emergencia_telefono || '—'}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                                        <button onClick={() => setModalFichaAbierto(false)} style={{ background: '#fff', color: '#4b5563', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cerrar</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* MODAL: DOCUMENTACIÓN DEL ALUMNO */}
                        {modalDocumentacionAbierto && alumnoSeleccionado && (
                            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setModalDocumentacionAbierto(false)}>
                                <div style={{ background: '#fff', borderRadius: 8, padding: 32, maxWidth: 700, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
                                    <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #1e3a8a' }}>
                                        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Documentación del Alumno</h3>
                                        <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>{alumnoSeleccionado.apellido ? `${alumnoSeleccionado.apellido}, ${alumnoSeleccionado.nombre}` : alumnoSeleccionado.nombre}</p>
                                    </div>
                                    <div style={{ marginBottom: 24, padding: 16, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6 }}>
                                        <div style={{ fontSize: 14, color: '#1e40af' }}>
                                            <strong>Estado de Documentación:</strong>
                                            {(() => {
                                                const docsObligatorios = ['dni', 'foto', 'certificado_estudios', 'certificado_medico'];
                                                const completos = docsObligatorios.filter(doc => {
                                                    const fisico = alumnoSeleccionado[`doc_${doc}_fisico`] || false;
                                                    const digital = alumnoSeleccionado[`doc_${doc}_digital`] || false;
                                                    return fisico || digital;
                                                }).length;
                                                const total = docsObligatorios.length;
                                                const porcentaje = Math.round((completos / total) * 100);
                                                return (<span style={{ marginLeft: 8 }}>{completos} de {total} documentos obligatorios ({porcentaje}%){porcentaje === 100 ? ' ✅ Completa' : ' ⚠️ Incompleta'}</span>);
                                            })()}
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: 24 }}>
                                        <h4 style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase' }}>Documentos Requeridos</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {[
                                                { id: 'dni', nombre: 'DNI (Frente y Dorso)', obligatorio: true },
                                                { id: 'foto', nombre: 'Foto 4x4', obligatorio: true },
                                                { id: 'certificado_estudios', nombre: 'Certificado de Estudios', obligatorio: true },
                                                { id: 'certificado_medico', nombre: 'Certificado Médico', obligatorio: true },
                                                { id: 'pago', nombre: 'Comprobante de Pago / Cooperadora', obligatorio: false }
                                            ].map(doc => {
                                                const fisico = alumnoSeleccionado[`doc_${doc.id}_fisico`] || false;
                                                const digital = alumnoSeleccionado[`doc_${doc.id}_digital`] || false;
                                                const completo = fisico || digital;
                                                return (
                                                    <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: completo ? '#f0fdf4' : '#f9fafb', borderRadius: 6, border: `1px solid ${completo ? '#bbf7d0' : '#e5e7eb'}` }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a' }}>{doc.nombre}{doc.obligatorio && <span style={{ color: '#b91c1c', fontSize: 11, marginLeft: 4 }}>(Obligatorio)</span>}</div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 16 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><span style={{ color: fisico ? '#15803d' : '#9ca3af' }}>{Iconos.check}</span><span style={{ color: fisico ? '#15803d' : '#9ca3af' }}>Físico</span></div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><span style={{ color: digital ? '#1e40af' : '#9ca3af' }}>{Iconos.check}</span><span style={{ color: digital ? '#1e40af' : '#9ca3af' }}>Digital</span></div>
                                                        </div>
                                                        {!completo && doc.obligatorio && (<span style={{ fontSize: 11, color: '#b91c1c', fontWeight: 600 }}>Falta</span>)}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: 24 }}>
                                        <h4 style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase' }}>Pago de Cooperadora</h4>
                                        <div style={{ padding: 12, background: alumnoSeleccionado.pago_cooperadora ? '#f0fdf4' : '#fef3c7', borderRadius: 6, border: `1px solid ${alumnoSeleccionado.pago_cooperadora ? '#bbf7d0' : '#fde68a'}` }}>
                                            <div style={{ fontSize: 13, marginBottom: 4 }}><strong>Estado:</strong> <span style={{ marginLeft: 8, fontWeight: 600, color: alumnoSeleccionado.pago_cooperadora ? '#15803d' : '#92400e' }}>{alumnoSeleccionado.pago_cooperadora ? '✅ Registrado' : '⚠️ Pendiente'}</span></div>
                                            {alumnoSeleccionado.pago_cooperadora && (<><div style={{ fontSize: 13, marginBottom: 4 }}><strong>Monto:</strong> ${alumnoSeleccionado.monto_cooperadora || 0}</div><div style={{ fontSize: 13 }}><strong>Tipo:</strong> {alumnoSeleccionado.tipo_pago_cooperadora || '—'}</div></>)}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                                        <button onClick={() => setModalDocumentacionAbierto(false)} style={{ background: '#fff', color: '#4b5563', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cerrar</button>
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