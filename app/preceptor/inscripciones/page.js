'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Sidebar from '@/components/Sidebar';

// ⚠️ REEMPLAZÁ ESTA URL con la tuya del Apps Script
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxTPg1A53GDCcfgNgK229DKWK8pI3xwIHnAvc5kH9bV675NzOE9pME6dB_09OxRlbV-/exec';

const DOCUMENTOS_REQUERIDOS = [
    { id: 'dni', nombre: 'DNI (Frente y Dorso)', obligatorio: true },
    { id: 'foto', nombre: 'Foto 4x4', obligatorio: true },
    { id: 'certificado_estudios', nombre: 'Certificado de Estudios', obligatorio: true },
    { id: 'certificado_medico', nombre: 'Certificado Médico', obligatorio: true },
    { id: 'pago', nombre: 'Comprobante de Pago / Cooperadora', obligatorio: false },
];

const Iconos = {
    formulario: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
    lista: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>,
    resumen: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
    subir: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
    check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>,
    externo: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>,
    alerta: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
    calendario: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    bloqueo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
};

// ============================================
// LÓGICA DE PERÍODO DE INSCRIPCIÓN
// ============================================
function obtenerPeriodoInscripcion() {
    const ahora = new Date();
    const mes = ahora.getMonth(); // 0-11 (enero=0, diciembre=11)
    const anio = ahora.getFullYear();

    if (mes >= 10) { // Noviembre (10) o Diciembre (11)
        // Período abierto para el ciclo del año siguiente
        return {
            abierto: true,
            cicloLectivo: anio + 1,
            periodo: 'noviembre-diciembre',
            mensaje: `Período de inscripción abierto para el ciclo lectivo ${anio + 1}`
        };
    } else if (mes >= 0 && mes <= 5) { // Enero (0) a Junio (5)
        // Período abierto para el ciclo del año actual
        return {
            abierto: true,
            cicloLectivo: anio,
            periodo: 'enero-junio',
            mensaje: `Período de inscripción abierto para el ciclo lectivo ${anio}`
        };
    } else { // Julio (6) a Octubre (9)
        // Período cerrado
        return {
            abierto: false,
            cicloLectivo: anio,
            periodo: 'cerrado',
            mensaje: 'Período de inscripción cerrado. El próximo período abrirá en noviembre.'
        };
    }
}

