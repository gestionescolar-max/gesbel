'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Sidebar from '@/components/Sidebar';

// Tu URL del Google Apps Script
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx_El5HOJaPAxDs_5QjU3kUsvaLFEpKGM_x-JkX8z22gixC-hrFJSMU9K31nbJuPss/exec';

export default function InscripcionesPage() {
    const { docente, cargando } = useDocente();
    const [vista, setVista] = useState('dashboard');
    const [inscripciones, setInscripciones] = useState([]);
    const [cursosFP, setCursosFP] = useState([]);
    const [inscSeleccionada, setInscSeleccionada] = useState(null);
    const [mensaje, setMensaje] = useState(null);

    // Filtros
    const [filtroCurso, setFiltroCurso] = useState('todos');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [busqueda, setBusqueda] = useState('');

    // Estado para carga de archivos
    const [archivo, setArchivo] = useState(null);
    const [subiendo, setSubiendo] = useState(false);
    const [tipoDocSeleccionado, setTipoDocSeleccionado] = useState('Documentación General');

    useEffect(() => {
        if (!docente) return;
        cargarDatos();
    }, [docente]);

    async function cargarDatos() {
        const [{ data: cursos }, { data: insc }] = await Promise.all([
            supabase.from('fp_cursos').select('id, nombre, anio, turno').order('nombre'),
            supabase.from('fp_inscripciones').select('*').order('creado_en', { ascending: false })
        ]);
        setCursosFP(cursos || []);
        setInscripciones(insc || []);
    }

    function handleChange(e) {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    }

    // --- LÓGICA DE CARGA DE ARCHIVOS A DRIVE ---
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    async function handleSubirArchivo() {
        if (!archivo || !inscSeleccionada) return;
        setSubiendo(true);
        setMensaje({ tipo: 'loading', texto: 'Subiendo archivo a Drive y guardando link...' });

        try {
            const base64 = await fileToBase64(archivo);

            // 1. Enviar al Apps Script
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                // Nota: Apps Script a veces requiere no enviar headers de Content-Type para evitar preflight CORS, 
                // el body JSON se parsea igual.
                body: JSON.stringify({
                    legajo: inscSeleccionada.legajo || `SIN-LEG-${inscSeleccionada.id}`,
                    nombre: inscSeleccionada.nombre,
                    tipo_documento: tipoDocSeleccionado,
                    archivo_base64: base64.split(',')[1], // Quitamos el prefijo "data:application/pdf;base64,"
                    nombre_archivo: `${tipoDocSeleccionado} - ${archivo.name}`
                })
            });

            const result = await response.json();

            if (!result.success) throw new Error(result.error || 'Error en el script de Google');

            // 2. Guardar el link de la carpeta en la tabla fp_inscripciones (para tenerlo siempre a mano)
            const { error: dbError } = await supabase
                .from('fp_inscripciones')
                .update({ url_carpeta_drive: result.url_carpeta })
                .eq('id', inscSeleccionada.id);

            if (dbError) throw dbError;

            setMensaje({ tipo: 'ok', texto: '¡Documento cargado exitosamente en la carpeta del alumno!' });
            setArchivo(null);
            cargarDatos(); // Recargar para ver el link actualizado

            setTimeout(() => {
                setMensaje(null);
                setInscSeleccionada(null); // Cerrar modal
            }, 3000);

        } catch (err) {
            console.error(err);
            setMensaje({ tipo: 'error', texto: `Error al subir: ${err.message}` });
        } finally {
            setSubiendo(false);
        }
    }

    async function confirmarInscripcion(id) {
        if (!confirm('¿Confirmar esta inscripción? El alumno pasará a estado "inscripto".')) return;

        const { error } = await supabase
            .from('fp_inscripciones')
            .update({
                estado: 'inscripto',
                fecha_confirmacion: new Date().toISOString().split('T')[0]
            })
            .eq('id', id);

        if (error) {
            setMensaje({ tipo: 'error', texto: error.message });
        } else {
            setMensaje({ tipo: 'ok', texto: 'Inscripción confirmada correctamente' });
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
            resultado = resultado.filter(p =>
                p.nombre.toLowerCase().includes(q) || (p.dni && p.dni.includes(q))
            );
        }
        return resultado;
    }

    if (cargando || !docente) return null;

    const filtradas = filtrarInscripciones();
    const totalGeneral = inscripciones.length;
    const inscriptos = inscripciones.filter(p => p.estado === 'inscripto' || p.estado === 'en_curso').length;
    const preinscritos = inscripciones.filter(p => p.estado === 'preinscrito').length;

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
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                    }}>
                        {mensaje.tipo === 'loading' && '⏳'}
                        {mensaje.tipo === 'ok' && '✅'}
                        {mensaje.tipo === 'error' && '❌'}
                        {mensaje.texto}
                    </div>
                )}

                {/* NAVEGACIÓN POR TABS */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '2px solid var(--border)' }}>
                    {[
                        { id: 'dashboard', label: 'Dashboard' },
                        { id: 'lista', label: 'Listado de Alumnos' },
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
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Total Registros</div>
                                <div style={{ fontSize: 32, fontWeight: 700 }}>{totalGeneral}</div>
                            </div>
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 20 }}>
                                <div style={{ fontSize: 12, color: '#15803d', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Inscriptos / En Curso</div>
                                <div style={{ fontSize: 32, fontWeight: 700, color: '#15803d' }}>{inscriptos}</div>
                            </div>
                            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: 20 }}>
                                <div style={{ fontSize: 12, color: '#92400e', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Pre-inscriptos</div>
                                <div style={{ fontSize: 32, fontWeight: 700, color: '#92400e' }}>{preinscritos}</div>
                            </div>
                        </div>

                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Inscripciones por curso</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                            {cursosFP.map(curso => {
                                const inscCurso = inscripciones.filter(p => p.fp_curso_id === curso.id);
                                const enCurso = inscCurso.filter(p => p.estado === 'en_curso' || p.estado === 'inscripto').length;

                                return (
                                    <div key={curso.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{curso.nombre}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{curso.turno} · {curso.anio}</div>
                                        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>{enCurso}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>alumnos activos</div>
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
                                <option value="inscripto">Inscripto</option>
                                <option value="en_curso">En curso</option>
                            </select>
                            <input type="text" placeholder="Buscar por nombre o DNI..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                        </div>

                        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                    <thead>
                                        <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
                                            <th style={{ padding: '12px 16px', textAlign: 'left' }}>Legajo</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left' }}>Alumno</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left' }}>DNI</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left' }}>Curso</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left' }}>Estado</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtradas.map((p, idx) => (
                                            <tr key={p.id} style={{ borderBottom: idx < filtradas.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                                <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{p.legajo || 'Pendiente'}</td>
                                                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{p.nombre}</td>
                                                <td style={{ padding: '12px 16px' }}>{p.dni || '—'}</td>
                                                <td style={{ padding: '12px 16px', fontSize: 13 }}>{cursosFP.find(c => c.id === p.fp_curso_id)?.nombre || '—'}</td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{
                                                        padding: '4px 12px',
                                                        borderRadius: 20,
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        background: p.estado === 'en_curso' || p.estado === 'inscripto' ? '#dcfce7' : '#fef3c7',
                                                        color: p.estado === 'en_curso' || p.estado === 'inscripto' ? '#15803d' : '#92400e'
                                                    }}>
                                                        {p.estado}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    <button
                                                        onClick={() => { setInscSeleccionada(p); setArchivo(null); }}
                                                        style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginRight: 6 }}
                                                    >
                                                        📁 Cargar Doc.
                                                    </button>
                                                    {p.url_carpeta_drive && (
                                                        <a href={p.url_carpeta_drive} target="_blank" rel="noopener noreferrer" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginRight: 6, textDecoration: 'none', display: 'inline-block' }}>
                                                            Ver Carpeta
                                                        </a>
                                                    )}
                                                    {p.estado === 'preinscrito' && (
                                                        <button onClick={() => confirmarInscripcion(p.id)} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                                            Confirmar
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filtradas.length === 0 && (
                                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron registros con estos filtros.</div>
                            )}
                        </div>
                    </div>
                )}

                {/* MODAL: CARGA DE DOCUMENTACIÓN */}
                {inscSeleccionada && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setInscSeleccionada(null)}>
                        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, maxWidth: 500, width: '100%' }} onClick={(e) => e.stopPropagation()}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Cargar Documentación Digital</h3>
                            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
                                Alumno: <strong>{inscSeleccionada.nombre}</strong> (Legajo: {inscSeleccionada.legajo || 'Pendiente'})
                            </p>

                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Tipo de documento</label>
                                <select value={tipoDocSeleccionado} onChange={(e) => setTipoDocSeleccionado(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }}>
                                    <option value="Documentación General">Documentación General</option>
                                    <option value="DNI">DNI</option>
                                    <option value="Certificado de Estudios">Certificado de Estudios</option>
                                    <option value="Certificado Médico">Certificado Médico</option>
                                    <option value="Comprobante de Pago">Comprobante de Pago / Cooperadora</option>
                                    <option value="Seguimiento Académico">Seguimiento Académico</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Seleccionar archivo (PDF, JPG, PNG)</label>
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => setArchivo(e.target.files[0])}
                                    style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px dashed var(--border-strong)', fontSize: 14, background: 'var(--surface-2)' }}
                                />
                                {archivo && <div style={{ fontSize: 12, color: '#15803d', marginTop: 6 }}>✅ {archivo.name} ({(archivo.size / 1024).toFixed(1)} KB)</div>}
                            </div>

                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button onClick={() => setInscSeleccionada(null)} style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border-strong)', padding: '10px 20px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSubirArchivo}
                                    disabled={subiendo || !archivo}
                                    style={{
                                        background: subiendo || !archivo ? 'var(--text-muted)' : '#3b82f6',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: 6,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        cursor: subiendo || !archivo ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {subiendo ? 'Subiendo a Drive...' : 'Guardar en Carpeta del Alumno'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Sidebar>
    );
}