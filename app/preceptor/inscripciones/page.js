'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Sidebar from '@/components/Sidebar';

// ⚠️ REEMPLAZÁ ESTA URL con la tuya del Apps Script
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxTPg1A53GDCcfgNgK229DKWK8pI3xwIHnAvc5kH9bV675NzOE9pME6dB_09OxRlbV-/exec';

// Iconos SVG profesionales
const Iconos = {
    carpeta: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>,
    documento: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
    subir: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
    check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>,
    externo: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>,
    usuario: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
};

export default function InscripcionesPage() {
    const { docente, cargando } = useDocente();
    const [vista, setVista] = useState('dashboard');

    // Estados para listado y dashboard
    const [inscripciones, setInscripciones] = useState([]);
    const [cursosFP, setCursosFP] = useState([]);
    const [inscSeleccionada, setInscSeleccionada] = useState(null);
    const [mensaje, setMensaje] = useState(null);
    const [filtroCurso, setFiltroCurso] = useState('todos');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [busqueda, setBusqueda] = useState('');

    // Estados para carga de documentos
    const [archivo, setArchivo] = useState(null);
    const [subiendo, setSubiendo] = useState(false);
    const [tipoDocSeleccionado, setTipoDocSeleccionado] = useState('Documentación General');

    // Estados para el formulario de pre-inscripción
    const [enviando, setEnviando] = useState(false);
    const [form, setForm] = useState({
        fp_curso_id: '',
        apellido: '',
        nombre: '',
        dni: '',
        fecha_nac: '',
        nacionalidad: 'argentino',
        telefono: '',
        email: '',
        domicilio: '',
        estudios_obtenidos: 'primario_secundario',
        situacion_laboral: '',
        emergencia_nombre: '',
        emergencia_parentesco: '',
        emergencia_telefono: '',
        observaciones: ''
    });

    useEffect(() => {
        if (!docente) return;
        cargarDatos();
    }, [docente]);

    async function cargarDatos() {
        try {
            const [{ data: cursos }, { data: insc }] = await Promise.all([
                supabase.from('fp_cursos').select('id, nombre, anio, turno, cupo').order('nombre'),
                supabase.from('fp_inscripciones').select('*').order('creado_en', { ascending: false })
            ]);
            setCursosFP(cursos || []);
            setInscripciones(insc || []);
        } catch (error) {
            console.error('Error al cargar datos:', error);
        }
    }

    // --- LÓGICA DE DOCUMENTOS ---
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    async function handleSubirArchivo() {
        if (!archivo || !inscSeleccionada) {
            setMensaje({ tipo: 'error', texto: 'Seleccioná un archivo primero' });
            return;
        }

        setSubiendo(true);
        setMensaje({ tipo: 'loading', texto: 'Subiendo archivo a Drive...' });

        try {
            const base64 = await fileToBase64(archivo);
            const payload = {
                legajo: inscSeleccionada.legajo || `SIN-LEG-${inscSeleccionada.id}`,
                nombre: inscSeleccionada.nombre,
                tipo_documento: tipoDocSeleccionado,
                archivo_base64: base64.split(',')[1],
                nombre_archivo: `${tipoDocSeleccionado} - ${archivo.name}`
            };

            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Error en el script');

            const { error: dbError } = await supabase
                .from('fp_inscripciones')
                .update({ url_carpeta_drive: result.url_carpeta })
                .eq('id', inscSeleccionada.id);

            if (dbError) throw dbError;

            setMensaje({ tipo: 'ok', texto: 'Documento cargado exitosamente en Drive' });
            setArchivo(null);
            cargarDatos();
            setTimeout(() => { setMensaje(null); setInscSeleccionada(null); }, 3000);
        } catch (err) {
            console.error('Error:', err);
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        } finally {
            setSubiendo(false);
        }
    }

    async function confirmarInscripcion(id) {
        if (!confirm('¿Confirmar esta inscripción? El alumno pasará a estado "inscripto".')) return;
        const { error } = await supabase
            .from('fp_inscripciones')
            .update({ estado: 'inscripto', fecha_confirmacion: new Date().toISOString().split('T')[0] })
            .eq('id', id);

        if (error) {
            setMensaje({ tipo: 'error', texto: error.message });
        } else {
            setMensaje({ tipo: 'ok', texto: 'Inscripción confirmada correctamente' });
            cargarDatos();
            setTimeout(() => setMensaje(null), 3000);
        }
    }

    // --- LÓGICA DEL FORMULARIO ---
    function handleChangeForm(e) {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    }

    async function handleSubmitForm(e) {
        e.preventDefault();
        setEnviando(true);
        setMensaje(null);

        try {
            const { error } = await supabase
                .from('fp_inscripciones') // Usamos la tabla unificada
                .insert({
                    ...form,
                    fp_curso_id: Number(form.fp_curso_id),
                    preceptor_id: docente.id,
                    estado: 'preinscrito',
                    fecha_inscripcion: new Date().toISOString().split('T')[0]
                });

            if (error) throw error;

            setMensaje({ tipo: 'ok', texto: 'Pre-inscripción registrada correctamente.' });
            setForm({
                fp_curso_id: '', apellido: '', nombre: '', dni: '', fecha_nac: '',
                nacionalidad: 'argentino', telefono: '', email: '', domicilio: '',
                estudios_obtenidos: 'primario_secundario', situacion_laboral: '',
                emergencia_nombre: '', emergencia_parentesco: '', emergencia_telefono: '',
                observaciones: ''
            });
            cargarDatos();
            setTimeout(() => setMensaje(null), 3000);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        } finally {
            setEnviando(false);
        }
    }

    // --- FILTROS ---
    function filtrarInscripciones() {
        let resultado = [...inscripciones];
        if (filtroCurso !== 'todos') resultado = resultado.filter(p => p.fp_curso_id === Number(filtroCurso));
        if (filtroEstado !== 'todos') resultado = resultado.filter(p => p.estado === filtroEstado);
        if (busqueda) {
            const q = busqueda.toLowerCase();
            resultado = resultado.filter(p => p.nombre.toLowerCase().includes(q) || (p.dni && p.dni.includes(q)));
        }
        return resultado;
    }

    if (cargando || !docente) return null;

    const filtradas = filtrarInscripciones();
    const totalGeneral = inscripciones.length;
    const inscriptos = inscripciones.filter(p => p.estado === 'inscripto' || p.estado === 'en_curso').length;
    const preinscritos = inscripciones.filter(p => p.estado === 'preinscrito').length;

    // Estilos reutilizables para el formulario
    const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' };
    const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, background: '#fff', outline: 'none' };
    const sectionTitle = { fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 };

    return (
        <Sidebar docente={docente} titulo="Gestión de Inscripciones FP">
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>

                {/* Mensajes */}
                {mensaje && (
                    <div style={{
                        background: mensaje.tipo === 'ok' ? '#f0fdf4' : mensaje.tipo === 'error' ? '#fef2f2' : '#eff6ff',
                        border: `1px solid ${mensaje.tipo === 'ok' ? '#bbf7d0' : mensaje.tipo === 'error' ? '#fecaca' : '#bfdbfe'}`,
                        color: mensaje.tipo === 'ok' ? '#15803d' : mensaje.tipo === 'error' ? '#b91c1c' : '#1e40af',
                        padding: 14,
                        borderRadius: 8,
                        marginBottom: 20,
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                    }}>
                        {mensaje.tipo === 'loading' && <span style={{ opacity: 0.7 }}>⏳</span>}
                        {mensaje.tipo === 'ok' && <span style={{ color: '#15803d' }}>{Iconos.check}</span>}
                        {mensaje.texto}
                    </div>
                )}

                {/* Navegación por tabs */}
                <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #e5e7eb' }}>
                    {[
                        { id: 'dashboard', label: 'Dashboard' },
                        { id: 'lista', label: 'Listado de Alumnos' },
                        { id: 'formulario', label: 'Nueva Pre-inscripción' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setVista(tab.id)}
                            style={{
                                padding: '12px 24px',
                                background: vista === tab.id ? '#1e3a8a' : 'transparent',
                                color: vista === tab.id ? '#fff' : '#4b5563',
                                border: 'none',
                                borderBottom: vista === tab.id ? '2px solid #1e3a8a' : '2px solid transparent',
                                fontSize: 14,
                                fontWeight: vista === tab.id ? 600 : 400,
                                cursor: 'pointer',
                                marginBottom: -2,
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}
                        >
                            {tab.id === 'formulario' && Iconos.plus}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ================= VISTA: DASHBOARD ================= */}
                {vista === 'dashboard' && (
                    <div>
                        <div style={{ marginBottom: 24 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Panel de Control</h2>
                            <p style={{ fontSize: 14, color: '#6b7280' }}>Resumen de inscripciones en Formación Profesional</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
                            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20 }}>
                                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total de registros</div>
                                <div style={{ fontSize: 32, fontWeight: 700, color: '#1e3a8a' }}>{totalGeneral}</div>
                            </div>
                            <div style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: 8, padding: 20 }}>
                                <div style={{ fontSize: 11, color: '#15803d', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Inscriptos / En curso</div>
                                <div style={{ fontSize: 32, fontWeight: 700, color: '#15803d' }}>{inscriptos}</div>
                            </div>
                            <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 8, padding: 20 }}>
                                <div style={{ fontSize: 11, color: '#92400e', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Pre-inscriptos</div>
                                <div style={{ fontSize: 32, fontWeight: 700, color: '#92400e' }}>{preinscritos}</div>
                            </div>
                        </div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e3a8a', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>Inscripciones por curso</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                            {cursosFP.map(curso => {
                                const inscCurso = inscripciones.filter(p => p.fp_curso_id === curso.id);
                                const enCurso = inscCurso.filter(p => p.estado === 'en_curso' || p.estado === 'inscripto').length;
                                return (
                                    <div key={curso.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e3a8a', marginBottom: 4 }}>{curso.nombre}</div>
                                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>{curso.turno} · {curso.anio} · Cupo: {curso.cupo}</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                            <div style={{ fontSize: 24, fontWeight: 700, color: '#1e3a8a' }}>{enCurso}</div>
                                            <div style={{ fontSize: 12, color: '#6b7280' }}>alumnos activos</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ================= VISTA: LISTADO ================= */}
                {vista === 'lista' && (
                    <div>
                        <div style={{ marginBottom: 24 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Listado de Alumnos</h2>
                            <p style={{ fontSize: 14, color: '#6b7280' }}>Gestión de inscripciones y documentación digital</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24, background: '#f9fafb', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
                            <div>
                                <label style={labelStyle}>Curso</label>
                                <select value={filtroCurso} onChange={(e) => setFiltroCurso(e.target.value)} style={inputStyle}>
                                    <option value="todos">Todos los cursos</option>
                                    {cursosFP.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Estado</label>
                                <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={inputStyle}>
                                    <option value="todos">Todos los estados</option>
                                    <option value="preinscrito">Pre-inscripto</option>
                                    <option value="inscripto">Inscripto</option>
                                    <option value="en_curso">En curso</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Búsqueda</label>
                                <input type="text" placeholder="Nombre o DNI..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={inputStyle} />
                            </div>
                        </div>
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Legajo</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Alumno</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>DNI</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Curso</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Estado</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtradas.map((p, idx) => (
                                            <tr key={p.id} style={{ borderBottom: idx < filtradas.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                                <td style={{ padding: '14px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', fontFamily: 'monospace' }}>{p.legajo || '—'}</td>
                                                <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e3a8a' }}>{p.nombre}</td>
                                                <td style={{ padding: '14px 16px', color: '#4b5563' }}>{p.dni || '—'}</td>
                                                <td style={{ padding: '14px 16px', fontSize: 13, color: '#4b5563' }}>{cursosFP.find(c => c.id === p.fp_curso_id)?.nombre || '—'}</td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <span style={{
                                                        display: 'inline-block', padding: '4px 12px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                                                        textTransform: 'uppercase', letterSpacing: '0.05em',
                                                        background: p.estado === 'en_curso' || p.estado === 'inscripto' ? '#dcfce7' : '#fef3c7',
                                                        color: p.estado === 'en_curso' || p.estado === 'inscripto' ? '#15803d' : '#92400e',
                                                        border: `1px solid ${p.estado === 'en_curso' || p.estado === 'inscripto' ? '#bbf7d0' : '#fde68a'}`
                                                    }}>{p.estado}</span>
                                                </td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    <button onClick={() => { setInscSeleccionada(p); setArchivo(null); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1e3a8a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer', marginRight: 6 }}>
                                                        {Iconos.subir} Cargar Doc.
                                                    </button>
                                                    {p.url_carpeta_drive && (
                                                        <a href={p.url_carpeta_drive} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: '#1e3a8a', border: '1px solid #1e3a8a', padding: '6px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer', marginRight: 6, textDecoration: 'none' }}>
                                                            {Iconos.externo} Ver Carpeta
                                                        </a>
                                                    )}
                                                    {p.estado === 'preinscrito' && (
                                                        <button onClick={() => confirmarInscripcion(p.id)} style={{ background: '#fff', color: '#15803d', border: '1px solid #15803d', padding: '6px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                                                            Confirmar
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filtradas.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>No se encontraron registros.</div>}
                        </div>
                    </div>
                )}

                {/* ================= VISTA: FORMULARIO ================= */}
                {vista === 'formulario' && (
                    <div style={{ maxWidth: 900 }}>
                        <div style={{ marginBottom: 24 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Ficha de Pre-inscripción</h2>
                            <p style={{ fontSize: 14, color: '#6b7280' }}>Complete los datos del alumno. La inscripción se confirmará al entregar la documentación.</p>
                        </div>

                        <form onSubmit={handleSubmitForm} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 32 }}>

                            <div style={{ marginBottom: 32 }}>
                                <h3 style={sectionTitle}>{Iconos.carpeta} Curso seleccionado</h3>
                                <select name="fp_curso_id" value={form.fp_curso_id} onChange={handleChangeForm} required style={{ ...inputStyle, maxWidth: 400 }}>
                                    <option value="">Seleccione un curso...</option>
                                    {cursosFP.map(c => (
                                        <option key={c.id} value={c.id}>{c.nombre} ({c.turno}) — Cupo: {c.cupo}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: 32 }}>
                                <h3 style={sectionTitle}>{Iconos.usuario} Datos personales</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                                    <div>
                                        <label style={labelStyle}>Apellido *</label>
                                        <input type="text" name="apellido" value={form.apellido} onChange={handleChangeForm} required style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Nombre *</label>
                                        <input type="text" name="nombre" value={form.nombre} onChange={handleChangeForm} required style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>DNI *</label>
                                        <input type="text" name="dni" value={form.dni} onChange={handleChangeForm} required placeholder="12345678" style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Fecha de nacimiento *</label>
                                        <input type="date" name="fecha_nac" value={form.fecha_nac} onChange={handleChangeForm} required style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Nacionalidad *</label>
                                        <select name="nacionalidad" value={form.nacionalidad} onChange={handleChangeForm} required style={inputStyle}>
                                            <option value="argentino">Argentino</option>
                                            <option value="naturalizado">Naturalizado</option>
                                            <option value="extranjero">Extranjero</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: 32 }}>
                                <h3 style={sectionTitle}>Datos de contacto</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                                    <div>
                                        <label style={labelStyle}>Teléfono *</label>
                                        <input type="tel" name="telefono" value={form.telefono} onChange={handleChangeForm} required placeholder="2345-123456" style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Email</label>
                                        <input type="email" name="email" value={form.email} onChange={handleChangeForm} placeholder="ejemplo@mail.com" style={inputStyle} />
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={labelStyle}>Domicilio</label>
                                        <input type="text" name="domicilio" value={form.domicilio} onChange={handleChangeForm} placeholder="Calle, número, localidad" style={inputStyle} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: 32 }}>
                                <h3 style={sectionTitle}>Datos académicos y laborales</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                                    <div>
                                        <label style={labelStyle}>Estudios obtenidos *</label>
                                        <select name="estudios_obtenidos" value={form.estudios_obtenidos} onChange={handleChangeForm} required style={inputStyle}>
                                            <option value="primario_secundario">Primario / Secundario</option>
                                            <option value="nivel_superior">Nivel Superior / Universitario</option>
                                            <option value="formacion_profesional">Formación Profesional</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Situación laboral *</label>
                                        <select name="situacion_laboral" value={form.situacion_laboral} onChange={handleChangeForm} required style={inputStyle}>
                                            <option value="">Seleccione...</option>
                                            <option value="estudiante">Estudiante</option>
                                            <option value="desocupado">Desocupado</option>
                                            <option value="empleado">Empleado</option>
                                            <option value="trabajador_independiente">Trabajador independiente</option>
                                            <option value="jubilado">Jubilado</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: 32 }}>
                                <h3 style={sectionTitle}>Datos de emergencia</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                                    <div>
                                        <label style={labelStyle}>Nombre completo</label>
                                        <input type="text" name="emergencia_nombre" value={form.emergencia_nombre} onChange={handleChangeForm} style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Parentesco</label>
                                        <input type="text" name="emergencia_parentesco" value={form.emergencia_parentesco} onChange={handleChangeForm} placeholder="Padre, madre, etc." style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Teléfono</label>
                                        <input type="tel" name="emergencia_telefono" value={form.emergencia_telefono} onChange={handleChangeForm} style={inputStyle} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
                                <button
                                    type="submit"
                                    disabled={enviando}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        background: enviando ? '#9ca3af' : '#1e3a8a',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '12px 32px',
                                        borderRadius: 4,
                                        fontSize: 14,
                                        fontWeight: 600,
                                        cursor: enviando ? 'not-allowed' : 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    {Iconos.check}
                                    {enviando ? 'Registrando...' : 'Registrar Pre-inscripción'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ================= MODAL: CARGA DE DOCUMENTOS ================= */}
                {inscSeleccionada && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setInscSeleccionada(null)}>
                        <div style={{ background: '#fff', borderRadius: 8, padding: 32, maxWidth: 520, width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #e5e7eb' }}>
                                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Carga de Documentación Digital</h3>
                                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                                    Alumno: <strong style={{ color: '#1e3a8a' }}>{inscSeleccionada.nombre}</strong>
                                    {inscSeleccionada.legajo && <span> · Legajo: {inscSeleccionada.legajo}</span>}
                                </p>
                            </div>

                            <div style={{ marginBottom: 20 }}>
                                <label style={labelStyle}>Tipo de documento</label>
                                <select value={tipoDocSeleccionado} onChange={(e) => setTipoDocSeleccionado(e.target.value)} style={inputStyle}>
                                    <option value="Documentación General">Documentación General</option>
                                    <option value="DNI">DNI</option>
                                    <option value="Certificado de Estudios">Certificado de Estudios</option>
                                    <option value="Certificado Médico">Certificado Médico</option>
                                    <option value="Comprobante de Pago">Comprobante de Pago / Cooperadora</option>
                                    <option value="Seguimiento Académico">Seguimiento Académico</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: 24 }}>
                                <label style={labelStyle}>Archivo (PDF, JPG, PNG)</label>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setArchivo(e.target.files[0])} style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px dashed #d1d5db', fontSize: 14, background: '#f9fafb' }} />
                                {archivo && (
                                    <div style={{ fontSize: 12, color: '#15803d', marginTop: 8, padding: '8px 12px', background: '#f0fdf4', borderRadius: 4, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {Iconos.check} {archivo.name} ({(archivo.size / 1024).toFixed(1)} KB)
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                                <button onClick={() => setInscSeleccionada(null)} style={{ background: '#fff', color: '#4b5563', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                                    Cancelar
                                </button>
                                <button onClick={handleSubirArchivo} disabled={subiendo || !archivo} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: subiendo || !archivo ? '#9ca3af' : '#1e3a8a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: subiendo || !archivo ? 'not-allowed' : 'pointer' }}>
                                    {Iconos.subir} {subiendo ? 'Subiendo...' : 'Guardar en Drive'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Sidebar>
    );
}