export default function InscripcionesPage() {
    const { docente, cargando } = useDocente();
    const [vista, setVista] = useState('inscripcion');

    const [inscripciones, setInscripciones] = useState([]);
    const [cursosFP, setCursosFP] = useState([]);
    const [inscSeleccionada, setInscSeleccionada] = useState(null);
    const [mensaje, setMensaje] = useState(null);
    const [filtroCurso, setFiltroCurso] = useState('todos');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [busqueda, setBusqueda] = useState('');

    const [archivoListado, setArchivoListado] = useState(null);
    const [subiendoListado, setSubiendoListado] = useState(false);
    const [tipoDocListado, setTipoDocListado] = useState('Documentación General');

    // Obtener período de inscripción
    const periodoInscripcion = obtenerPeriodoInscripcion();

    const [enviando, setEnviando] = useState(false);
    const [archivosForm, setArchivosForm] = useState({});
    const [form, setForm] = useState({
        fp_curso_id: '',
        ciclo_lectivo: periodoInscripcion.cicloLectivo.toString(),
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

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    async function subirArchivoADrive(archivo, tipoDoc, identificadorAlumno) {
        const base64 = await fileToBase64(archivo);
        const payload = {
            legajo: identificadorAlumno.legajo || `PRE-${identificadorAlumno.dni}`,
            nombre: `${identificadorAlumno.apellido}, ${identificadorAlumno.nombre}`,
            tipo_documento: tipoDoc,
            archivo_base64: base64.split(',')[1],
            nombre_archivo: `${tipoDoc} - ${archivo.name}`
        };

        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        return await response.json();
    }

    function handleChangeForm(e) {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    }

    function handleFileChange(docId, file) {
        setArchivosForm(prev => ({ ...prev, [docId]: file }));
    }

    async function handleSubmitInscripcion(e) {
        e.preventDefault();

        // Validar que el período esté abierto
        if (!periodoInscripcion.abierto) {
            setMensaje({ tipo: 'error', texto: 'El período de inscripción está cerrado.' });
            return;
        }

        setEnviando(true);
        setMensaje(null);

        try {
            const docsObligatoriosCargados = DOCUMENTOS_REQUERIDOS
                .filter(d => d.obligatorio)
                .every(d => archivosForm[d.id]);

            const estadoFinal = docsObligatoriosCargados ? 'inscripto' : 'preinscrito';

            const datosInsert = {
                ...form,
                fp_curso_id: Number(form.fp_curso_id),
                preceptor_id: docente.id,
                estado: estadoFinal,
                fecha_inscripcion: new Date().toISOString().split('T')[0],
                documentacion_completa: docsObligatoriosCargados
            };

            const { data: nuevaInscripcion, error: dbError } = await supabase
                .from('fp_inscripciones')
                .insert(datosInsert)
                .select()
                .single();

            if (dbError) throw dbError;

            let urlCarpetaDrive = null;
            const archivosASubir = Object.entries(archivosForm).filter(([_, file]) => file !== null);

            if (archivosASubir.length > 0) {
                setMensaje({ tipo: 'loading', texto: `Registrando y subiendo ${archivosASubir.length} documento(s) a Drive...` });

                for (const [docId, file] of archivosASubir) {
                    const docInfo = DOCUMENTOS_REQUERIDOS.find(d => d.id === docId);
                    const resultado = await subirArchivoADrive(file, docInfo.nombre, {
                        legajo: nuevaInscripcion.legajo,
                        dni: nuevaInscripcion.dni,
                        apellido: nuevaInscripcion.apellido,
                        nombre: nuevaInscripcion.nombre
                    });

                    if (resultado.success && !urlCarpetaDrive) {
                        urlCarpetaDrive = resultado.url_carpeta;
                    }
                }

                if (urlCarpetaDrive) {
                    await supabase
                        .from('fp_inscripciones')
                        .update({ url_carpeta_drive: urlCarpetaDrive })
                        .eq('id', nuevaInscripcion.id);
                }
            }

            const mensajeExito = estadoFinal === 'inscripto'
                ? '✅ Alumno inscripto y dado de alta correctamente.'
                : '⚠️ Pre-inscripción registrada. Faltan documentos obligatorios para completar la inscripción.';

            setMensaje({ tipo: 'ok', texto: mensajeExito });

            setForm({
                fp_curso_id: '', ciclo_lectivo: periodoInscripcion.cicloLectivo.toString(), apellido: '', nombre: '', dni: '', fecha_nac: '',
                nacionalidad: 'argentino', telefono: '', email: '', domicilio: '',
                estudios_obtenidos: 'primario_secundario', situacion_laboral: '',
                emergencia_nombre: '', emergencia_parentesco: '', emergencia_telefono: '',
                observaciones: ''
            });
            setArchivosForm({});
            cargarDatos();

            setTimeout(() => setMensaje(null), 4000);
        } catch (err) {
            console.error('Error:', err);
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        } finally {
            setEnviando(false);
        }
    }

    async function handleSubirArchivoListado() {
        if (!archivoListado || !inscSeleccionada) return;
        setSubiendoListado(true);
        setMensaje({ tipo: 'loading', texto: 'Subiendo archivo a Drive...' });

        try {
            const resultado = await subirArchivoADrive(archivoListado, tipoDocListado, {
                legajo: inscSeleccionada.legajo,
                dni: inscSeleccionada.dni,
                apellido: inscSeleccionada.apellido,
                nombre: inscSeleccionada.nombre
            });

            if (!resultado.success) throw new Error(resultado.error);

            await supabase
                .from('fp_inscripciones')
                .update({ url_carpeta_drive: resultado.url_carpeta })
                .eq('id', inscSeleccionada.id);

            setMensaje({ tipo: 'ok', texto: 'Documento cargado exitosamente' });
            setArchivoListado(null);
            cargarDatos();
            setTimeout(() => { setMensaje(null); setInscSeleccionada(null); }, 3000);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        } finally {
            setSubiendoListado(false);
        }
    }

    async function confirmarInscripcion(id) {
        if (!confirm('¿Confirmar inscripción y dar de alta al alumno?')) return;
        const { error } = await supabase
            .from('fp_inscripciones')
            .update({ estado: 'inscripto', fecha_confirmacion: new Date().toISOString().split('T')[0], documentacion_completa: true })
            .eq('id', id);

        if (error) {
            setMensaje({ tipo: 'error', texto: error.message });
        } else {
            setMensaje({ tipo: 'ok', texto: 'Alumno inscripto y dado de alta correctamente' });
            cargarDatos();
            setTimeout(() => setMensaje(null), 3000);
        }
    }

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

    const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' };
    const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, background: '#fff', outline: 'none' };
    const sectionTitle = { fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 };

    // Filtrar cursos solo del ciclo lectivo correspondiente al período actual
    const cursosCicloActual = cursosFP.filter(c => c.anio === periodoInscripcion.cicloLectivo);

    return (
        <Sidebar docente={docente} titulo="Gestión de Inscripciones FP">
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>

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
                        {mensaje.tipo === 'error' && <span style={{ color: '#b91c1c' }}>{Iconos.alerta}</span>}
                        {mensaje.texto}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #e5e7eb' }}>
                    {[
                        { id: 'inscripcion', label: 'Inscripción', icon: Iconos.formulario },
                        { id: 'listado', label: 'Listado', icon: Iconos.lista },
                        { id: 'resumen', label: 'Resumen', icon: Iconos.resumen }
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
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* ================= VISTA 1: INSCRIPCIÓN ================= */}
                {vista === 'inscripcion' && (
                    <div style={{ maxWidth: 900 }}>
                        <div style={{ marginBottom: 24 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Ficha de Inscripción</h2>
                            <p style={{ fontSize: 14, color: '#6b7280' }}>
                                Complete los datos y adjunte la documentación digital. Si faltan documentos obligatorios, el alumno quedará como <strong>pre-inscripto</strong>.
                            </p>
                        </div>

                        {/* AVISO DE PERÍODO DE INSCRIPCIÓN */}
                        {!periodoInscripcion.abierto && (
                            <div style={{
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: 8,
                                padding: 20,
                                marginBottom: 24,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12
                            }}>
                                <div style={{ color: '#b91c1c' }}>{Iconos.bloqueo}</div>
                                <div>
                                    <div style={{ fontWeight: 700, color: '#b91c1c', marginBottom: 4 }}>Período de Inscripción Cerrado</div>
                                    <div style={{ fontSize: 14, color: '#7f1d1d' }}>{periodoInscripcion.mensaje}</div>
                                    <div style={{ fontSize: 13, color: '#991b1b', marginTop: 8 }}>
                                        <strong>Calendario institucional:</strong>
                                        <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                                            <li>Noviembre - Diciembre: Inscripción para el ciclo del año siguiente</li>
                                            <li>Enero - Junio: Inscripción para el ciclo del año actual</li>
                                            <li>Julio - Octubre: Período cerrado</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {periodoInscripcion.abierto && (
                            <div style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: 8,
                                padding: 16,
                                marginBottom: 24,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12
                            }}>
                                <div style={{ color: '#1e40af' }}>{Iconos.calendario}</div>
                                <div style={{ fontSize: 14, color: '#1e40af' }}>
                                    <strong>{periodoInscripcion.mensaje}</strong>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmitInscripcion} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 32, opacity: periodoInscripcion.abierto ? 1 : 0.6, pointerEvents: periodoInscripcion.abierto ? 'auto' : 'none' }}>
                            <div style={{ marginBottom: 32 }}>
                                <h3 style={sectionTitle}>{Iconos.formulario} Datos del Curso y Alumno</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>

                                    {/* CAMPO CICLO LECTIVO (Bloqueado al ciclo correspondiente) */}
                                    <div>
                                        <label style={labelStyle}>Ciclo Lectivo *</label>
                                        <input
                                            type="text"
                                            value={form.ciclo_lectivo}
                                            readOnly
                                            style={{ ...inputStyle, background: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed', fontWeight: 600 }}
                                        />
                                        <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                                            {periodoInscripcion.periodo === 'noviembre-diciembre'
                                                ? 'Inscripción para el ciclo del año siguiente'
                                                : 'Inscripción para el ciclo del año actual'}
                                        </p>
                                    </div>

                                    {/* SELECT DE CURSOS (Filtrado por ciclo lectivo y nombre limpio) */}
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={labelStyle}>Curso *</label>
                                        <select name="fp_curso_id" value={form.fp_curso_id} onChange={handleChangeForm} required style={inputStyle}>
                                            <option value="">Seleccione un curso...</option>
                                            {cursosCicloActual.length === 0 && (
                                                <option disabled>No hay cursos disponibles para el ciclo {periodoInscripcion.cicloLectivo}</option>
                                            )}
                                            {cursosCicloActual.map(c => {
                                                const nombreLimpio = c.nombre.replace(/\s*[-–—]\s*\d{4}\s*$/, '').trim();
                                                return (
                                                    <option key={c.id} value={c.id}>
                                                        {nombreLimpio} ({c.turno}) — Cupo: {c.cupo}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    <div><label style={labelStyle}>Apellido *</label><input type="text" name="apellido" value={form.apellido} onChange={handleChangeForm} required style={inputStyle} /></div>
                                    <div><label style={labelStyle}>Nombre *</label><input type="text" name="nombre" value={form.nombre} onChange={handleChangeForm} required style={inputStyle} /></div>
                                    <div><label style={labelStyle}>DNI *</label><input type="text" name="dni" value={form.dni} onChange={handleChangeForm} required placeholder="12345678" style={inputStyle} /></div>
                                    <div><label style={labelStyle}>Fecha de nacimiento *</label><input type="date" name="fecha_nac" value={form.fecha_nac} onChange={handleChangeForm} required style={inputStyle} /></div>
                                    <div><label style={labelStyle}>Nacionalidad *</label>
                                        <select name="nacionalidad" value={form.nacionalidad} onChange={handleChangeForm} required style={inputStyle}>
                                            <option value="argentino">Argentino</option><option value="naturalizado">Naturalizado</option><option value="extranjero">Extranjero</option>
                                        </select>
                                    </div>
                                    <div><label style={labelStyle}>Teléfono *</label><input type="tel" name="telefono" value={form.telefono} onChange={handleChangeForm} required style={inputStyle} /></div>
                                    <div><label style={labelStyle}>Email</label><input type="email" name="email" value={form.email} onChange={handleChangeForm} style={inputStyle} /></div>
                                    <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Domicilio</label><input type="text" name="domicilio" value={form.domicilio} onChange={handleChangeForm} style={inputStyle} /></div>
                                </div>
                            </div>

                            <div style={{ marginBottom: 32 }}>
                                <h3 style={sectionTitle}>{Iconos.subir} Documentación Digital</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {DOCUMENTOS_REQUERIDOS.map(doc => (
                                        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e3a8a' }}>
                                                    {doc.nombre} {doc.obligatorio && <span style={{ color: '#b91c1c', fontSize: 12 }}>(Obligatorio)</span>}
                                                </div>
                                            </div>
                                            <div style={{ width: 250 }}>
                                                <input
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    onChange={(e) => handleFileChange(doc.id, e.target.files[0])}
                                                    style={{ fontSize: 13, width: '100%' }}
                                                />
                                                {archivosForm[doc.id] && (
                                                    <div style={{ fontSize: 11, color: '#15803d', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        {Iconos.check} {archivosForm[doc.id].name}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
                                <button
                                    type="submit"
                                    disabled={enviando || !periodoInscripcion.abierto}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 8,
                                        background: enviando || !periodoInscripcion.abierto ? '#9ca3af' : '#1e3a8a', color: '#fff', border: 'none',
                                        padding: '12px 32px', borderRadius: 4, fontSize: 14, fontWeight: 600,
                                        cursor: enviando || !periodoInscripcion.abierto ? 'not-allowed' : 'pointer', transition: 'background 0.2s'
                                    }}
                                >
                                    {Iconos.check} {enviando ? 'Procesando...' : 'Registrar Inscripción'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ================= VISTA 2: LISTADO ================= */}
                {vista === 'listado' && (
                    <div>
                        <div style={{ marginBottom: 24 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Listado de Alumnos</h2>
                            <p style={{ fontSize: 14, color: '#6b7280' }}>Gestión de inscripciones y documentación pendiente</p>
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
                                                        background: p.estado === 'inscripto' || p.estado === 'en_curso' ? '#dcfce7' : '#fef3c7',
                                                        color: p.estado === 'inscripto' || p.estado === 'en_curso' ? '#15803d' : '#92400e',
                                                        border: `1px solid ${p.estado === 'inscripto' || p.estado === 'en_curso' ? '#bbf7d0' : '#fde68a'}`
                                                    }}>{p.estado}</span>
                                                </td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    <button onClick={() => { setInscSeleccionada(p); setArchivoListado(null); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1e3a8a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer', marginRight: 6 }}>
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

                {/* ================= VISTA 3: RESUMEN (DASHBOARD) ================= */}
                {vista === 'resumen' && (
                    <div>
                        <div style={{ marginBottom: 24 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Resumen de Inscripciones</h2>
                            <p style={{ fontSize: 14, color: '#6b7280' }}>Estadísticas generales de Formación Profesional</p>
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

                {/* ================= MODAL: CARGA ADICIONAL DESDE LISTADO ================= */}
                {inscSeleccionada && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setInscSeleccionada(null)}>
                        <div style={{ background: '#fff', borderRadius: 8, padding: 32, maxWidth: 520, width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #e5e7eb' }}>
                                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Carga de Documentación</h3>
                                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                                    Alumno: <strong style={{ color: '#1e3a8a' }}>{inscSeleccionada.nombre}</strong>
                                    {inscSeleccionada.legajo && <span> · Legajo: {inscSeleccionada.legajo}</span>}
                                </p>
                            </div>

                            <div style={{ marginBottom: 20 }}>
                                <label style={labelStyle}>Tipo de documento</label>
                                <select value={tipoDocListado} onChange={(e) => setTipoDocListado(e.target.value)} style={inputStyle}>
                                    <option value="Documentación General">Documentación General</option>
                                    <option value="DNI">DNI</option>
                                    <option value="Certificado de Estudios">Certificado de Estudios</option>
                                    <option value="Certificado Médico">Certificado Médico</option>
                                    <option value="Comprobante de Pago">Comprobante de Pago / Cooperadora</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: 24 }}>
                                <label style={labelStyle}>Archivo (PDF, JPG, PNG)</label>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setArchivoListado(e.target.files[0])} style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px dashed #d1d5db', fontSize: 14, background: '#f9fafb' }} />
                                {archivoListado && (
                                    <div style={{ fontSize: 12, color: '#15803d', marginTop: 8, padding: '8px 12px', background: '#f0fdf4', borderRadius: 4, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {Iconos.check} {archivoListado.name} ({(archivoListado.size / 1024).toFixed(1)} KB)
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                                <button onClick={() => setInscSeleccionada(null)} style={{ background: '#fff', color: '#4b5563', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                                    Cancelar
                                </button>
                                <button onClick={handleSubirArchivoListado} disabled={subiendoListado || !archivoListado} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: subiendoListado || !archivoListado ? '#9ca3af' : '#1e3a8a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: subiendoListado || !archivoListado ? 'not-allowed' : 'pointer' }}>
                                    {Iconos.subir} {subiendoListado ? 'Subiendo...' : 'Guardar en Drive'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Sidebar>
    );
}