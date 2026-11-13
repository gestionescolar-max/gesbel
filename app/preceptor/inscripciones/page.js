'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Sidebar from '@/components/Sidebar';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxTPg1A53GDCcfgNgK229DKWK8pI3xwIHnAvc5kH9bV675NzOE9pME6dB_09OxRlbV-/exec';

// ✅ Se eliminó el comprobante de pago de esta lista
const DOCUMENTOS_REQUERIDOS = [
    { id: 'carpeta_colgante', nombre: 'Carpeta colgante con visor fijo', obligatorio: true, solo_fisico: true },
    { id: 'fotocopia_dni', nombre: 'Fotocopia de DNI', obligatorio: true },
    { id: 'foto_4x4', nombre: 'Foto 4x4', obligatorio: true },
    { id: 'certificado_domicilio', nombre: 'Certificado de Domicilio', obligatorio: true },
    { id: 'certificado_buena_salud', nombre: 'Certificado de Buena Salud', obligatorio: true },
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
    bloqueo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    imprimir: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>,
    carpeta: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
};

function calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return null;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }
    return edad;
}

function obtenerPeriodoInscripcion() {
    const ahora = new Date();
    const mes = ahora.getMonth();
    const anio = ahora.getFullYear();
    if (mes >= 10) return { abierto: true, cicloLectivo: anio + 1, periodo: 'noviembre-diciembre', mensaje: `Período de inscripción abierto para el ciclo lectivo ${anio + 1}` };
    else if (mes >= 0 && mes <= 5) return { abierto: true, cicloLectivo: anio, periodo: 'enero-junio', mensaje: `Período de inscripción abierto para el ciclo lectivo ${anio}` };
    else return { abierto: false, cicloLectivo: anio, periodo: 'cerrado', mensaje: 'Período de inscripción cerrado. El próximo período abrirá en noviembre.' };
}

