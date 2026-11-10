'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Sidebar from '@/components/Sidebar';

const Iconos = {
    curso: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>,
    calendario: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    usuarios: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    flecha: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
    check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
};

export default function DocenteCursosPage() {
    const { docente, cargando } = useDocente();
    const router = useRouter();
    const [cursos, setCursos] = useState([]);
    const [cantidadAlumnos, setCantidadAlumnos] = useState({});
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [mensaje, setMensaje] = useState(null);
    const [cargandoCursos, setCargandoCursos] = useState(true);

    // ✅ ESTADOS AGREGADOS PARA LOS MODALES
    const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
    const [modalFichaAbierto, setModalFichaAbierto] = useState(false);
    const [modalDocumentacionAbierto, setModalDocumentacionAbierto] = useState(false);

    useEffect(() => {
        if (!docente) return;
        cargarCursos();

        let query = supabase
            .from('fp_cursos')
            .select('*')
            .order('nombre');

        // Si es docente puro, solo ve sus cursos. 
        // Si es Preceptor, Admin o Directivo, ve TODOS los cursos.
        if (docente.id && !docente.esAdmin && !docente.esDirectivo && !docente.esPreceptor) {
            query = query.eq('profesor_id', docente.id);
        }
    }, [docente]);

    async function cargarCursos() {
        setCargandoCursos(true);
        try {
            let query = supabase
                .from('fp_cursos')
                .select('*')
                .order('nombre');

            if (docente.id && !docente.esAdmin && !docente.esDirectivo) {
                query = query.eq('profesor_id', docente.id);
            }

            const { data, error } = await query;
            if (error) throw error;

            setCursos(data || []);

            if (data && data.length > 0) {
                const idsCursos = data.map(c => c.id);
                const { data: inscripciones } = await supabase
                    .from('fp_inscripciones')
                    .select('fp_curso_id')
                    .in('fp_curso_id', idsCursos);

                const conteo = {};
                (inscripciones || []).forEach(insc => {
                    conteo[insc.fp_curso_id] = (conteo[insc.fp_curso_id] || 0) + 1;
                });
                setCantidadAlumnos(conteo);
            }
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        } finally {
            setCargandoCursos(false);
        }
    }

    function obtenerEstadoCurso(curso) {
        const anioActual = new Date().getFullYear();
        const mesActual = new Date().getMonth();
        const anioCurso = curso.anio;

        if (anioCurso < anioActual) {
            return { estado: 'finalizado', color: '#6b7280', label: 'Finalizado' };
        }
        if (anioCurso > anioActual) {
            return { estado: 'proximo', color: '#3b82f6', label: 'Próximo a iniciar' };
        }
        if (anioCurso === anioActual && mesActual >= 12) {
            return { estado: 'finalizado', color: '#6b7280', label: 'Finalizado' };
        }
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

    const cursosFiltrados = cursos.filter(c => {
        if (filtroEstado === 'todos') return true;
        return obtenerEstadoCurso(c).estado === filtroEstado;
    });

    if (cargando || !docente) return null;

    const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' };
    const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, background: '#fff', outline: 'none', color: '#1e3a8a' };

    return (
        <Sidebar docente={docente} titulo="Mis Cursos">
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

                <div style={{ marginBottom: 24 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>
                        {docente.esAdmin || docente.esDirectivo ? 'Cursos FP' : 'Mis Cursos Asignados'}
                    </h2>
                    <p style={{ fontSize: 14, color: '#6b7280' }}>
                        {docente.esAdmin || docente.esDirectivo
                            ? 'Gestión y seguimiento de todos los cursos de Formación Profesional'
                            : `Cursos asignados a ${docente.nombre || 'docente'}`
                        }
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ width: 220 }}>
                        <label style={labelStyle}>Estado</label>
                        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={inputStyle}>
                            <option value="todos">Todos los estados</option>
                            <option value="en_cursada">En cursada</option>
                            <option value="proximo">Próximo a iniciar</option>
                            <option value="finalizado">Finalizado</option>
                        </select>
                    </div>
                    <div style={{ flex: 1, textAlign: 'right', paddingTop: 20, minWidth: 150 }}>
                        <span style={{ fontSize: 14, color: '#6b7280' }}>
                            <strong style={{ color: '#1e3a8a' }}>{cursosFiltrados.length}</strong> cursos encontrados
                        </span>
                    </div>
                </div>

                {cargandoCursos && (
                    <div style={{ padding: 60, textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>Cargando cursos...</div>
                    </div>
                )}

                {!cargandoCursos && cursosFiltrados.length === 0 && (
                    <div style={{ padding: 60, textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📚</div>
                        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No hay cursos disponibles</div>
                        <div style={{ fontSize: 14 }}>
                            {docente.esAdmin || docente.esDirectivo
                                ? 'No existen cursos registrados en el sistema.'
                                : 'No tenés cursos asignados actualmente.'
                            }
                        </div>
                    </div>
                )}

                {!cargandoCursos && cursosFiltrados.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                        {cursosFiltrados.map(curso => {
                            const estadoInfo = obtenerEstadoCurso(curso);
                            const cantidadAlumnosCurso = cantidadAlumnos[curso.id] || 0;
                            const porcentajeCupo = curso.cupo > 0 ? Math.round((cantidadAlumnosCurso / curso.cupo) * 100) : 0;

                            return (
                                <div
                                    key={curso.id}
                                    style={{
                                        background: '#fff',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: 8,
                                        padding: 24,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                    onClick={() => router.push(`/docente/cursos/${curso.id}`)}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12 }}>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e3a8a', marginBottom: 4, lineHeight: 1.3 }}>
                                                {curso.nombre.replace(/\s*[-–—]\s*\d{4}\s*$/, '').trim()}
                                            </h3>
                                            <div style={{ fontSize: 13, color: '#6b7280' }}>
                                                {curso.turno || '—'} · {curso.anio || '—'}{curso.cohorte ? ` · Cohorte ${curso.cohorte}` : ''}
                                            </div>
                                        </div>
                                        <div style={{
                                            background: estadoInfo.color,
                                            color: '#fff',
                                            padding: '4px 10px',
                                            borderRadius: 4,
                                            fontSize: 11,
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {estadoInfo.label}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: '#4b5563' }}>
                                        {Iconos.calendario}
                                        <span>
                                            {formatearFecha(curso.fecha_inicio)} → {formatearFecha(curso.fecha_fin)}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: '#4b5563' }}>
                                        {Iconos.usuarios}
                                        <span>
                                            <strong style={{ color: '#1e3a8a' }}>{cantidadAlumnosCurso}</strong> alumnos inscriptos
                                            {curso.cupo && <span style={{ color: '#9ca3af' }}> / {curso.cupo} cupos</span>}
                                        </span>
                                    </div>

                                    {curso.cupo > 0 && (
                                        <div style={{ marginBottom: 16 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                                                <span>Ocupación</span>
                                                <span>{porcentajeCupo}%</span>
                                            </div>
                                            <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${porcentajeCupo}%`,
                                                    background: porcentajeCupo >= 90 ? '#ef4444' : porcentajeCupo >= 70 ? '#f59e0b' : '#10b981',
                                                    transition: 'width 0.3s ease'
                                                }} />
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, fontSize: 13, color: '#1e3a8a', fontWeight: 600 }}>
                                        Ver detalle {Iconos.flecha}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ✅ MODAL: FICHA COMPLETA DEL ALUMNO (Solo una vez) */}
                {modalFichaAbierto && alumnoSeleccionado && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setModalFichaAbierto(false)}>
                        <div style={{ background: '#fff', borderRadius: 8, padding: 32, maxWidth: 800, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #1e3a8a' }}>
                                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Ficha del Alumno</h3>
                                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                                    {alumnoSeleccionado.apellido ? `${alumnoSeleccionado.apellido}, ${alumnoSeleccionado.nombre}` : alumnoSeleccionado.nombre}
                                </p>
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
                                    <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Porcentaje:</strong>
                                        <span style={{ marginLeft: 8, fontWeight: 700, color: alumnoSeleccionado.asistencia?.porcentaje < 75 ? '#b91c1c' : '#15803d' }}>
                                            {alumnoSeleccionado.asistencia?.porcentaje || 0}%
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Clases:</strong> {alumnoSeleccionado.asistencia?.presentes || 0} / {alumnoSeleccionado.asistencia?.total || 0}</div>
                                    <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Estado:</strong>
                                        <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: alumnoSeleccionado.asistencia?.porcentaje < 75 ? '#fef2f2' : '#f0fdf4', color: alumnoSeleccionado.asistencia?.porcentaje < 75 ? '#b91c1c' : '#15803d' }}>
                                            {alumnoSeleccionado.asistencia?.porcentaje < 75 ? 'Insuficiente' : 'Suficiente'}
                                        </span>
                                    </div>
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

                {/* ✅ MODAL: DOCUMENTACIÓN DEL ALUMNO (Solo una vez) */}
                {modalDocumentacionAbierto && alumnoSeleccionado && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setModalDocumentacionAbierto(false)}>
                        <div style={{ background: '#fff', borderRadius: 8, padding: 32, maxWidth: 700, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #1e3a8a' }}>
                                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Documentación del Alumno</h3>
                                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                                    {alumnoSeleccionado.apellido ? `${alumnoSeleccionado.apellido}, ${alumnoSeleccionado.nombre}` : alumnoSeleccionado.nombre}
                                </p>
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

                                        return (
                                            <span style={{ marginLeft: 8 }}>
                                                {completos} de {total} documentos obligatorios ({porcentaje}%)
                                                {porcentaje === 100 ? ' ✅ Completa' : ' ⚠️ Incompleta'}
                                            </span>
                                        );
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
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a' }}>
                                                        {doc.nombre}
                                                        {doc.obligatorio && <span style={{ color: '#b91c1c', fontSize: 11, marginLeft: 4 }}>(Obligatorio)</span>}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 16 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                                        <span style={{ color: fisico ? '#15803d' : '#9ca3af' }}>{Iconos.check}</span>
                                                        <span style={{ color: fisico ? '#15803d' : '#9ca3af' }}>Físico</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                                        <span style={{ color: digital ? '#1e40af' : '#9ca3af' }}>{Iconos.check}</span>
                                                        <span style={{ color: digital ? '#1e40af' : '#9ca3af' }}>Digital</span>
                                                    </div>
                                                </div>
                                                {!completo && doc.obligatorio && (
                                                    <span style={{ fontSize: 11, color: '#b91c1c', fontWeight: 600 }}>Falta</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ marginBottom: 24 }}>
                                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase' }}>Pago de Cooperadora</h4>
                                <div style={{ padding: 12, background: alumnoSeleccionado.pago_cooperadora ? '#f0fdf4' : '#fef3c7', borderRadius: 6, border: `1px solid ${alumnoSeleccionado.pago_cooperadora ? '#bbf7d0' : '#fde68a'}` }}>
                                    <div style={{ fontSize: 13, marginBottom: 4 }}>
                                        <strong>Estado:</strong>
                                        <span style={{ marginLeft: 8, fontWeight: 600, color: alumnoSeleccionado.pago_cooperadora ? '#15803d' : '#92400e' }}>
                                            {alumnoSeleccionado.pago_cooperadora ? '✅ Registrado' : '⚠️ Pendiente'}
                                        </span>
                                    </div>
                                    {alumnoSeleccionado.pago_cooperadora && (
                                        <>
                                            <div style={{ fontSize: 13, marginBottom: 4 }}><strong>Monto:</strong> ${alumnoSeleccionado.monto_cooperadora || 0}</div>
                                            <div style={{ fontSize: 13 }}><strong>Tipo:</strong> {alumnoSeleccionado.tipo_pago_cooperadora || '—'}</div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                                <button onClick={() => setModalDocumentacionAbierto(false)} style={{ background: '#fff', color: '#4b5563', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cerrar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Sidebar>
    );
}