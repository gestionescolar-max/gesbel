'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Sidebar from '@/components/Sidebar';

const DOCUMENTOS_REQUERIDOS = [
    { id: 'carpeta_colgante', nombre: 'Carpeta colgante con visor fijo' },
    { id: 'fotocopia_dni', nombre: 'Fotocopia de DNI' },
    { id: 'foto_4x4', nombre: 'Foto 4x4' },
    { id: 'certificado_domicilio', nombre: 'Certificado de Domicilio' },
    { id: 'certificado_buena_salud', nombre: 'Certificado de Buena Salud' },
];

const Iconos = {
    lista: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>,
    imprimir: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>,
    externo: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>,
    check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>,
    ciclo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
};

function calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return null;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
}

function formatearFechaLarga(fechaISO) {
    if (!fechaISO) return '—';
    const [anio, mes, dia] = fechaISO.split('-').map(Number);
    const d = new Date(anio, mes - 1, dia);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function AlumnosPage() {
    const { docente, cargando } = useDocente();
    const [alumnos, setAlumnos] = useState([]);
    const [cursos, setCursos] = useState([]);
    const [filtroCiclo, setFiltroCiclo] = useState('todos');
    const [filtroCurso, setFiltroCurso] = useState('todos');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [busqueda, setBusqueda] = useState('');
    const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
    const [mostrarFicha, setMostrarFicha] = useState(false);
    const [mensaje, setMensaje] = useState(null);
    const [guardandoEstado, setGuardandoEstado] = useState(false);
    const fichaRef = useRef(null);

    useEffect(() => { if (!docente) return; cargarDatos(); }, [docente]);

    async function cargarDatos() {
        try {
            const [{ data: cursosData }, { data: alumnosData }] = await Promise.all([
                supabase.from('fp_cursos').select('id, nombre, anio, turno, cupo').order('nombre'),
                supabase.from('fp_inscripciones').select('*').in('estado', ['inscripto', 'en_curso']).order('apellido')
            ]);
            setCursos(cursosData || []);
            setAlumnos(alumnosData || []);
        } catch (err) {
            console.error('Error al cargar datos:', err);
        }
    }

    function obtenerCiclosUnicos() {
        const ciclos = [...new Set(cursos.map(c => c.anio))];
        return ciclos.sort((a, b) => b - a);
    }

    function filtrarAlumnos() {
        let resultado = [...alumnos];
        if (filtroCiclo !== 'todos') {
            const idsCiclo = cursos.filter(c => c.anio === Number(filtroCiclo)).map(c => c.id);
            resultado = resultado.filter(a => idsCiclo.includes(a.fp_curso_id));
        }
        if (filtroCurso !== 'todos') resultado = resultado.filter(a => a.fp_curso_id === Number(filtroCurso));
        if (filtroEstado !== 'todos') resultado = resultado.filter(a => a.estado === filtroEstado);
        if (busqueda) {
            const q = busqueda.toLowerCase();
            resultado = resultado.filter(a =>
                a.nombre?.toLowerCase().includes(q) ||
                a.apellido?.toLowerCase().includes(q) ||
                a.dni?.includes(q) ||
                a.legajo?.toLowerCase().includes(q)
            );
        }
        return resultado;
    }

    async function cambiarEstado(alumno) {
        const nuevoEstado = alumno.estado === 'inscripto' ? 'en_curso' : 'inscripto';
        const texto = alumno.estado === 'inscripto'
            ? `¿Confirmar que ${alumno.apellido}, ${alumno.nombre} comienza el cursado activo?`
            : `¿Devolver a ${alumno.apellido}, ${alumno.nombre} al estado "Inscripto"?`;
        if (!confirm(texto)) return;

        setGuardandoEstado(true);
        try {
            const { error } = await supabase
                .from('fp_inscripciones')
                .update({ estado: nuevoEstado, fecha_condicion: new Date().toISOString().split('T')[0] })
                .eq('id', alumno.id);
            if (error) throw error;
            setMensaje({ tipo: 'ok', texto: `Estado actualizado a "${nuevoEstado}".` });
            await cargarDatos();
            setTimeout(() => setMensaje(null), 3000);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        } finally {
            setGuardandoEstado(false);
        }
    }

    function abrirFicha(alumno) {
        setAlumnoSeleccionado(alumno);
        setMostrarFicha(true);
    }

    function handleImprimir() {
        const contenido = fichaRef.current;
        if (!contenido) return;
        const ventana = window.open('', '_blank');
        ventana.document.write(`<html><head><title>Ficha del Alumno</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#333}.header{text-align:center;border-bottom:2px solid #1e3a8a;padding-bottom:20px;margin-bottom:30px}.header h1{color:#1e3a8a;font-size:22px;margin:0 0 8px 0}.header h2{color:#4b5563;font-size:16px;margin:0 0 4px 0}.seccion{margin-bottom:24px}.seccion h3{color:#1e3a8a;font-size:14px;text-transform:uppercase;margin:0 0 12px 0;border-bottom:1px solid #e5e7eb;padding-bottom:6px}.dato{font-size:14px;color:#4b5563;margin-bottom:6px}.dato strong{color:#1e3a8a}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.badge{padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}.badge-fisico{background:#dcfce7;color:#15803d}@media print{body{padding:20px}}</style></head><body>${contenido.innerHTML}</body></html>`);
        ventana.document.close();
        setTimeout(() => { ventana.print(); ventana.close(); }, 500);
    }

    if (cargando || !docente) return null;

    const filtrados = filtrarAlumnos();
    const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' };
    const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, background: '#fff', color: '#1e3a8a' };

    const totalCursantes = alumnos.length;
    const totalInscriptos = alumnos.filter(a => a.estado === 'inscripto').length;
    const totalEnCurso = alumnos.filter(a => a.estado === 'en_curso').length;

    return (
        <Sidebar docente={docente} titulo="Gestión de Alumnos Cursantes">
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>

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

                <div style={{ marginBottom: 24 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Alumnos Cursantes</h2>
                    <p style={{ fontSize: 14, color: '#6b7280' }}>Gestión de los alumnos dados de alta y en cursado activo.</p>
                </div>

                {/* Métricas */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, borderLeft: '3px solid #1e3a8a' }}>
                        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>Total Cursantes</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#1e3a8a', fontVariantNumeric: 'tabular-nums' }}>{totalCursantes}</div>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, borderLeft: '3px solid #059669' }}>
                        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>Inscriptos (alta)</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>{totalInscriptos}</div>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, borderLeft: '3px solid #d97706' }}>
                        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>En Cursado</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#d97706', fontVariantNumeric: 'tabular-nums' }}>{totalEnCurso}</div>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, borderLeft: '3px solid #1e40af' }}>
                        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>Resultados</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#1e40af', fontVariantNumeric: 'tabular-nums' }}>{filtrados.length}</div>
                    </div>
                </div>

                {/* Filtros */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24, background: '#f9fafb', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
                    <div><label style={labelStyle}>Ciclo Lectivo</label><select value={filtroCiclo} onChange={(e) => { setFiltroCiclo(e.target.value); setFiltroCurso('todos'); }} style={inputStyle}><option value="todos">Todos los ciclos</option>{obtenerCiclosUnicos().map(anio => (<option key={anio} value={anio}>Ciclo {anio}</option>))}</select></div>
                    <div><label style={labelStyle}>Curso</label><select value={filtroCurso} onChange={(e) => setFiltroCurso(e.target.value)} style={inputStyle}><option value="todos">Todos los cursos</option>{cursos.filter(c => filtroCiclo === 'todos' || c.anio === Number(filtroCiclo)).map(c => { const nombreLimpio = c.nombre.replace(/\s*[-–—]\s*\d{4}\s*$/, '').trim(); return <option key={c.id} value={c.id}>{nombreLimpio}</option>; })}</select></div>
                    <div><label style={labelStyle}>Estado</label><select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={inputStyle}><option value="todos">Todos</option><option value="inscripto">Inscripto</option><option value="en_curso">En curso</option></select></div>
                    <div><label style={labelStyle}>Búsqueda</label><input type="text" placeholder="Nombre, DNI o legajo..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={inputStyle} /></div>
                </div>

                {/* Listado */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                    {filtrados.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>No hay alumnos cursantes con los filtros seleccionados.</div>
                    ) : (
                        <>
                            {/* ===== ESCRITORIO: TABLA ===== */}
                            <div className="vista-desktop">
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 820 }}>
                                        <thead>
                                            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, letterSpacing: '0.05em' }}>Legajo</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, letterSpacing: '0.05em' }}>Alumno</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, letterSpacing: '0.05em' }}>DNI</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, letterSpacing: '0.05em' }}>Curso</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, letterSpacing: '0.05em' }}>Edad</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, letterSpacing: '0.05em' }}>Estado</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, letterSpacing: '0.05em' }}>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtrados.map((a, idx) => {
                                                const curso = cursos.find(c => c.id === a.fp_curso_id);
                                                const edad = calcularEdad(a.fecha_nac);
                                                return (
                                                    <tr key={a.id} style={{ borderBottom: idx < filtrados.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                                        <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', fontFamily: 'monospace' }}>{a.legajo || '—'}</td>
                                                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e3a8a' }}>{a.apellido ? `${a.apellido}, ${a.nombre}` : a.nombre}</td>
                                                        <td style={{ padding: '12px 16px', color: '#4b5563', fontVariantNumeric: 'tabular-nums' }}>{a.dni || '—'}</td>
                                                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#4b5563' }}>{curso?.nombre.replace(/\s*[-–—]\s*\d{4}\s*$/, '').trim() || '—'}</td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#1e3a8a', fontWeight: 600 }}>{edad !== null ? `${edad}` : '—'}</td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 4, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', background: a.estado === 'en_curso' ? '#fef3c7' : '#dcfce7', color: a.estado === 'en_curso' ? '#92400e' : '#15803d', border: `1px solid ${a.estado === 'en_curso' ? '#fde68a' : '#bbf7d0'}` }}>
                                                                {a.estado}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                            <button onClick={() => abrirFicha(a)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: '#1e40af', border: '1px solid #1e40af', padding: '6px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer', marginRight: 6 }}>
                                                                {Iconos.imprimir} Ficha
                                                            </button>
                                                            {a.url_carpeta_drive && (
                                                                <a href={a.url_carpeta_drive} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: '#1e3a8a', border: '1px solid #1e3a8a', padding: '6px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer', marginRight: 6, textDecoration: 'none' }}>
                                                                    {Iconos.externo} Carpeta
                                                                </a>
                                                            )}
                                                            <button onClick={() => cambiarEstado(a)} disabled={guardandoEstado} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1e3a8a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: guardandoEstado ? 'not-allowed' : 'pointer' }}>
                                                                {Iconos.ciclo} {a.estado === 'inscripto' ? 'A cursado' : 'A inscripto'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* ===== MÓVIL: CARDS ===== */}
                            <div className="vista-mobile" style={{ padding: 12 }}>
                                {filtrados.map(a => {
                                    const curso = cursos.find(c => c.id === a.fp_curso_id);
                                    const edad = calcularEdad(a.fecha_nac);
                                    const colorEstado = a.estado === 'en_curso' ? { bg: '#fef3c7', color: '#92400e', border: '#fde68a' } : { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
                                    return (
                                        <div key={a.id} className="card-alumno">
                                            <div className="card-alumno-header">
                                                <div>
                                                    <div className="card-alumno-nombre">{a.apellido ? `${a.apellido}, ${a.nombre}` : a.nombre}</div>
                                                    <div className="card-alumno-dni">{a.legajo ? `${a.legajo} · ` : ''}DNI {a.dni || '—'} {edad !== null ? `· ${edad} años` : ''}</div>
                                                </div>
                                                <span className="card-alumno-estado" style={{ background: colorEstado.bg, color: colorEstado.color, border: `1px solid ${colorEstado.border}` }}>{a.estado}</span>
                                            </div>
                                            <div className="card-alumno-curso">
                                                <span className="card-alumno-label">Curso:</span>
                                                <span className="card-alumno-valor">{curso?.nombre.replace(/\s*[-–—]\s*\d{4}\s*$/, '').trim() || '—'}</span>
                                            </div>
                                            <div className="card-alumno-acciones">
                                                <button onClick={() => abrirFicha(a)} className="btn-card btn-card-secundario">Ficha</button>
                                                {a.url_carpeta_drive && (<a href={a.url_carpeta_drive} target="_blank" rel="noopener noreferrer" className="btn-card btn-card-secundario">Carpeta</a>)}
                                                <button onClick={() => cambiarEstado(a)} disabled={guardandoEstado} className="btn-card btn-card-primario">{a.estado === 'inscripto' ? 'A cursado' : 'A inscripto'}</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ===== MODAL FICHA ===== */}
            {mostrarFicha && alumnoSeleccionado && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setMostrarFicha(false)}>
                    <div style={{ background: '#fff', borderRadius: 8, padding: 40, maxWidth: 800, width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
                        <div ref={fichaRef}>
                            <div style={{ textAlign: 'center', marginBottom: 32, paddingBottom: 20, borderBottom: '2px solid #1e3a8a' }}>
                                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e3a8a', marginBottom: 8, marginTop: 0 }}>ESCUELA TÉCNICA FRAY LUIS BELTRÁN</h1>
                                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>FICHA DEL ALUMNO CURSANTE</h2>
                                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Legajo: {alumnoSeleccionado.legajo || 'Pendiente'} | Estado: {alumnoSeleccionado.estado}</p>
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>Datos Personales</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14, color: '#4b5563' }}>
                                    <div><strong>Apellido y Nombre:</strong> {alumnoSeleccionado.apellido}, {alumnoSeleccionado.nombre}</div>
                                    <div><strong>DNI:</strong> {alumnoSeleccionado.dni}</div>
                                    <div><strong>Fecha de Nacimiento:</strong> {formatearFechaLarga(alumnoSeleccionado.fecha_nac)} {calcularEdad(alumnoSeleccionado.fecha_nac) !== null ? `(Edad: ${calcularEdad(alumnoSeleccionado.fecha_nac)} años)` : ''}</div>
                                    <div><strong>Nacionalidad:</strong> {alumnoSeleccionado.nacionalidad}</div>
                                </div>
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>Datos de Contacto</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14, color: '#4b5563' }}>
                                    <div><strong>Teléfono:</strong> {alumnoSeleccionado.telefono}</div>
                                    <div><strong>Email:</strong> {alumnoSeleccionado.email || '—'}</div>
                                    <div style={{ gridColumn: '1 / -1' }}><strong>Domicilio:</strong> {alumnoSeleccionado.domicilio || '—'}</div>
                                </div>
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>Cursado</h3>
                                <div style={{ fontSize: 14, color: '#4b5563' }}>
                                    <div><strong>Curso:</strong> {cursos.find(c => c.id === alumnoSeleccionado.fp_curso_id)?.nombre || '—'} ({cursos.find(c => c.id === alumnoSeleccionado.fp_curso_id)?.turno})</div>
                                    <div><strong>Ciclo Lectivo:</strong> {alumnoSeleccionado.ciclo_lectivo}</div>
                                    <div><strong>Fecha de inscripción:</strong> {formatearFechaLarga(alumnoSeleccionado.fecha_inscripcion)}</div>
                                </div>
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>Documentación</h3>
                                <div style={{ fontSize: 14, color: '#4b5563' }}>
                                    {DOCUMENTOS_REQUERIDOS.map(doc => {
                                        const fisico = alumnoSeleccionado[`doc_${doc.id}_fisico`];
                                        return (
                                            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                <span style={{ fontWeight: 600, minWidth: 200 }}>{doc.nombre}:</span>
                                                {fisico ? (<span className="badge badge-fisico">Presentado</span>) : (<span style={{ color: '#b91c1c', fontSize: 12 }}>Pendiente</span>)}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                            <button onClick={() => setMostrarFicha(false)} style={{ background: '#fff', color: '#4b5563', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cerrar</button>
                            <button onClick={handleImprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1e3a8a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{Iconos.imprimir} Imprimir</button>
                        </div>
                    </div>
                </div>
            )}
        </Sidebar>
    );
}