export default function InscripcionesPage() {
    const { docente, cargando } = useDocente();
    const periodoInscripcion = obtenerPeriodoInscripcion();

    const [vista, setVista] = useState('inscripcion');
    const [filtroCicloResumen, setFiltroCicloResumen] = useState(periodoInscripcion.cicloLectivo.toString());
    const [inscripciones, setInscripciones] = useState([]);
    const [cursosFP, setCursosFP] = useState([]);
    const [inscSeleccionada, setInscSeleccionada] = useState(null);
    const [mensaje, setMensaje] = useState(null);
    const [filtroCiclo, setFiltroCiclo] = useState('todos');
    const [filtroCurso, setFiltroCurso] = useState('todos');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [busqueda, setBusqueda] = useState('');
    const [archivoListado, setArchivoListado] = useState(null);
    const [subiendoListado, setSubiendoListado] = useState(false);
    const [tipoDocListado, setTipoDocListado] = useState('Documentación General');
    const [checklistModal, setChecklistModal] = useState({});
    const [inscripcionCompleta, setInscripcionCompleta] = useState(null);
    const [mostrarImpresion, setMostrarImpresion] = useState(false);
    const fichaRef = useRef(null);
    const [enviando, setEnviando] = useState(false);
    const [documentosChecklist, setDocumentosChecklist] = useState({});
    const [archivosForm, setArchivosForm] = useState({});
    const [pagoCooperadora, setPagoCooperadora] = useState({ paga: false, monto: 0, tipo_pago: 'total', nro_comprobante: '' });
    const [edadCalculada, setEdadCalculada] = useState(null);

    const [form, setForm] = useState({
        fp_curso_id: '', ciclo_lectivo: periodoInscripcion.cicloLectivo.toString(),
        apellido: '', nombre: '', dni: '', fecha_nac: '', nacionalidad: 'argentino',
        telefono: '', email: '', domicilio: '', estudios_obtenidos: 'primario_secundario',
        situacion_laboral: '', emergencia_nombre: '', emergencia_parentesco: '',
        emergencia_telefono: '', observaciones: ''
    });

    useEffect(() => { if (!docente) return; cargarDatos(); }, [docente]);

    async function cargarDatos() {
        try {
            const [{ data: cursos }, { data: insc }] = await Promise.all([
                supabase.from('fp_cursos').select('id, nombre, anio, turno, cupo').order('nombre'),
                supabase.from('fp_inscripciones').select('*').order('creado_en', { ascending: false })
            ]);
            setCursosFP(cursos || []);
            setInscripciones(insc || []);
        } catch (error) { console.error('Error al cargar datos:', error); }
    }

    function obtenerCiclosUnicos() {
        const ciclos = [...new Set(cursosFP.map(c => c.anio))];
        return ciclos.sort((a, b) => b - a);
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    async function subirArchivoADrive(archivo, tipoDoc, identificadorAlumno, carpetaUrl = null) {
        const base64 = await fileToBase64(archivo);
        const payload = {
            legajo: identificadorAlumno.legajo || `PRE-${identificadorAlumno.dni}`,
            nombre: `${identificadorAlumno.apellido || ''}, ${identificadorAlumno.nombre}`,
            tipo_documento: tipoDoc,
            archivo_base64: base64.split(',')[1],
            nombre_archivo: `${tipoDoc} - ${archivo.name}`,
            carpeta_url: carpetaUrl
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

    function handleFechaNacimientoChange(e) {
        const fecha = e.target.value;
        setForm(prev => ({ ...prev, fecha_nac: fecha }));
        const edad = calcularEdad(fecha);
        setEdadCalculada(edad);
    }

    function handleDocumentoCheck(docId, tipo, valor) {
        setDocumentosChecklist(prev => ({ ...prev, [docId]: { ...prev[docId], [tipo]: valor } }));
    }

    function handleFileChange(docId, file) {
        setArchivosForm(prev => ({ ...prev, [docId]: file }));
    }

    async function handleSubmitInscripcion(e) {
        e.preventDefault();
        if (!periodoInscripcion.abierto) { setMensaje({ tipo: 'error', texto: 'El período de inscripción está cerrado.' }); return; }
        setEnviando(true);
        setMensaje(null);

        try {
            const docsObligatoriosMarcados = DOCUMENTOS_REQUERIDOS.filter(d => d.obligatorio).filter(d => {
                const doc = documentosChecklist[d.id] || {};
                return doc.fisico || doc.digital;
            });
            const todosDocsObligatoriosOK = docsObligatoriosMarcados.length === DOCUMENTOS_REQUERIDOS.filter(d => d.obligatorio).length;
            const cooperadoraOK = pagoCooperadora.paga && pagoCooperadora.monto > 0;
            const estadoFinal = (todosDocsObligatoriosOK && cooperadoraOK) ? 'inscripto' : 'preinscrito';

            const faltantes = [];
            if (!todosDocsObligatoriosOK) {
                const docsFaltantes = DOCUMENTOS_REQUERIDOS.filter(d => d.obligatorio).filter(d => {
                    const doc = documentosChecklist[d.id] || {};
                    return !doc.fisico && !doc.digital;
                });
                faltantes.push(`Documentos faltantes: ${docsFaltantes.map(d => d.nombre).join(', ')}`);
            }
            if (!cooperadoraOK) faltantes.push('No se registró pago de cooperadora');

            const datosDocumentos = {};
            DOCUMENTOS_REQUERIDOS.forEach(doc => {
                const check = documentosChecklist[doc.id] || {};
                datosDocumentos[`doc_${doc.id}_fisico`] = check.fisico || false;
                datosDocumentos[`doc_${doc.id}_digital`] = check.digital || false;
            });

            const datosInsert = {
                ...form, ...datosDocumentos, fp_curso_id: Number(form.fp_curso_id),
                estado: estadoFinal, fecha_inscripcion: new Date().toISOString().split('T')[0],
                documentacion_completa: todosDocsObligatoriosOK,
                pago_cooperadora: pagoCooperadora.paga,
                monto_cooperadora: pagoCooperadora.paga ? pagoCooperadora.monto : 0,
                tipo_pago_cooperadora: pagoCooperadora.tipo_pago,
                nro_comprobante_cooperadora: pagoCooperadora.nro_comprobante
            };

            const { data: nuevaInscripcion, error: dbError } = await supabase.from('fp_inscripciones').insert(datosInsert).select().single();
            if (dbError) throw dbError;

            let urlCarpetaDrive = null;
            const archivosASubir = Object.entries(archivosForm).filter(([_, file]) => file !== null && file !== undefined);
            if (archivosASubir.length > 0) {
                setMensaje({ tipo: 'loading', texto: `Subiendo ${archivosASubir.length} documento(s) digitales a Drive...` });
                const datosAlumno = {
                    legajo: nuevaInscripcion.legajo || `PRE-${nuevaInscripcion.dni || nuevaInscripcion.id}`,
                    dni: nuevaInscripcion.dni || 'SIN-DNI',
                    apellido: nuevaInscripcion.apellido || form.apellido || 'Sin apellido',
                    nombre: nuevaInscripcion.nombre || form.nombre || 'Sin nombre'
                };
                for (const [docId, file] of archivosASubir) {
                    const docInfo = DOCUMENTOS_REQUERIDOS.find(d => d.id === docId);
                    try {
                        const resultado = await subirArchivoADrive(file, docInfo.nombre, datosAlumno);
                        if (resultado.success && resultado.url_carpeta) urlCarpetaDrive = resultado.url_carpeta;
                    } catch (err) { console.error('Error al subir archivo:', docInfo.nombre, err); }
                }
                if (urlCarpetaDrive) await supabase.from('fp_inscripciones').update({ url_carpeta_drive: urlCarpetaDrive }).eq('id', nuevaInscripcion.id);
            }

            let mensajeFinal = estadoFinal === 'inscripto' ? 'Alumno INSCRIPTO correctamente. Documentación completa y cooperadora registrada.' : `Alumno PRE-INSCRIPTO. Queda pendiente: ${faltantes.join(' · ')}`;
            setMensaje({ tipo: estadoFinal === 'inscripto' ? 'ok' : 'warning', texto: mensajeFinal });
            setInscripcionCompleta({ ...nuevaInscripcion, pago: pagoCooperadora });
            setMostrarImpresion(true);

            setForm({ fp_curso_id: '', ciclo_lectivo: periodoInscripcion.cicloLectivo.toString(), apellido: '', nombre: '', dni: '', fecha_nac: '', nacionalidad: 'argentino', telefono: '', email: '', domicilio: '', estudios_obtenidos: 'primario_secundario', situacion_laboral: '', emergencia_nombre: '', emergencia_parentesco: '', emergencia_telefono: '', observaciones: '' });
            setDocumentosChecklist({}); setArchivosForm({});
            setPagoCooperadora({ paga: false, monto: 0, tipo_pago: 'total', nro_comprobante: '' });
            setEdadCalculada(null);
            cargarDatos();
            setTimeout(() => setMensaje(null), 6000);
        } catch (err) { console.error('Error:', err); setMensaje({ tipo: 'error', texto: `Error: ${err.message}` }); }
        finally { setEnviando(false); }
    }

    async function handleSubirArchivoListado() {
        if (!archivoListado || !inscSeleccionada) return;
        setSubiendoListado(true);
        setMensaje({ tipo: 'loading', texto: 'Subiendo archivo a Drive...' });
        try {
            const resultado = await subirArchivoADrive(archivoListado, tipoDocListado, {
                legajo: inscSeleccionada.legajo, dni: inscSeleccionada.dni,
                apellido: inscSeleccionada.apellido, nombre: inscSeleccionada.nombre
            }, inscSeleccionada.url_carpeta_drive);
            if (!resultado.success) throw new Error(resultado.error);
            await supabase.from('fp_inscripciones').update({ url_carpeta_drive: resultado.url_carpeta }).eq('id', inscSeleccionada.id);
            setMensaje({ tipo: 'ok', texto: 'Documento cargado exitosamente' });
            setArchivoListado(null); cargarDatos();
            setTimeout(() => { setMensaje(null); setInscSeleccionada(null); }, 3000);
        } catch (err) { setMensaje({ tipo: 'error', texto: `Error: ${err.message}` }); }
        finally { setSubiendoListado(false); }
    }

    async function confirmarInscripcion(id) {
        if (!confirm('¿Confirmar inscripción y dar de alta al alumno?')) return;
        const { error } = await supabase.from('fp_inscripciones').update({ estado: 'inscripto', fecha_condicion: new Date().toISOString().split('T')[0], documentacion_completa: true }).eq('id', id);
        if (error) setMensaje({ tipo: 'error', texto: error.message });
        else { setMensaje({ tipo: 'ok', texto: 'Alumno inscripto y dado de alta correctamente' }); cargarDatos(); setTimeout(() => setMensaje(null), 3000); }
    }

    function filtrarInscripciones() {
        let resultado = [...inscripciones];
        if (filtroCiclo !== 'todos') {
            const cursosDelCiclo = cursosFP.filter(c => c.anio === Number(filtroCiclo)).map(c => c.id);
            resultado = resultado.filter(p => cursosDelCiclo.includes(p.fp_curso_id));
        }
        if (filtroCurso !== 'todos') resultado = resultado.filter(p => p.fp_curso_id === Number(filtroCurso));
        if (filtroEstado !== 'todos') resultado = resultado.filter(p => p.estado === filtroEstado);
        if (busqueda) {
            const q = busqueda.toLowerCase();
            resultado = resultado.filter(p => p.nombre.toLowerCase().includes(q) || (p.apellido && p.apellido.toLowerCase().includes(q)) || (p.dni && p.dni.includes(q)));
        }
        return resultado;
    }

    function handleChecklistModal(docId, tipo, valor) {
        setChecklistModal(prev => ({
            ...prev,
            [docId]: { ...prev[docId], [tipo]: valor }
        }));
    }

    async function guardarChecklistModal() {
        if (!inscSeleccionada) return;
        try {
            const datosUpdate = {};
            DOCUMENTOS_REQUERIDOS.forEach(doc => {
                const check = checklistModal[doc.id] || {};
                datosUpdate[`doc_${doc.id}_fisico`] = check.fisico || false;
                datosUpdate[`doc_${doc.id}_digital`] = check.digital || false;
            });

            const { error } = await supabase.from('fp_inscripciones').update(datosUpdate).eq('id', inscSeleccionada.id);
            if (error) throw error;

            setMensaje({ tipo: 'ok', texto: 'Checklist actualizado correctamente' });
            cargarDatos();
            setTimeout(() => setMensaje(null), 3000);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        }
    }

    function handleImprimir() {
        const contenido = fichaRef.current;
        if (!contenido) return;
        const ventana = window.open('', '_blank');
        ventana.document.write(`<html><head><title>Ficha de Inscripción</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#333}.header{text-align:center;border-bottom:2px solid #1e3a8a;padding-bottom:20px;margin-bottom:30px}.header h1{color:#1e3a8a;font-size:22px;margin:0 0 8px 0}.header h2{color:#4b5563;font-size:16px;margin:0 0 4px 0}.header p{color:#6b7280;font-size:13px;margin:0}.seccion{margin-bottom:24px}.seccion h3{color:#1e3a8a;font-size:14px;text-transform:uppercase;margin:0 0 12px 0;border-bottom:1px solid #e5e7eb;padding-bottom:6px}.dato{font-size:14px;color:#4b5563;margin-bottom:6px}.dato strong{color:#1e3a8a}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.doc-item{display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:14px}.badge{padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}.badge-fisico{background:#dcfce7;color:#15803d}.badge-digital{background:#dbeafe;color:#1e40af}.firmas{display:flex;justify-content:space-between;margin-top:60px;font-size:13px;color:#6b7280}.firma-box{width:200px}.firma-linea{border-top:1px solid #000;padding-top:4px;margin-top:40px}@media print{body{padding:20px}}</style></head><body>${contenido.innerHTML}</body></html>`);
        ventana.document.close();
        setTimeout(() => { ventana.print(); ventana.close(); }, 500);
    }

    if (cargando || !docente) return null;

    const filtradas = filtrarInscripciones();
    const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' };
    const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, background: '#fff', outline: 'none', color: '#1e3a8a' };
    const sectionTitle = { fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.05em' };
    const cursosCicloActual = cursosFP.filter(c => c.anio === periodoInscripcion.cicloLectivo);

    const cursosDelCicloResumen = cursosFP.filter(c => c.anio === Number(filtroCicloResumen));
    const inscripcionesDelCiclo = inscripciones.filter(p => {
        const curso = cursosFP.find(c => c.id === p.fp_curso_id);
        return curso && curso.anio === Number(filtroCicloResumen);
    });

    const totalCupos = cursosDelCicloResumen.reduce((sum, c) => sum + (c.cupo || 0), 0);
    const ocupados = inscripcionesDelCiclo.filter(p => p.estado === 'inscripto' || p.estado === 'en_curso' || p.estado === 'preinscrito').length;
    const disponibles = Math.max(0, totalCupos - ocupados);
    const pendientesDoc = inscripcionesDelCiclo.filter(p => !p.documentacion_completa || p.estado === 'preinscrito').length;
    const ultimosPendientes = inscripcionesDelCiclo.filter(p => !p.documentacion_completa || p.estado === 'preinscrito').slice(0, 5);

    return (
        <Sidebar docente={docente} titulo="Gestión de Inscripciones FP">
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>

                {mensaje && (
                    <div style={{
                        background: mensaje.tipo === 'ok' ? '#f0fdf4' : mensaje.tipo === 'error' ? '#fef2f2' : mensaje.tipo === 'warning' ? '#fef3c7' : '#eff6ff',
                        border: `1px solid ${mensaje.tipo === 'ok' ? '#bbf7d0' : mensaje.tipo === 'error' ? '#fecaca' : mensaje.tipo === 'warning' ? '#fde68a' : '#bfdbfe'}`,
                        color: mensaje.tipo === 'ok' ? '#15803d' : mensaje.tipo === 'error' ? '#b91c1c' : mensaje.tipo === 'warning' ? '#92400e' : '#1e40af',
                        padding: 14, borderRadius: 8, marginBottom: 20, fontSize: 14, display: 'flex', alignItems: 'flex-start', gap: 8
                    }}>
                        <span style={{ flexShrink: 0, marginTop: 2 }}>
                            {mensaje.tipo === 'loading' && '⏳'}{mensaje.tipo === 'ok' && '✅'}{mensaje.tipo === 'error' && '❌'}{mensaje.tipo === 'warning' && '⚠️'}
                        </span>
                        <span>{mensaje.texto}</span>
                    </div>
                )}

                <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #e5e7eb' }}>
                    {[
                        { id: 'inscripcion', label: 'Inscripción', icon: Iconos.formulario },
                        { id: 'listado', label: 'Listado', icon: Iconos.lista },
                        { id: 'resumen', label: 'Resumen', icon: Iconos.resumen }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setVista(tab.id)} style={{
                            padding: '12px 24px', background: vista === tab.id ? '#1e3a8a' : 'transparent',
                            color: vista === tab.id ? '#fff' : '#4b5563', border: 'none',
                            borderBottom: vista === tab.id ? '2px solid #1e3a8a' : '2px solid transparent',
                            fontSize: 14, fontWeight: vista === tab.id ? 600 : 400, cursor: 'pointer', marginBottom: -2,
                            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8
                        }}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {vista === 'inscripcion' && (
                    <div style={{ maxWidth: 900 }}>
                        <div style={{ marginBottom: 24 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Ficha de Inscripción</h2>
                            <p style={{ fontSize: 14, color: '#6b7280' }}>Complete los datos, marque la documentación presentada (física y/o digital) y registre el pago de cooperadora.</p>
                        </div>

                        {!periodoInscripcion.abierto && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 20, marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                <div style={{ color: '#b91c1c', flexShrink: 0 }}>{Iconos.bloqueo}</div>
                                <div><div style={{ fontWeight: 700, color: '#b91c1c', marginBottom: 4 }}>Período de Inscripción Cerrado</div><div style={{ fontSize: 14, color: '#7f1d1d' }}>{periodoInscripcion.mensaje}</div></div>
                            </div>
                        )}

                        {periodoInscripcion.abierto && (
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ color: '#1e40af' }}>{Iconos.calendario}</div>
                                <div style={{ fontSize: 14, color: '#1e40af' }}><strong>{periodoInscripcion.mensaje}</strong></div>
                            </div>
                        )}

                        <form onSubmit={handleSubmitInscripcion} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 32, opacity: periodoInscripcion.abierto ? 1 : 0.6, pointerEvents: periodoInscripcion.abierto ? 'auto' : 'none' }}>

                            <div style={{ marginBottom: 32 }}>
                                <h3 style={sectionTitle}>{Iconos.formulario} Datos del Curso</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                                    <div><label style={labelStyle}>Ciclo Lectivo</label><input type="text" value={form.ciclo_lectivo} readOnly style={{ ...inputStyle, background: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed', fontWeight: 600 }} /></div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={labelStyle}>Curso</label>
                                        <select name="fp_curso_id" value={form.fp_curso_id} onChange={handleChangeForm} required style={inputStyle}>
                                            <option value="">Seleccione un curso...</option>
                                            {cursosCicloActual.length === 0 && <option disabled>No hay cursos disponibles para el ciclo {periodoInscripcion.cicloLectivo}</option>}
                                            {cursosCicloActual.map(c => {
                                                const nombreLimpio = c.nombre.replace(/\s*[-–—]\s*\d{4}\s*$/, '').trim();
                                                return <option key={c.id} value={c.id}>{nombreLimpio} ({c.turno}) — Cupo: {c.cupo}</option>;
                                            })}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: 32 }}>
                                <h3 style={sectionTitle}>Datos Personales</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                                    <div><label style={labelStyle}>Apellido</label><input type="text" name="apellido" value={form.apellido} onChange={handleChangeForm} required style={inputStyle} /></div>
                                    <div><label style={labelStyle}>Nombre</label><input type="text" name="nombre" value={form.nombre} onChange={handleChangeForm} required style={inputStyle} /></div>
                                    <div><label style={labelStyle}>DNI</label><input type="text" name="dni" value={form.dni} onChange={handleChangeForm} required placeholder="12345678" style={inputStyle} /></div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, gridColumn: '1 / -1' }}>
                                        <div>
                                            <label style={labelStyle}>Fecha de Nacimiento</label>
                                            <input type="date" name="fecha_nac" value={form.fecha_nac} onChange={handleFechaNacimientoChange} required style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Edad (calculada automáticamente)</label>
                                            <input type="text" value={edadCalculada !== null ? `${edadCalculada} años` : '—'} readOnly style={{ ...inputStyle, background: '#f3f4f6', color: edadCalculada ? '#1e3a8a' : '#9ca3af', fontWeight: 600, cursor: 'not-allowed' }} />
                                        </div>
                                    </div>
                                    <div><label style={labelStyle}>Nacionalidad</label><select name="nacionalidad" value={form.nacionalidad} onChange={handleChangeForm} required style={inputStyle}><option value="argentino">Argentino</option><option value="naturalizado">Naturalizado</option><option value="extranjero">Extranjero</option></select></div>
                                </div>
                            </div>

                            <div style={{ marginBottom: 32 }}>
                                <h3 style={sectionTitle}>Datos de Contacto</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                                    <div><label style={labelStyle}>Teléfono</label><input type="tel" name="telefono" value={form.telefono} onChange={handleChangeForm} required placeholder="2345-123456" style={inputStyle} /></div>
                                    <div><label style={labelStyle}>Email</label><input type="email" name="email" value={form.email} onChange={handleChangeForm} placeholder="ejemplo@mail.com" style={inputStyle} /></div>
                                    <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Domicilio</label><input type="text" name="domicilio" value={form.domicilio} onChange={handleChangeForm} placeholder="Calle, número, localidad" style={inputStyle} /></div>
                                </div>
                            </div>

                            <div style={{ marginBottom: 32 }}>
                                <h3 style={sectionTitle}>Datos Académicos y Laborales</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                                    <div><label style={labelStyle}>Estudios Obtenidos</label><select name="estudios_obtenidos" value={form.estudios_obtenidos} onChange={handleChangeForm} required style={inputStyle}><option value="primario_secundario">Primario / Secundario</option><option value="nivel_superior">Nivel Superior / Universitario</option><option value="formacion_profesional">Formación Profesional</option></select></div>
                                    <div><label style={labelStyle}>Situación Laboral</label><select name="situacion_laboral" value={form.situacion_laboral} onChange={handleChangeForm} required style={inputStyle}><option value="">Seleccione...</option><option value="estudiante">Estudiante</option><option value="desocupado">Desocupado</option><option value="empleado">Empleado</option><option value="trabajador_independiente">Trabajador Independiente</option><option value="jubilado">Jubilado</option></select></div>
                                </div>
                            </div>

                            <div style={{ marginBottom: 32 }}>
                                <h3 style={sectionTitle}>Datos de Emergencia</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                                    <div><label style={labelStyle}>Nombre Completo</label><input type="text" name="emergencia_nombre" value={form.emergencia_nombre} onChange={handleChangeForm} style={inputStyle} /></div>
                                    <div><label style={labelStyle}>Parentesco</label><input type="text" name="emergencia_parentesco" value={form.emergencia_parentesco} onChange={handleChangeForm} placeholder="Padre, madre, etc." style={inputStyle} /></div>
                                    <div><label style={labelStyle}>Teléfono</label><input type="tel" name="emergencia_telefono" value={form.emergencia_telefono} onChange={handleChangeForm} style={inputStyle} /></div>
                                </div>
                            </div>

                            <div style={{ marginBottom: 32 }}>
                                <h3 style={{ ...sectionTitle, marginBottom: 8 }}>{Iconos.carpeta} Documentación Presentada</h3>
                                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '10px 12px', marginBottom: 8, fontSize: 13, color: '#1e40af' }}>
                                    <strong>Estado actual:</strong> Se marcaron {DOCUMENTOS_REQUERIDOS.filter(d => d.obligatorio).filter(d => { const doc = documentosChecklist[d.id] || {}; return doc.fisico || doc.digital; }).length} de {DOCUMENTOS_REQUERIDOS.filter(d => d.obligatorio).length} documentos obligatorios.
                                    {pagoCooperadora.paga && pagoCooperadora.monto > 0 ? ' · ✅ Cooperadora registrada' : ' · ⚠️ Cooperadora pendiente'}
                                </div>
                                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12, lineHeight: 1.4 }}>
                                    Marque si el alumno presenta la documentación en formato físico (carpeta) y/o digital. Si faltan documentos obligatorios o no se registra el pago de cooperadora, el alumno quedará como <strong>pre-inscripto</strong>.
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {DOCUMENTOS_REQUERIDOS.map(doc => {
                                        const check = documentosChecklist[doc.id] || {};
                                        return (
                                            <div key={doc.id} style={{
                                                display: 'grid',
                                                gridTemplateColumns: '320px 140px 220px',
                                                gap: 16,
                                                padding: '10px 12px',
                                                background: '#f9fafb',
                                                borderRadius: 6,
                                                border: '1px solid #e5e7eb',
                                                alignItems: 'center'
                                            }}>
                                                {/* Columna 1: Nombre del documento */}
                                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a' }}>
                                                        {doc.nombre} {doc.obligatorio && <span style={{ color: '#b91c1c', fontSize: 11, marginLeft: 4 }}>(Obligatorio)</span>}
                                                    </div>
                                                </div>

                                                {/* Columna 2: Checkboxes Físico/Digital - SIEMPRE en esta columna */}
                                                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#4b5563' }}>
                                                        <input type="checkbox" checked={check.fisico || false} onChange={(e) => handleDocumentoCheck(doc.id, 'fisico', e.target.checked)} style={{ width: 15, height: 15, cursor: 'pointer' }} />
                                                        <span>Físico</span>
                                                    </label>
                                                    {!doc.solo_fisico && (
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#4b5563' }}>
                                                            <input type="checkbox" checked={check.digital || false} onChange={(e) => handleDocumentoCheck(doc.id, 'digital', e.target.checked)} style={{ width: 15, height: 15, cursor: 'pointer' }} />
                                                            <span>Digital</span>
                                                        </label>
                                                    )}
                                                </div>

                                                {/* Columna 3: Input de archivo - Solo si NO es solo_fisico */}
                                                <div>
                                                    {!doc.solo_fisico && (
                                                        <>
                                                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(doc.id, e.target.files[0])} style={{ fontSize: 12, width: '100%' }} />
                                                            {archivosForm[doc.id] && (
                                                                <div style={{ fontSize: 11, color: '#15803d', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={archivosForm[doc.id].name}>
                                                                    {Iconos.check} {archivosForm[doc.id].name}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ marginBottom: 32 }}>
                                <h3 style={sectionTitle}>Pago de Cooperadora</h3>
                                <div style={{ background: '#f9fafb', padding: 20, borderRadius: 6, border: '1px solid #e5e7eb' }}>
                                    <div style={{ marginBottom: 16 }}><label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#1e3a8a' }}><input type="checkbox" checked={pagoCooperadora.paga} onChange={(e) => setPagoCooperadora(prev => ({ ...prev, paga: e.target.checked }))} style={{ width: 18, height: 18, cursor: 'pointer' }} />El alumno realiza aporte a cooperadora</label></div>
                                    {pagoCooperadora.paga && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                                            <div><label style={labelStyle}>Monto</label><input type="number" value={pagoCooperadora.monto} onChange={(e) => setPagoCooperadora(prev => ({ ...prev, monto: parseFloat(e.target.value) || 0 }))} placeholder="0.00" step="0.01" style={inputStyle} /></div>
                                            <div><label style={labelStyle}>Tipo de Pago</label><select value={pagoCooperadora.tipo_pago} onChange={(e) => setPagoCooperadora(prev => ({ ...prev, tipo_pago: e.target.value }))} style={inputStyle}><option value="total">Total</option><option value="parcial">Parcial</option></select></div>
                                            <div><label style={labelStyle}>N° de Comprobante</label><input type="text" value={pagoCooperadora.nro_comprobante} onChange={(e) => setPagoCooperadora(prev => ({ ...prev, nro_comprobante: e.target.value }))} placeholder="Ej: 0001-00001234" style={inputStyle} /></div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
                                <button type="submit" disabled={enviando || !periodoInscripcion.abierto} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: enviando || !periodoInscripcion.abierto ? '#9ca3af' : '#1e3a8a', color: '#fff', border: 'none', padding: '12px 32px', borderRadius: 4, fontSize: 14, fontWeight: 600, cursor: enviando || !periodoInscripcion.abierto ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>{Iconos.check} {enviando ? 'Procesando...' : 'Registrar Inscripción'}</button>
                            </div>
                        </form>
                    </div>
                )}

                {vista === 'listado' && (
                    <div>
                        <div style={{ marginBottom: 24 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Listado de Alumnos</h2>
                            <p style={{ fontSize: 14, color: '#6b7280' }}>Gestión de inscripciones y documentación pendiente</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24, background: '#f9fafb', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
                            <div><label style={labelStyle}>Ciclo Lectivo</label><select value={filtroCiclo} onChange={(e) => { setFiltroCiclo(e.target.value); setFiltroCurso('todos'); }} style={inputStyle}><option value="todos">Todos los ciclos</option>{obtenerCiclosUnicos().map(anio => (<option key={anio} value={anio}>Ciclo {anio}</option>))}</select></div>
                            <div><label style={labelStyle}>Curso</label><select value={filtroCurso} onChange={(e) => setFiltroCurso(e.target.value)} style={inputStyle}><option value="todos">Todos los cursos</option>{cursosFP.filter(c => filtroCiclo === 'todos' || c.anio === Number(filtroCiclo)).map(c => { const nombreLimpio = c.nombre.replace(/\s*[-–—]\s*\d{4}\s*$/, '').trim(); return <option key={c.id} value={c.id}>{nombreLimpio}</option>; })}</select></div>
                            <div><label style={labelStyle}>Estado</label><select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={inputStyle}><option value="todos">Todos los estados</option><option value="preinscrito">Pre-inscripto</option><option value="inscripto">Inscripto</option><option value="en_curso">En curso</option></select></div>
                            <div><label style={labelStyle}>Búsqueda</label><input type="text" placeholder="Nombre, apellido o DNI..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={inputStyle} /></div>
                        </div>
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                    <thead><tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                        <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Legajo</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Alumno</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>DNI</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Curso</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Estado</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Acciones</th>
                                    </tr></thead>
                                    <tbody>
                                        {filtradas.map((p, idx) => (
                                            <tr key={p.id} style={{ borderBottom: idx < filtradas.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                                <td style={{ padding: '14px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', fontFamily: 'monospace' }}>{p.legajo || '—'}</td>
                                                <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e3a8a' }}>{p.apellido ? `${p.apellido}, ${p.nombre}` : p.nombre}</td>
                                                <td style={{ padding: '14px 16px', color: '#4b5563' }}>{p.dni || '—'}</td>
                                                <td style={{ padding: '14px 16px', fontSize: 13, color: '#4b5563' }}>{cursosFP.find(c => c.id === p.fp_curso_id)?.nombre || '—'}</td>
                                                <td style={{ padding: '14px 16px' }}><span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 4, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', background: p.estado === 'inscripto' || p.estado === 'en_curso' ? '#dcfce7' : '#fef3c7', color: p.estado === 'inscripto' || p.estado === 'en_curso' ? '#15803d' : '#92400e', border: `1px solid ${p.estado === 'inscripto' || p.estado === 'en_curso' ? '#bbf7d0' : '#fde68a'}` }}>{p.estado}</span></td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    <button onClick={() => { setInscSeleccionada(p); setArchivoListado(null); const checklistActual = {}; DOCUMENTOS_REQUERIDOS.forEach(doc => { checklistActual[doc.id] = { fisico: p[`doc_${doc.id}_fisico`] || false, digital: p[`doc_${doc.id}_digital`] || false }; }); setChecklistModal(checklistActual); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1e3a8a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer', marginRight: 6 }}>{Iconos.subir} Cargar Doc.</button>
                                                    {p.url_carpeta_drive && (<a href={p.url_carpeta_drive} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: '#1e3a8a', border: '1px solid #1e3a8a', padding: '6px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer', marginRight: 6, textDecoration: 'none' }}>{Iconos.externo} Ver Carpeta</a>)}
                                                    {p.estado === 'preinscrito' && (<button onClick={() => confirmarInscripcion(p.id)} style={{ background: '#fff', color: '#15803d', border: '1px solid #15803d', padding: '6px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Confirmar</button>)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filtradas.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>No se encontraron registros con los filtros seleccionados.</div>}
                        </div>
                    </div>
                )}

                {vista === 'resumen' && (
                    <div>
                        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                            <div><h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Resumen de Inscripciones</h2><p style={{ fontSize: 14, color: '#6b7280' }}>Estadísticas generales de Formación Profesional</p></div>
                            <div style={{ width: 200 }}><label style={labelStyle}>Ciclo Lectivo</label><select value={filtroCicloResumen} onChange={(e) => setFiltroCicloResumen(e.target.value)} style={inputStyle}>{obtenerCiclosUnicos().map(anio => (<option key={anio} value={anio.toString()}>Ciclo {anio}</option>))}</select></div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
                            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20 }}><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Cupos Totales</div><div style={{ fontSize: 32, fontWeight: 700, color: '#1e3a8a' }}>{totalCupos}</div></div>
                            <div style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: 8, padding: 20 }}><div style={{ fontSize: 11, color: '#15803d', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Ocupados (Incluye Reservas)</div><div style={{ fontSize: 32, fontWeight: 700, color: '#15803d' }}>{ocupados}</div><div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Inscriptos + Pre-inscriptos</div></div>
                            <div style={{ background: '#fff', border: '1px solid #3b82f6', borderRadius: 8, padding: 20 }}><div style={{ fontSize: 11, color: '#1d4ed8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Cupos Disponibles</div><div style={{ fontSize: 32, fontWeight: 700, color: '#1d4ed8' }}>{disponibles}</div></div>
                            <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 8, padding: 20 }}><div style={{ fontSize: 11, color: '#92400e', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Pendientes de Documentación</div><div style={{ fontSize: 32, fontWeight: 700, color: '#92400e' }}>{pendientesDoc}</div><div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Requieren acción del preceptor</div></div>
                        </div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e3a8a', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>Cupos por Curso</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}>
                            {cursosDelCicloResumen.map(curso => {
                                const inscCurso = inscripcionesDelCiclo.filter(p => p.fp_curso_id === curso.id);
                                const ocupadosCurso = inscCurso.filter(p => p.estado === 'inscripto' || p.estado === 'en_curso' || p.estado === 'preinscrito').length;
                                const disponiblesCurso = Math.max(0, (curso.cupo || 0) - ocupadosCurso);
                                const porcentaje = curso.cupo > 0 ? Math.min(100, Math.round((ocupadosCurso / curso.cupo) * 100)) : 0;
                                return (
                                    <div key={curso.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20 }}>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e3a8a', marginBottom: 4 }}>{curso.nombre.replace(/\s*[-–—]\s*\d{4}\s*$/, '').trim()}</div>
                                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>{curso.turno} · {curso.anio}</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#4b5563', marginBottom: 8 }}><span>Ocupados: <strong>{ocupadosCurso}</strong></span><span>Disponibles: <strong style={{ color: '#1d4ed8' }}>{disponiblesCurso}</strong> de {curso.cupo}</span></div>
                                        <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}><div style={{ height: '100%', width: `${porcentaje}%`, background: porcentaje >= 90 ? '#ef4444' : porcentaje >= 70 ? '#f59e0b' : '#10b981', transition: 'width 0.3s ease' }} /></div>
                                    </div>
                                );
                            })}
                        </div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e3a8a', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>{Iconos.alerta} Alumnos con Documentación Pendiente (Últimos 5)</h3>
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                            {ultimosPendientes.length === 0 ? (<div style={{ padding: 24, textAlign: 'center', color: '#15803d', fontSize: 14, fontWeight: 500 }}>✅ ¡Excelente! No hay alumnos con documentación pendiente en este ciclo.</div>) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                    <thead><tr style={{ background: '#fef3c7', borderBottom: '2px solid #fde68a' }}><th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#92400e', fontWeight: 600, letterSpacing: '0.05em' }}>Alumno</th><th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#92400e', fontWeight: 600, letterSpacing: '0.05em' }}>Curso</th><th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#92400e', fontWeight: 600, letterSpacing: '0.05em' }}>Estado</th><th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', color: '#92400e', fontWeight: 600, letterSpacing: '0.05em' }}>Acción</th></tr></thead>
                                    <tbody>
                                        {ultimosPendientes.map((p, idx) => (
                                            <tr key={p.id} style={{ borderBottom: idx < ultimosPendientes.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e3a8a' }}>{p.apellido ? `${p.apellido}, ${p.nombre}` : p.nombre}</td>
                                                <td style={{ padding: '12px 16px', fontSize: 13, color: '#4b5563' }}>{cursosFP.find(c => c.id === p.fp_curso_id)?.nombre.replace(/\s*[-–—]\s*\d{4}\s*$/, '').trim() || '—'}</td>
                                                <td style={{ padding: '12px 16px' }}><span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>{p.estado}</span></td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right' }}><button onClick={() => { setInscSeleccionada(p); setArchivoListado(null); const checklistActual = {}; DOCUMENTOS_REQUERIDOS.forEach(doc => { checklistActual[doc.id] = { fisico: p[`doc_${doc.id}_fisico`] || false, digital: p[`doc_${doc.id}_digital`] || false }; }); setChecklistModal(checklistActual); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1e3a8a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>{Iconos.subir} Regularizar</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {inscSeleccionada && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setInscSeleccionada(null)}>
                        <div style={{ background: '#fff', borderRadius: 8, padding: 32, maxWidth: 600, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #e5e7eb' }}>
                                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Carga de Documentación</h3>
                                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Alumno: <strong style={{ color: '#1e3a8a' }}>{inscSeleccionada.apellido ? `${inscSeleccionada.apellido}, ${inscSeleccionada.nombre}` : inscSeleccionada.nombre}</strong>{inscSeleccionada.legajo && <span> · Legajo: {inscSeleccionada.legajo}</span>}</p>
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase' }}>Documentación Presentada</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {DOCUMENTOS_REQUERIDOS.map(doc => {
                                        const check = checklistModal[doc.id] || {};
                                        return (
                                            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, background: '#f9fafb', borderRadius: 4, border: '1px solid #e5e7eb' }}>
                                                <div style={{ flex: 1, fontSize: 13, color: '#1e3a8a', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.nombre}{doc.obligatorio && <span style={{ color: '#b91c1c', fontSize: 11, marginLeft: 4 }}>(Obligatorio)</span>}</div>
                                                <div style={{ display: 'flex', gap: 12 }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12, color: '#4b5563' }}><input type="checkbox" checked={check.fisico || false} onChange={(e) => handleChecklistModal(doc.id, 'fisico', e.target.checked)} style={{ width: 14, height: 14, cursor: 'pointer' }} /><span>Físico</span></label>
                                                    {!doc.solo_fisico && (
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12, color: '#4b5563' }}><input type="checkbox" checked={check.digital || false} onChange={(e) => handleChecklistModal(doc.id, 'digital', e.target.checked)} style={{ width: 14, height: 14, cursor: 'pointer' }} /><span>Digital</span></label>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <button onClick={guardarChecklistModal} style={{ marginTop: 12, background: '#fff', color: '#1e3a8a', border: '1px solid #1e3a8a', padding: '6px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Guardar cambios del checklist</button>
                            </div>
                            <div style={{ marginBottom: 24, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase' }}>Subir Archivo Digital</h4>
                                <div style={{ marginBottom: 12 }}><label style={labelStyle}>Tipo de documento</label><select value={tipoDocListado} onChange={(e) => setTipoDocListado(e.target.value)} style={inputStyle}><option value="Documentación General">Documentación General</option><option value="DNI">DNI</option><option value="Certificado de Estudios">Certificado de Estudios</option><option value="Certificado Médico">Certificado Médico</option><option value="Comprobante de Pago">Comprobante de Pago / Cooperadora</option></select></div>
                                <div><label style={labelStyle}>Archivo (PDF, JPG, PNG)</label><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setArchivoListado(e.target.files[0])} style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px dashed #d1d5db', fontSize: 14, background: '#f9fafb' }} />{archivoListado && (<div style={{ fontSize: 12, color: '#15803d', marginTop: 8, padding: '8px 12px', background: '#f0fdf4', borderRadius: 4, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 6 }}>{Iconos.check} {archivoListado.name} ({(archivoListado.size / 1024).toFixed(1)} KB)</div>)}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                                <button onClick={() => setInscSeleccionada(null)} style={{ background: '#fff', color: '#4b5563', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancelar</button>
                                <button onClick={handleSubirArchivoListado} disabled={subiendoListado || !archivoListado} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: subiendoListado || !archivoListado ? '#9ca3af' : '#1e3a8a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: subiendoListado || !archivoListado ? 'not-allowed' : 'pointer' }}>{Iconos.subir} {subiendoListado ? 'Subiendo...' : 'Guardar en Drive'}</button>
                            </div>
                        </div>
                    </div>
                )}

                {mostrarImpresion && inscripcionCompleta && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setMostrarImpresion(false)}>
                        <div style={{ background: '#fff', borderRadius: 8, padding: 40, maxWidth: 800, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
                            <div ref={fichaRef}>
                                <div style={{ textAlign: 'center', marginBottom: 32, paddingBottom: 20, borderBottom: '2px solid #1e3a8a' }}><h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e3a8a', marginBottom: 8, marginTop: 0 }}>ESCUELA TÉCNICA FRAY LUIS BELTRÁN</h1><h2 style={{ fontSize: 16, fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>FICHA DE INSCRIPCIÓN - FORMACIÓN PROFESIONAL</h2><p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Ciclo Lectivo: {inscripcionCompleta.ciclo_lectivo} | Legajo: {inscripcionCompleta.legajo || 'Pendiente'}</p></div>
                                <div style={{ marginBottom: 24 }}><h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>Datos del Curso</h3><div style={{ fontSize: 14, color: '#4b5563' }}><strong>Curso:</strong> {cursosFP.find(c => c.id === inscripcionCompleta.fp_curso_id)?.nombre || '—'} ({cursosFP.find(c => c.id === inscripcionCompleta.fp_curso_id)?.turno})</div></div>
                                <div style={{ marginBottom: 24 }}><h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>Datos Personales</h3><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14, color: '#4b5563' }}><div><strong>Apellido y Nombre:</strong> {inscripcionCompleta.apellido}, {inscripcionCompleta.nombre}</div><div><strong>DNI:</strong> {inscripcionCompleta.dni}</div><div><strong>Fecha de Nacimiento:</strong> {inscripcionCompleta.fecha_nac} {calcularEdad(inscripcionCompleta.fecha_nac) !== null ? `(Edad: ${calcularEdad(inscripcionCompleta.fecha_nac)} años)` : ''}</div><div><strong>Nacionalidad:</strong> {inscripcionCompleta.nacionalidad}</div></div></div>
                                <div style={{ marginBottom: 24 }}><h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>Datos de Contacto</h3><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14, color: '#4b5563' }}><div><strong>Teléfono:</strong> {inscripcionCompleta.telefono}</div><div><strong>Email:</strong> {inscripcionCompleta.email || '—'}</div><div style={{ gridColumn: '1 / -1' }}><strong>Domicilio:</strong> {inscripcionCompleta.domicilio || '—'}</div></div></div>
                                <div style={{ marginBottom: 24 }}><h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>Datos Académicos y Laborales</h3><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14, color: '#4b5563' }}><div><strong>Estudios Obtenidos:</strong> {inscripcionCompleta.estudios_obtenidos}</div><div><strong>Situación Laboral:</strong> {inscripcionCompleta.situacion_laboral}</div></div></div>
                                <div style={{ marginBottom: 24 }}><h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>Datos de Emergencia</h3><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14, color: '#4b5563' }}><div><strong>Nombre:</strong> {inscripcionCompleta.emergencia_nombre || '—'}</div><div><strong>Parentesco:</strong> {inscripcionCompleta.emergencia_parentesco || '—'}</div><div><strong>Teléfono:</strong> {inscripcionCompleta.emergencia_telefono || '—'}</div></div></div>
                                <div style={{ marginBottom: 24 }}><h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>Documentación Presentada</h3><div style={{ fontSize: 14, color: '#4b5563' }}>{DOCUMENTOS_REQUERIDOS.map(doc => { const fisico = inscripcionCompleta[`doc_${doc.id}_fisico`]; const digital = inscripcionCompleta[`doc_${doc.id}_digital`]; return (<div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}><span style={{ fontWeight: 600, minWidth: 200 }}>{doc.nombre}:</span>{fisico && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#dcfce7', color: '#15803d' }}>Físico</span>}{digital && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#dbeafe', color: '#1e40af' }}>Digital</span>}{!fisico && !digital && <span style={{ color: '#9ca3af', fontSize: 12 }}>No presentado</span>}</div>); })}</div></div>
                                <div style={{ marginBottom: 24 }}><h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 12, textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>Pago de Cooperadora</h3><div style={{ fontSize: 14, color: '#4b5563' }}>{inscripcionCompleta.pago?.paga ? (<><div><strong>Monto:</strong> ${inscripcionCompleta.pago.monto}</div><div><strong>Tipo de Pago:</strong> {inscripcionCompleta.pago.tipo_pago}</div><div><strong>N° de Comprobante:</strong> {inscripcionCompleta.pago.nro_comprobante || '—'}</div></>) : (<div style={{ color: '#9ca3af' }}>No realiza aporte a cooperadora</div>)}</div></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 60, fontSize: 13, color: '#6b7280' }}><div style={{ width: 200 }}><div style={{ marginBottom: 40 }}>Firma del Alumno / Tutor</div><div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>Aclaración y Firma</div></div><div style={{ width: 200 }}><div style={{ marginBottom: 40 }}>Firma del Preceptor</div><div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>Aclaración y Firma</div></div></div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                                <button onClick={() => setMostrarImpresion(false)} style={{ background: '#fff', color: '#4b5563', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cerrar</button>
                                <button onClick={handleImprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1e3a8a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{Iconos.imprimir} Imprimir Ficha</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Sidebar>
    );
}