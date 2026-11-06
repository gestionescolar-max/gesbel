'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Sidebar from '@/components/Sidebar';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/TU_SCRIPT_ID/exec'; // Reemplazá con tu URL

const DOCUMENTOS_REQUERIDOS = [
    { id: 'doc_dni', nombre: 'Copia de DNI', obligatorio: true, accept: '.pdf,.jpg,.png' },
    { id: 'doc_foto', nombre: 'Foto 4x4', obligatorio: true, accept: '.pdf,.jpg,.png' },
    { id: 'doc_certificado_estudios', nombre: 'Certificado de estudios', obligatorio: true, accept: '.pdf' },
    { id: 'doc_cuil', nombre: 'Constancia de CUIL/CUIT', obligatorio: true, accept: '.pdf' },
    { id: 'doc_certificado_medico', nombre: 'Certificado médico', obligatorio: true, accept: '.pdf' },
    { id: 'doc_libreta_trabajo', nombre: 'Libreta de trabajo', obligatorio: false, accept: '.pdf' }
];

export default function InscripcionesPage() {
    const { docente, cargando } = useDocente();
    const [vista, setVista] = useState('dashboard');
    const [preinscripciones, setPreinscripciones] = useState([]);
    const [cursosFP, setCursosFP] = useState([]);
    const [preinscSeleccionada, setPreinscSeleccionada] = useState(null);
    const [mensaje, setMensaje] = useState(null);
    const [filtroCurso, setFiltroCurso] = useState('todos');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [busqueda, setBusqueda] = useState('');
    const [subiendo, setSubiendo] = useState(false);
    const [documentosExistentes, setDocumentosExistentes] = useState({});

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
        const [{ data: cursos }, { data: preinsc }] = await Promise.all([
            supabase.from('fp_cursos').select('id, nombre, cupo').order('nombre'),
            supabase.from('fp_preinscripciones').select('*').order('creado_en', { ascending: false })
        ]);
        setCursosFP(cursos || []);
        setPreinscripciones(preinsc || []);
    }

    async function cargarDocumentos(preinscId) {
        const { data } = await supabase
            .from('fp_documentos')
            .select('tipo_documento, url_drive, nombre_archivo, carpeta_drive')
            .eq('preinscripcion_id', preinscId);

        const docsMap = {};
        (data || []).forEach(doc => {
            docsMap[doc.tipo_documento] = doc;
        });
        setDocumentosExistentes(docsMap);
    }

    function handleChange(e) {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setMensaje({ tipo: 'loading', texto: 'Registrando...' });

        try {
            const { data, error } = await supabase
                .from('fp_preinscripciones')
                .insert({
                    ...form,
                    fp_curso_id: Number(form.fp_curso_id),
                    preceptor_id: docente.id,
                    estado: 'preinscrito',
                    documentacion_completa: false,
                    fecha_preinscripcion: new Date().toISOString().split('T')[0]
                })
                .select()
                .single();

            if (error) throw error;

            setMensaje({ tipo: 'ok', texto: `Pre-inscripción registrada. Expediente: ${data.numero_expediente}` });
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
        }
    }

    async function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    async function handleUpload(tipoDoc, file) {
        if (!preinscSeleccionada) return;
        setSubiendo(true);
        setMensaje({ tipo: 'loading', texto: 'Subiendo archivo...' });

        try {
            const base64 = await fileToBase64(file);

            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    numero_expediente: preinscSeleccionada.numero_expediente,
                    alumno: `${preinscSeleccionada.apellido}, ${preinscSeleccionada.nombre}`,
                    tipo_documento: tipoDoc,
                    archivo_base64: base64.split(',')[1],
                    nombre_archivo: file.name
                })
            });

            const result = await response.json();

            if (!result.success) throw new Error(result.error);

            const { error } = await supabase
                .from('fp_documentos')
                .insert({
                    preinscripcion_id: preinscSeleccionada.id,
                    tipo_documento: tipoDoc,
                    nombre_archivo: file.name,
                    url_drive: result.url,
                    carpeta_drive: result.carpeta_url,
                    subido_por: docente.id
                });

            if (error) throw error;

            setMensaje({ tipo: 'ok', texto: 'Documento subido a Drive correctamente' });
            cargarDocumentos(preinscSeleccionada.id);
            setTimeout(() => setMensaje(null), 3000);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        } finally {
            setSubiendo(false);
        }
    }

    async function confirmarInscripcion(preinscId) {
        if (!confirm('¿Confirmar esta inscripción? El alumno quedará inscripto definitivamente.')) return;

        const { error } = await supabase
            .from('fp_preinscripciones')
            .update({
                estado: 'confirmado',
                fecha_confirmacion: new Date().toISOString().split('T')[0],
                confirmado_por: docente.id,
                documentacion_completa: true
            })
            .eq('id', preinscId);

        if (error) {
            setMensaje({ tipo: 'error', texto: error.message });
        } else {
            setMensaje({ tipo: 'ok', texto: 'Inscripción confirmada' });
            cargarDatos();
            setTimeout(() => setMensaje(null), 3000);
        }
    }

    function filtrarPreinscripciones() {
        let resultado = [...preinscripciones];
        if (filtroCurso !== 'todos') resultado = resultado.filter(p => p.fp_curso_id === Number(filtroCurso));
        if (filtroEstado === 'preinscrito') resultado = resultado.filter(p => p.estado === 'preinscrito');
        if (filtroEstado === 'confirmado') resultado = resultado.filter(p => p.estado === 'confirmado');
        if (busqueda) {
            const q = busqueda.toLowerCase();
            resultado = resultado.filter(p =>
                p.nombre.toLowerCase().includes(q) ||
                (p.apellido && p.apellido.toLowerCase().includes(q)) ||
                p.dni.includes(q)
            );
        }
        return resultado;
    }

    if (cargando || !docente) return null;

    const filtradas = filtrarPreinscripciones();
    const totalGeneral = preinscripciones.length;
    const confirmados = preinscripciones.filter(p => p.estado === 'confirmado').length;
    const pendientes = preinscripciones.filter(p => p.estado === 'preinscrito').length;

    return (
        <Sidebar docente={docente} titulo="Gestión de Inscripciones FP">
            <div>
                {mensaje && (
                    <div style={{
                        background: mensaje.tipo === 'ok' ? '#f0fdf4' : mensaje.tipo === 'error' ? '#fef2f2' : '#eff6ff',
                        border: `1px solid ${mensaje.tipo === 'ok' ? '#bbf7d0' : mensaje.tipo === 'error' ? '#fecaca' : '#bfdbfe'}`,
                        color: mensaje.tipo === 'ok' ? '#15803d' : mensaje.tipo === 'error' ? '#b91c1c' : '#1e40af',
                        padding: 14,
                        borderRadius: 8,
                        marginBottom: 20,
                        fontSize: 14
                    }}>
                        {mensaje.texto}
                    </div>
                )}

                {/* NAVEGACIÓN POR TABS */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '2px solid var(--border)' }}>
                    {[
                        { id: 'dashboard', label: 'Dashboard' },
                        { id: 'lista', label: 'Listado' },
                        { id: 'formulario', label: 'Nueva Pre-inscripción' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setVista(tab.id)}
                            style={{
                                padding: '12px 20px',
                                background: vista === tab.id ? 'var(--accent)' : 'transparent',
                                color: vista === tab.id ? '#fff' : 'var(--text-muted)',
                                border: 'none',
                                borderBottom: vista === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                                fontSize: 14,
                                fontWeight: vista === tab.id ? 600 : 400,
                                cursor: 'pointer',
                                marginBottom: -2
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* VISTA: DASHBOARD */}
                {vista === 'dashboard' && (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total pre-inscriptos</div>
                                <div style={{ fontSize: 32, fontWeight: 700 }}>{totalGeneral}</div>
                            </div>
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 20 }}>
                                <div style={{ fontSize: 12, color: '#15803d', marginBottom: 4 }}>Inscripciones confirmadas</div>
                                <div style={{ fontSize: 32, fontWeight: 700, color: '#15803d' }}>{confirmados}</div>
                            </div>
                            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: 20 }}>
                                <div style={{ fontSize: 12, color: '#92400e', marginBottom: 4 }}>Pendientes de confirmación</div>
                                <div style={{ fontSize: 32, fontWeight: 700, color: '#92400e' }}>{pendientes}</div>
                            </div>
                        </div>

                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Cupos por curso</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                            {cursosFP.map(curso => {
                                const preinscCurso = preinscripciones.filter(p => p.fp_curso_id === curso.id);
                                const confirmadosCurso = preinscCurso.filter(p => p.estado === 'confirmado').length;
                                const porcentaje = curso.cupo > 0 ? Math.round((confirmadosCurso / curso.cupo) * 100) : 0;

                                return (
                                    <div key={curso.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{curso.nombre}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Cupo: {curso.cupo}</div>
                                        <div style={{ background: 'var(--surface-2)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                                            <div style={{ width: `${porcentaje}%`, height: '100%', background: porcentaje >= 100 ? '#ef4444' : porcentaje >= 75 ? '#f59e0b' : '#15803d' }} />
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, textAlign: 'right' }}>
                                            {confirmadosCurso}/{curso.cupo} ({porcentaje}%)
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* VISTA: LISTADO */}
                {vista === 'lista' && (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
                            <select value={filtroCurso} onChange={(e) => setFiltroCurso(e.target.value)} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }}>
                                <option value="todos">Todos los cursos</option>
                                {cursosFP.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }}>
                                <option value="todos">Todos los estados</option>
                                <option value="preinscrito">Pre-inscripto</option>
                                <option value="confirmado">Confirmado</option>
                            </select>
                            <input type="text" placeholder="Buscar por nombre o DNI..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                        </div>

                        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                <thead>
                                    <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
                                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Alumno</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>DNI</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Curso</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Expediente</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Estado</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtradas.map((p, idx) => (
                                        <tr key={p.id} style={{ borderBottom: idx < filtradas.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                            <td style={{ padding: '12px 16px' }}>{p.apellido ? `${p.apellido}, ${p.nombre}` : p.nombre}</td>
                                            <td style={{ padding: '12px 16px' }}>{p.dni}</td>
                                            <td style={{ padding: '12px 16px' }}>{cursosFP.find(c => c.id === p.fp_curso_id)?.nombre || '—'}</td>
                                            <td style={{ padding: '12px 16px', fontSize: 12 }}>{p.numero_expediente || '—'}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    padding: '4px 12px',
                                                    borderRadius: 20,
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    background: p.estado === 'confirmado' ? '#dcfce7' : '#fef3c7',
                                                    color: p.estado === 'confirmado' ? '#15803d' : '#92400e'
                                                }}>
                                                    {p.estado === 'confirmado' ? 'Confirmado' : 'Pendiente'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                <button onClick={() => { setPreinscSeleccionada(p); cargarDocumentos(p.id); setVista('documentos'); }} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginRight: 6 }}>
                                                    Documentos
                                                </button>
                                                {p.estado === 'preinscrito' && (
                                                    <button onClick={() => confirmarInscripcion(p.id)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                                        Confirmar
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* VISTA: FORMULARIO */}
                {vista === 'formulario' && (
                    <div style={{ maxWidth: 800 }}>
                        <form onSubmit={handleSubmit} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Datos del alumno</h3>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Curso *</label>
                                    <select name="fp_curso_id" value={form.fp_curso_id} onChange={handleChange} required style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }}>
                                        <option value="">Seleccione...</option>
                                        {cursosFP.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.turno})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Apellido *</label>
                                    <input type="text" name="apellido" value={form.apellido} onChange={handleChange} required style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Nombre *</label>
                                    <input type="text" name="nombre" value={form.nombre} onChange={handleChange} required style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>DNI *</label>
                                    <input type="text" name="dni" value={form.dni} onChange={handleChange} required style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Fecha de nacimiento *</label>
                                    <input type="date" name="fecha_nac" value={form.fecha_nac} onChange={handleChange} required style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Nacionalidad *</label>
                                    <select name="nacionalidad" value={form.nacionalidad} onChange={handleChange} required style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }}>
                                        <option value="argentino">Argentino</option>
                                        <option value="naturalizado">Naturalizado</option>
                                        <option value="extranjero">Extranjero</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Teléfono *</label>
                                    <input type="tel" name="telefono" value={form.telefono} onChange={handleChange} required style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Email</label>
                                    <input type="email" name="email" value={form.email} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                                </div>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Domicilio</label>
                                <input type="text" name="domicilio" value={form.domicilio} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                            </div>

                            <button type="submit" style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                                Registrar Pre-inscripción
                            </button>
                        </form>
                    </div>
                )}

                {/* VISTA: GESTIÓN DE DOCUMENTOS */}
                {vista === 'documentos' && preinscSeleccionada && (
                    <div style={{ maxWidth: 800 }}>
                        <div style={{ marginBottom: 24 }}>
                            <button onClick={() => setVista('lista')} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', marginBottom: 16 }}>
                                ← Volver al listado
                            </button>
                            <h3 style={{ fontSize: 18, fontWeight: 700 }}>
                                Gestión de Documentos - {preinscSeleccionada.apellido}, {preinscSeleccionada.nombre}
                            </h3>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Expediente: {preinscSeleccionada.numero_expediente}</p>
                        </div>

                        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
                            {DOCUMENTOS_REQUERIDOS.map(doc => {
                                const existe = documentosExistentes[doc.id];
                                return (
                                    <div key={doc.id} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{doc.nombre} {doc.obligatorio && <span style={{ color: '#ef4444', fontSize: 11 }}>*</span>}</div>
                                                {existe && (
                                                    <div style={{ fontSize: 12, color: '#15803d', marginTop: 4 }}>
                                                        ✓ {existe.nombre_archivo}
                                                        <a href={existe.url_drive} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8, color: '#3b82f6' }}>Ver archivo</a>
                                                    </div>
                                                )}
                                            </div>
                                            <label style={{ background: existe ? '#fef3c7' : '#3b82f6', color: '#fff', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-block' }}>
                                                {existe ? 'Reemplazar' : 'Subir archivo'}
                                                <input type="file" accept={doc.accept} onChange={(e) => e.target.files[0] && handleUpload(doc.id, e.target.files[0])} style={{ display: 'none' }} />
                                            </label>
                                        </div>
                                        {subiendo && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Subiendo...</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </Sidebar>
    );
}