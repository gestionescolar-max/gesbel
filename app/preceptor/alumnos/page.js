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
    ciclo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>,
    historial: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" /></svg>,
    cerrar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
    reabrir: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
};

// Estados que se consideran "cursantes" (activos o finalizados)
const ESTADOS_CURSANTES = ['inscripto', 'en_curso', 'aprobado', 'desaprobado', 'abandono', 'diferido'];

const ESTILOS_ESTADO = {
    en_curso: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
    inscripto: { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
    aprobado: { bg: '#d1fae5', color: '#065f46', border: '#a7f3d0' },
    desaprobado: { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
    abandono: { bg: '#f3f4f6', color: '#4b5563', border: '#e5e7eb' },
    diferido: { bg: '#ede9fe', color: '#5b21b6', border: '#ddd6fe' }
};

const RESULTADOS_CIERRE = [
    { valor: 'aprobado', etiqueta: 'Aprobado / Recibido', desc: 'El alumno cursó y aprobó el trayecto.' },
    { valor: 'desaprobado', etiqueta: 'Desaprobado', desc: 'Cursó pero no alcanzó la aprobación.' },
    { valor: 'abandono', etiqueta: 'Abandono / Baja', desc: 'Se dio de baja durante el cursado.' },
    { valor: 'diferido', etiqueta: 'Diferido', desc: 'No cursó este ciclo, a reprogramar.' }
];

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
    const [anio, mes, dia] = String(fechaISO).split('-').map(Number);
    const d = new Date(anio, mes - 1, dia);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function badgeEstado(estado) {
    const s = ESTILOS_ESTADO[estado] || { bg: '#f3f4f6', color: '#4b5563', border: '#e5e7eb' };
    return (
        <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 4, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
            {estado}
        </span>
    );
}

export default function AlumnosPage() {
    const { docente, cargando } = useDocente();
    const [alumnos, setAlumnos] = useState([]);
    const [cursos, setCursos] = useState([]);
    const [filtroCiclo, setFiltroCiclo] = useState('todos');
    const [filtroCurso, setFiltroCurso] = useState('todos');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [busqueda, setBusqueda] = useState('');
    const [alumnoFicha, setAlumnoFicha] = useState(null);
    const [mostrarFicha, setMostrarFicha] = useState(false);
    const [cierre, setCierre] = useState({ abierto: false, alumno: null, resultado: '' });
    const [historial, setHistorial] = useState({ abierto: false, dni: '', nombre: '', registros: [] });
    const [cargandoHistorial, setCargandoHistorial] = useState(false);
    const [mensaje, setMensaje] = useState(null);
    const [procesando, setProcesando] = useState(false);
    const fichaRef = useRef(null);

    useEffect(() => { if (!docente) return; cargarDatos(); }, [docente]);

    async function cargarDatos() {
        try {
            const [{ data: cursosData }, { data: alumnosData }] = await Promise.all([
                supabase.from('fp_cursos').select('id, nombre, anio, turno, cupo').order('nombre'),
                // ✅ JOIN con fp_alumnos para traer datos personales desde la tabla correcta
                supabase
                    .from('fp_inscripciones')
                    .select('*, fp_alumnos(*)')
                    .in('estado', ESTADOS_CURSANTES)
                    .order('creado_en', { ascending: false })
            ]);
            setCursos(cursosData || []);
            setAlumnos(alumnosData || []);
        } catch (err) {
            console.error('Error al cargar datos:', err);
        }
    }

    function obtenerCiclosUnicos() {
        return [...new Set(cursos.map(c => c.anio))].sort((a, b) => b - a);
    }

    // Helper: extrae datos del alumno (desde fp_alumnos si existe, sino desde inscripción)
    function datosAlumno(a) {
        const al = a.fp_alumnos || a;
        return {
            legajo: al.legajo || a.legajo,
            dni: al.dni || a.dni,
            apellido: al.apellido || a.apellido,
            nombre: al.nombre || a.nombre,
            fecha_nac: al.fecha_nac || a.fecha_nac,
            nacionalidad: al.nacionalidad || a.nacionalidad,
            telefono: al.telefono || a.telefono,
            email: al.email || a.email,
            domicilio: al.domicilio || a.domicilio,
            estudios_obtenidos: al.estudios_obtenidos || a.estudios_obtenidos,
            situacion_laboral: al.situacion_laboral || a.situacion_laboral,
            emergencia_nombre: al.emergencia_nombre || a.emergencia_nombre,
            emergencia_parentesco: al.emergencia_parentesco || a.emergencia_parentesco,
            emergencia_telefono: al.emergencia_telefono || a.emergencia_telefono
        };
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
            resultado = resultado.filter(a => {
                const d = datosAlumno(a);
                return (
                    d.nombre?.toLowerCase().includes(q) ||
                    d.apellido?.toLowerCase().includes(q) ||
                    d.dni?.includes(q) ||
                    d.legajo?.toLowerCase().includes(q)
                );
            });
        }
        return resultado;
    }

    // ✅ Abrir modal de cierre de cursado
    function abrirCierre(a) {
        setCierre({ abierto: true, alumno: a, resultado: '' });
    }

    // ✅ Confirmar cierre de cursado
    async function confirmarCierre() {
        if (!cierre.alumno || !cierre.resultado) return;
        setProcesando(true);
        try {
            const { error } = await supabase
                .from('fp_inscripciones')
                .update({ estado: cierre.resultado, fecha_condicion: new Date().toISOString().split('T')[0] })
                .eq('id', cierre.alumno.id);
            if (error) throw error;
            setMensaje({ tipo: 'ok', texto: `Cursado cerrado como "${cierre.resultado}".` });
            setCierre({ abierto: false, alumno: null, resultado: '' });
            await cargarDatos();
            setTimeout(() => setMensaje(null), 3000);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        } finally {
            setProcesando(false);
        }
    }

    // ✅ Reabrir cursado (volver a "en_curso")
    async function reabrirCursado(a) {
        if (!confirm(`¿Reabrir el cursado de ${datosAlumno(a).apellido}, ${datosAlumno(a).nombre}?`)) return;
        setProcesando(true);
        try {
            const { error } = await supabase
                .from('fp_inscripciones')
                .update({ estado: 'en_curso', fecha_condicion: null })
                .eq('id', a.id);
            if (error) throw error;
            setMensaje({ tipo: 'ok', texto: 'Cursado reabierto.' });
            await cargarDatos();
            setTimeout(() => setMensaje(null), 3000);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        } finally {
            setProcesando(false);
        }
    }

    // ✅ Abrir modal de historial académico
    async function abrirHistorial(a) {
        const d = datosAlumno(a);
        if (!d.dni) {
            setMensaje({ tipo: 'error', texto: 'El alumno no tiene DNI cargado.' });
            return;
        }
        setCargandoHistorial(true);
        setHistorial({ abierto: true, dni: d.dni, nombre: `${d.apellido}, ${d.nombre}`, registros: [] });
        try {
            const { data, error } = await supabase
                .from('fp_inscripciones')
                .select('id, legajo, fp_curso_id, ciclo_lectivo, estado, fecha_inscripcion, fecha_condicion, documentacion_completa')
                .eq('dni', d.dni)
                .order('ciclo_lectivo', { ascending: false });
            if (error) throw error;
            setHistorial(prev => ({ ...prev, registros: data || [] }));
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error al cargar historial: ${err.message}` });
        } finally {
            setCargandoHistorial(false);
        }
    }

    function abrirFicha(a) {
        setAlumnoFicha(a);
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

    const enCurso = alumnos.filter(a => a.estado === 'en_curso').length;
    const inscriptos = alumnos.filter(a => a.estado === 'inscripto').length;
    const finalizados = alumnos.filter(a => ['aprobado', 'desaprobado', 'abandono', 'diferido'].includes(a.estado)).length;

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
                    <p style={{ fontSize: 14, color: '#6b7280' }}>Gestión de alumnos dados de alta: cursado activo y cierre de trayectos.</p>
                </div>

                {/* Métricas */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, borderLeft: '3px solid #1e3a8a' }}>
                        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>Total Cursantes</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#1e3a8a', fontVariantNumeric: 'tabular-nums' }}>{alumnos.length}</div>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, borderLeft: '3px solid #059669' }}>
                        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>En cursado</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>{enCurso}</div>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, borderLeft: '3px solid #1e40af' }}>
                        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>Inscriptos (alta)</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#1e40af', fontVariantNumeric: 'tabular-nums' }}>{inscriptos}</div>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, borderLeft: '3px solid #4b5563' }}>
                        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>Finalizados</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#4b5563', fontVariantNumeric: 'tabular-nums' }}>{finalizados}</div>
                    </div>
                </div>

                {/* Filtros */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24, background: '#f9fafb', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
                    <div><label style={labelStyle}>Ciclo Lectivo</label><select value={filtroCiclo} onChange={(e) => { setFiltroCiclo(e.target.value); setFiltroCurso('todos'); }} style={inputStyle}><option value="todos">Todos los ciclos</option>{obtenerCiclosUnicos().map(anio => (<option key={anio} value={anio}>Ciclo {anio}</option>))}</select></div>
                    <div><label style={labelStyle}>Curso</label><select value={filtroCurso} onChange={(e) => setFiltroCurso(e.target.value)} style={inputStyle}><option value="todos">Todos los cursos</option>{cursos.filter(c => filtroCiclo === 'todos' || c.anio === Number(filtroCiclo)).map(c => { const n = c.nombre.replace(/\s*[-–—]\s*\d{4}\s*$/, '').trim(); return <option key={c.id} value={c.id}>{n}</option>; })}</select></div>
                    <div><label style={labelStyle}>Estado</label><select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={inputStyle}><option value="todos">Todos</option><option value="inscripto">Inscripto</option><option value="en_curso">En cursado</option><option value="aprobado">Aprobado</option><option value="desaprobado">Desaprobado</option><option value="abandono">Abandono</option><option value="diferido">Diferido</option></select></div>
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
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 900 }}>
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
                                                const d = datosAlumno(a);
                                                const edad = calcularEdad(d.fecha_nac);
                                                const finalizado = a.estado !== 'en_curso' && a.estado !== 'inscripto';
                                                return (
                                                    <tr key={a.id} style={{ borderBottom: idx < filtrados.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                                        <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', fontFamily: 'monospace' }}>{d.legajo || '—'}</td>
                                                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e3a8a' }}>{d.apellido ? `${d.apellido}, ${d.nombre}` : d.nombre}</td>
                                                        <td style={{ padding: '12px 16px', color: '#4b5563', fontVariantNumeric: 'tabular-nums' }}>{d.dni || '—'}</td>
                                                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#4b5563' }}>{curso?.nombre.replace(/\s*[-–—]\s*\d{4}\s*$/, '').trim() || '—'}</td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#1e3a8a', fontWeight: 600 }}>{edad !== null ? `${edad}` : '—'}</td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>{badgeEstado(a.estado)}</td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                            <button onClick={() => abrirFicha(a)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: '#1e40af', border: '1px solid #1e40af', padding: '6px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer', marginRight: 6 }}>
                                                                {Iconos.imprimir} Ficha
                                                            </button>
                                                            <button onClick={() => abrirHistorial(a)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: '#1e3a8a', border: '1px solid #1e3a8a', padding: '6px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer', marginRight: 6 }}>
                                                                {Iconos.historial} Historial
                                                            </button>
                                                            {a.url_carpeta_drive && (
                                                                <a href={a.url_carpeta_drive} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: '#1e3a8a', border: '1px solid #1e3a8a', padding: '6px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer', marginRight: 6, textDecoration: 'none' }}>
                                                                    {Iconos.externo} Carpeta
                                                                </a>
                                                            )}
                                                            {!finalizado ? (
                                                                <button onClick={() => abrirCierre(a)} disabled={procesando} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1e3a8a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                                                                    {Iconos.cerrar} Cerrar cursado
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => reabrirCursado(a)} disabled={procesando} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: '#4b5563', border: '1px solid #9ca3af', padding: '6px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                                                                    {Iconos.reabrir} Reabrir
                                                                </button>
                                                            )}
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
                                    const d = datosAlumno(a);
                                    const edad = calcularEdad(d.fecha_nac);
                                    const finalizado = a.estado !== 'en_curso' && a.estado !== 'inscripto';
                                    const s = ESTILOS_ESTADO[a.estado] || { bg: '#f3f4f6', color: '#4b5563', border: '#e5e7eb' };
                                    return (
                                        <div key={a.id} className="card-alumno">
                                            <div className="card-alumno-header">
                                                <div>
                                                    <div className="card-alumno-nombre">{d.apellido ? `${d.apellido}, ${d.nombre}` : d.nombre}</div>
                                                    <div className="card-alumno-dni">{d.legajo ? `${d.legajo} · ` : ''}DNI {d.dni || '—'} {edad !== null ? `· ${edad} años` : ''}</div>
                                                </div>
                                                {badgeEstado(a.estado)}
                                            </div>
                                            <div className="card-alumno-curso">
                                                <span className="card-alumno-label">Curso:</span>
                                                <span className="card-alumno-valor">{curso?.nombre.replace(/\s*[-–—]\s*\d{4}\s*$/, '').trim() || '—'}</span>
                                            </div>
                                            <div className="card-alumno-acciones">
                                                <button onClick={() => abrirFicha(a)} className="btn-card btn-card-secundario">Ficha</button>
                                                <button onClick={() => abrirHistorial(a)} className="btn-card btn-card-secundario">Historial</button>
                                                {a.url_carpeta_drive && (<a href={a.url_carpeta_drive} target="_blank" rel="noopener noreferrer" className="btn-card btn-card-secundario">Carpeta</a>)}
                                                {!finalizado ? (
                                                    <button onClick={() => abrirCierre(a)} disabled={procesando} className="btn-card btn-card-primario">Cerrar cursado</button>
                                                ) : (
                                                    <button onClick={() => reabrirCursado(a)} disabled={procesando} className="btn-card btn-card-secundario">Reabrir</button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ===== MODAL: CIERRE DE CURSADO ===== */}
            {cierre.abierto && cierre.alumno && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setCierre({ abierto: false, alumno: null, resultado: '' })}>
                    <div style={{ background: '#fff', borderRadius: 8, padding: 28, maxWidth: 460, width: '100%' }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>Cerrar cursado</h3>
                        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px 0' }}>
                            {datosAlumno(cierre.alumno).apellido}, {datosAlumno(cierre.alumno).nombre}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {RESULTADOS_CIERRE.map(r => (
                                <label key={r.valor} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 6, border: `1px solid ${cierre.resultado === r.valor ? '#1e3a8a' : '#e5e7eb'}`, background: cierre.resultado === r.valor ? '#eff6ff' : '#fff', cursor: 'pointer' }}>
                                    <input type="radio" name="resultado" checked={cierre.resultado === r.valor} onChange={() => setCierre(prev => ({ ...prev, resultado: r.valor }))} style={{ marginTop: 3 }} />
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a' }}>{r.etiqueta}</div>
                                        <div style={{ fontSize: 12, color: '#6b7280' }}>{r.desc}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                            <button onClick={() => setCierre({ abierto: false, alumno: null, resultado: '' })} style={{ background: '#fff', color: '#4b5563', border: '1px solid #d1d5db', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancelar</button>
                            <button onClick={confirmarCierre} disabled={!cierre.resultado || procesando} style={{ background: !cierre.resultado || procesando ? '#9ca3af' : '#1e3a8a', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: !cierre.resultado || procesando ? 'not-allowed' : 'pointer' }}>
                                {procesando ? 'Guardando...' : 'Confirmar cierre'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== MODAL: HISTORIAL ACADÉMICO ===== */}
            {historial.abierto && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setHistorial({ abierto: false, dni: '', nombre: '', registros: [] })}>
                    <div style={{ background: '#fff', borderRadius: 8, padding: 28, maxWidth: 720, width: '100%', maxHeight: '85vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #e5e7eb' }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>Historial académico</h3>
                            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                                {historial.nombre} · DNI {historial.dni} · {historial.registros.length} {historial.registros.length === 1 ? 'inscripción' : 'inscripciones'}
                            </p>
                        </div>

                        {cargandoHistorial ? (
                            <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>Cargando historial...</div>
                        ) : historial.registros.length === 0 ? (
                            <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>No se encontraron inscripciones para este DNI.</div>
                        ) : (
                            <div className="vista-desktop">
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Ciclo</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Curso</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Legajo</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Estado</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Cierre</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historial.registros.map((r, i) => {
                                            const curso = cursos.find(c => c.id === r.fp_curso_id);
                                            return (
                                                <tr key={r.id} style={{ borderBottom: i < historial.registros.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e3a8a' }}>{r.ciclo_lectivo}</td>
                                                    <td style={{ padding: '10px 12px', color: '#4b5563' }}>{curso?.nombre.replace(/\s*[-–—]\s*\d{4}\s*$/, '').trim() || '—'}</td>
                                                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{r.legajo || '—'}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{badgeEstado(r.estado)}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: '#6b7280' }}>{r.fecha_condicion ? formatearFechaLarga(r.fecha_condicion) : '—'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {!cargandoHistorial && historial.registros.length > 0 && (
                            <div className="vista-mobile">
                                {historial.registros.map(r => {
                                    const curso = cursos.find(c => c.id === r.fp_curso_id);
                                    return (
                                        <div key={r.id} className="card-alumno">
                                            <div className="card-alumno-header">
                                                <div>
                                                    <div className="card-alumno-nombre">{curso?.nombre.replace(/\s*[-–—]\s*\d{4}\s*$/, '').trim() || '—'}</div>
                                                    <div className="card-alumno-dni">Ciclo {r.ciclo_lectivo} · {r.legajo || 'Sin legajo'}</div>
                                                </div>
                                                {badgeEstado(r.estado)}
                                            </div>
                                            <div className="card-alumno-curso">
                                                <span className="card-alumno-label">Cierre:</span>
                                                <span className="card-alumno-valor">{r.fecha_condicion ? formatearFechaLarga(r.fecha_condicion) : 'En curso'}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                            <button onClick={() => setHistorial({ abierto: false, dni: '', nombre: '', registros: [] })} style={{ background: '#fff', color: '#4b5563', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== MODAL: FICHA DEL ALUMNO ===== */}
            {mostrarFicha && alumnoFicha && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setMostrarFicha(false)}>
                    <div style={{ background: '#fff', borderRadius: 8, padding: 40, maxWidth: 800, width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
                        <div ref={fichaRef}>
                            {(() => {
                                const d = datosAlumno(alumnoFicha);
                                return (
                                    <>
                                        <div style={{ textAlign: 'center', marginBottom: 32, paddingBottom: 20, borderBottom: '2px solid #1e3a8a' }}>
                                            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e3a8a', marginBottom: 8, marginTop: 0 }}>ESCUELA TÉCNICA FRAY LUIS BELTRÁN</h1>
                                            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>FICHA DEL ALUMNO CURSANTE</h2>
                                            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Legajo: {d.legajo || 'Pendiente'} | Estado: {alumnoFicha.estado}</p>
                                        </div>
                                        <div style={{ marginBottom: 24 }}>
                                            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>Datos Personales</h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14, color: '#4b5563' }}>
                                                <div><strong>Apellido y Nombre:</strong> {d.apellido}, {d.nombre}</div>
                                                <div><strong>DNI:</strong> {d.dni}</div>
                                                <div><strong>Fecha de Nacimiento:</strong> {formatearFechaLarga(d.fecha_nac)} {calcularEdad(d.fecha_nac) !== null ? `(Edad: ${calcularEdad(d.fecha_nac)} años)` : ''}</div>
                                                <div><strong>Nacionalidad:</strong> {d.nacionalidad}</div>
                                            </div>
                                        </div>
                                        <div style={{ marginBottom: 24 }}>
                                            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>Datos de Contacto</h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14, color: '#4b5563' }}>
                                                <div><strong>Teléfono:</strong> {d.telefono}</div>
                                                <div><strong>Email:</strong> {d.email || '—'}</div>
                                                <div style={{ gridColumn: '1 / -1' }}><strong>Domicilio:</strong> {d.domicilio || '—'}</div>
                                            </div>
                                        </div>
                                        <div style={{ marginBottom: 24 }}>
                                            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>Cursado</h3>
                                            <div style={{ fontSize: 14, color: '#4b5563' }}>
                                                <div><strong>Curso:</strong> {cursos.find(c => c.id === alumnoFicha.fp_curso_id)?.nombre || '—'} ({cursos.find(c => c.id === alumnoFicha.fp_curso_id)?.turno})</div>
                                                <div><strong>Ciclo Lectivo:</strong> {alumnoFicha.ciclo_lectivo}</div>
                                                <div><strong>Fecha de inscripción:</strong> {formatearFechaLarga(alumnoFicha.fecha_inscripcion)}</div>
                                            </div>
                                        </div>
                                        <div style={{ marginBottom: 24 }}>
                                            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>Documentación</h3>
                                            <div style={{ fontSize: 14, color: '#4b5563' }}>
                                                {DOCUMENTOS_REQUERIDOS.map(doc => {
                                                    const fisico = alumnoFicha[`doc_${doc.id}_fisico`];
                                                    return (
                                                        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                            <span style={{ fontWeight: 600, minWidth: 200 }}>{doc.nombre}:</span>
                                                            {fisico ? (<span className="badge badge-fisico">Presentado</span>) : (<span style={{ color: '#b91c1c', fontSize: 12 }}>Pendiente</span>)}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
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