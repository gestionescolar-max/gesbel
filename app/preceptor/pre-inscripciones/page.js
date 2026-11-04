'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Sidebar from '@/components/Sidebar';

// Documentos requeridos
const DOCUMENTOS_REQUERIDOS = [
    { id: 'doc_dni', nombre: 'Copia de DNI', obligatorio: true },
    { id: 'doc_foto', nombre: 'Foto 4x4', obligatorio: true },
    { id: 'doc_certificado_estudios', nombre: 'Certificado de estudios', obligatorio: true },
    { id: 'doc_cuil', nombre: 'Constancia de CUIL/CUIT', obligatorio: true },
    { id: 'doc_certificado_medico', nombre: 'Certificado médico', obligatorio: true },
    { id: 'doc_libreta_trabajo', nombre: 'Libreta de trabajo', obligatorio: false }
];

const CONCEPTOS_PAGO = ['Inscripción', 'Cuota 1', 'Cuota 2', 'Cuota 3', 'Cooperadora', 'Otro'];
const FORMAS_PAGO = ['Efectivo', 'Transferencia', 'Débito automático'];

export default function PreInscripcionesPage() {
    const { docente, cargando } = useDocente();
    const [preinscripciones, setPreinscripciones] = useState([]);
    const [cursosFP, setCursosFP] = useState([]);
    const [filtroCurso, setFiltroCurso] = useState('todos');
    const [filtroDoc, setFiltroDoc] = useState('todos');
    const [busqueda, setBusqueda] = useState('');
    const [mensaje, setMensaje] = useState(null);

    // Modales
    const [modalDocs, setModalDocs] = useState(null);
    const [modalPagos, setModalPagos] = useState(null);
    const [docForm, setDocForm] = useState({});
    const [linkDrive, setLinkDrive] = useState('');
    const [pagoForm, setPagoForm] = useState({ concepto: 'Inscripción', monto: '', fecha_pago: '', numero_recibo: '', forma_pago: 'Efectivo', observaciones: '' });

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

    async function abrirModalDocs(preinsc) {
        setModalDocs(preinsc);
        setDocForm({
            doc_dni: preinsc.doc_dni || false,
            doc_foto: preinsc.doc_foto || false,
            doc_certificado_estudios: preinsc.doc_certificado_estudios || false,
            doc_cuil: preinsc.doc_cuil || false,
            doc_certificado_medico: preinsc.doc_certificado_medico || false,
            doc_libreta_trabajo: preinsc.doc_libreta_trabajo || false
        });
        setLinkDrive(preinsc.link_carpeta_drive || '');
    }

    async function guardarDocumentos() {
        if (!modalDocs) return;
        const { error } = await supabase
            .from('fp_preinscripciones')
            .update({
                ...docForm,
                link_carpeta_drive: linkDrive,
                documentacion_completa: DOCUMENTOS_REQUERIDOS.filter(d => d.obligatorio).every(d => docForm[d.id]),
                updated_at: new Date().toISOString()
            })
            .eq('id', modalDocs.id);

        if (error) {
            setMensaje({ tipo: 'error', texto: error.message });
        } else {
            setMensaje({ tipo: 'ok', texto: 'Documentación actualizada correctamente' });
            cargarDatos();
            setModalDocs(null);
            setTimeout(() => setMensaje(null), 3000);
        }
    }

    async function abrirModalPagos(preinsc) {
        setModalPagos(preinsc);
        setPagoForm({ concepto: 'Inscripción', monto: '', fecha_pago: new Date().toISOString().split('T')[0], numero_recibo: '', forma_pago: 'Efectivo', observaciones: '' });
    }

    async function registrarPago() {
        if (!modalPagos || !pagoForm.monto || !pagoForm.fecha_pago) {
            setMensaje({ tipo: 'error', texto: 'Completá monto y fecha' });
            return;
        }

        const { error } = await supabase
            .from('fp_pagos')
            .insert({
                preinscripcion_id: modalPagos.id,
                ...pagoForm,
                monto: parseFloat(pagoForm.monto),
                creado_por: docente.id
            });

        if (error) {
            setMensaje({ tipo: 'error', texto: error.message });
        } else {
            setMensaje({ tipo: 'ok', texto: 'Pago registrado correctamente' });
            setPagoForm({ concepto: 'Inscripción', monto: '', fecha_pago: new Date().toISOString().split('T')[0], numero_recibo: '', forma_pago: 'Efectivo', observaciones: '' });
            setTimeout(() => setMensaje(null), 3000);
        }
    }

    function calcularEstadisticas() {
        const stats = {};
        cursosFP.forEach(curso => {
            const preinscCurso = preinscripciones.filter(p => p.fp_curso_id === curso.id);
            const conDocCompleta = preinscCurso.filter(p => p.documentacion_completa).length;
            const pendientes = preinscCurso.filter(p => !p.documentacion_completa).length;
            const cuposOcupados = preinscCurso.filter(p => p.documentacion_completa).length;
            const cuposLibres = Math.max(0, (curso.cupo || 0) - cuposOcupados);

            stats[curso.id] = {
                total: preinscCurso.length,
                conDocCompleta,
                pendientes,
                cuposLibres,
                cupoTotal: curso.cupo || 0
            };
        });
        return stats;
    }

    function filtrarPreinscripciones() {
        let resultado = [...preinscripciones];

        if (filtroCurso !== 'todos') {
            resultado = resultado.filter(p => p.fp_curso_id === Number(filtroCurso));
        }

        if (filtroDoc === 'completa') {
            resultado = resultado.filter(p => p.documentacion_completa);
        } else if (filtroDoc === 'pendiente') {
            resultado = resultado.filter(p => !p.documentacion_completa);
        }

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

    const stats = calcularEstadisticas();
    const filtradas = filtrarPreinscripciones();

    const totalGeneral = preinscripciones.length;
    const conDocCompletaGeneral = preinscripciones.filter(p => p.documentacion_completa).length;
    const pendientesGeneral = totalGeneral - conDocCompletaGeneral;

    return (
        <Sidebar docente={docente} titulo="Gestión de Pre-inscripciones">
            <div>
                <div style={{ marginBottom: 24 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Pre-inscripciones Formación Profesional</h2>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                        Gestioná las pre-inscripciones, documentación y pagos.
                    </p>
                </div>

                {mensaje && (
                    <div style={{
                        background: mensaje.tipo === 'ok' ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${mensaje.tipo === 'ok' ? '#bbf7d0' : '#fecaca'}`,
                        color: mensaje.tipo === 'ok' ? '#15803d' : '#b91c1c',
                        padding: 14,
                        borderRadius: 8,
                        marginBottom: 20,
                        fontSize: 14
                    }}>
                        {mensaje.texto}
                    </div>
                )}

                {/* ESTADÍSTICAS GENERALES */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total pre-inscriptos</div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)' }}>{totalGeneral}</div>
                    </div>
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 20 }}>
                        <div style={{ fontSize: 12, color: '#15803d', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Documentación completa</div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: '#15803d' }}>{conDocCompletaGeneral}</div>
                    </div>
                    <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: 20 }}>
                        <div style={{ fontSize: 12, color: '#92400e', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Pendientes de documentación</div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: '#92400e' }}>{pendientesGeneral}</div>
                    </div>
                </div>

                {/* ESTADÍSTICAS POR CURSO */}
                <div style={{ marginBottom: 32 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Estado por curso</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                        {cursosFP.map(curso => {
                            const s = stats[curso.id] || { total: 0, conDocCompleta: 0, pendientes: 0, cuposLibres: curso.cupo || 0, cupoTotal: curso.cupo || 0 };
                            const porcentajeOcupado = s.cupoTotal > 0 ? Math.round((s.conDocCompleta / s.cupoTotal) * 100) : 0;

                            return (
                                <div key={curso.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{curso.nombre}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Cupo: {s.cupoTotal}</div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                                        <span style={{ color: '#15803d' }}>{s.conDocCompleta} completos</span>
                                        <span style={{ color: '#92400e' }}>{s.pendientes} pendientes</span>
                                    </div>

                                    <div style={{ background: 'var(--surface-2)', borderRadius: 6, height: 8, overflow: 'hidden', marginBottom: 8 }}>
                                        <div style={{
                                            width: `${porcentajeOcupado}%`,
                                            height: '100%',
                                            background: porcentajeOcupado >= 100 ? '#ef4444' : porcentajeOcupado >= 75 ? '#f59e0b' : '#15803d',
                                            transition: 'width 0.3s'
                                        }} />
                                    </div>

                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
                                        {s.cuposLibres} cupos libres ({porcentajeOcupado}%)
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* FILTROS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Curso</label>
                        <select value={filtroCurso} onChange={(e) => setFiltroCurso(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }}>
                            <option value="todos">Todos los cursos</option>
                            {cursosFP.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Documentación</label>
                        <select value={filtroDoc} onChange={(e) => setFiltroDoc(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }}>
                            <option value="todos">Todos</option>
                            <option value="completa">Completa</option>
                            <option value="pendiente">Pendiente</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Buscar</label>
                        <input type="text" placeholder="Nombre, apellido o DNI..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                    </div>
                </div>

                {/* TABLA */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                                <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Alumno</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)' }}>DNI</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Curso</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Expediente</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Documentación</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtradas.map((p, idx) => {
                                    const curso = cursosFP.find(c => c.id === p.fp_curso_id);
                                    return (
                                        <tr key={p.id} style={{ borderBottom: idx < filtradas.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ fontWeight: 600 }}>{p.apellido ? `${p.apellido}, ${p.nombre}` : p.nombre}</div>
                                                {p.telefono && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.telefono}</div>}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>{p.dni}</td>
                                            <td style={{ padding: '12px 16px', fontSize: 13 }}>{curso?.nombre || '—'}</td>
                                            <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{p.numero_expediente || '—'}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '4px 12px',
                                                    borderRadius: 20,
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    background: p.documentacion_completa ? '#dcfce7' : '#fef3c7',
                                                    color: p.documentacion_completa ? '#15803d' : '#92400e'
                                                }}>
                                                    {p.documentacion_completa ? 'Completa' : 'Pendiente'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                <button onClick={() => abrirModalDocs(p)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginRight: 6 }}>
                                                    Documentos
                                                </button>
                                                <button onClick={() => abrirModalPagos(p)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginRight: 6 }}>
                                                    Pago
                                                </button>
                                                <button onClick={() => window.open(`/preceptor/comprobante/${p.id}`, '_blank')} style={{ background: '#6b7280', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                                    Comprobante
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {filtradas.length === 0 && (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No hay pre-inscripciones</div>
                    )}
                </div>

                {/* MODAL DOCUMENTOS */}
                {modalDocs && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setModalDocs(null)}>
                        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, maxWidth: 500, width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Documentación - {modalDocs.apellido}, {modalDocs.nombre}</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Expediente: {modalDocs.numero_expediente || 'Pendiente'}</p>

                            <div style={{ marginBottom: 20 }}>
                                {DOCUMENTOS_REQUERIDOS.map(doc => (
                                    <label key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 6, marginBottom: 8, cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={docForm[doc.id] || false}
                                            onChange={(e) => setDocForm(prev => ({ ...prev, [doc.id]: e.target.checked }))}
                                        />
                                        <span style={{ fontSize: 14 }}>{doc.nombre} {doc.obligatorio && <span style={{ color: '#ef4444', fontSize: 11 }}>*</span>}</span>
                                    </label>
                                ))}
                            </div>

                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Link de carpeta Google Drive (opcional)</label>
                                <input type="url" value={linkDrive} onChange={(e) => setLinkDrive(e.target.value)} placeholder="https://drive.google.com/..." style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                            </div>

                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button onClick={() => setModalDocs(null)} style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border-strong)', padding: '10px 20px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                                <button onClick={guardarDocumentos} style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Guardar</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL PAGOS */}
                {modalPagos && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setModalPagos(null)}>
                        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, maxWidth: 500, width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Registrar Pago</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>{modalPagos.apellido}, {modalPagos.nombre} - {cursosFP.find(c => c.id === modalPagos.fp_curso_id)?.nombre}</p>

                            <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Concepto *</label>
                                    <select value={pagoForm.concepto} onChange={(e) => setPagoForm(prev => ({ ...prev, concepto: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }}>
                                        {CONCEPTOS_PAGO.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Monto *</label>
                                    <input type="number" value={pagoForm.monto} onChange={(e) => setPagoForm(prev => ({ ...prev, monto: e.target.value }))} placeholder="0.00" style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Fecha *</label>
                                    <input type="date" value={pagoForm.fecha_pago} onChange={(e) => setPagoForm(prev => ({ ...prev, fecha_pago: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>N° de Recibo</label>
                                    <input type="text" value={pagoForm.numero_recibo} onChange={(e) => setPagoForm(prev => ({ ...prev, numero_recibo: e.target.value }))} placeholder="Opcional" style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Forma de pago</label>
                                    <select value={pagoForm.forma_pago} onChange={(e) => setPagoForm(prev => ({ ...prev, forma_pago: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }}>
                                        {FORMAS_PAGO.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Observaciones</label>
                                    <textarea value={pagoForm.observaciones} onChange={(e) => setPagoForm(prev => ({ ...prev, observaciones: e.target.value }))} rows={2} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14, resize: 'vertical' }} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button onClick={() => setModalPagos(null)} style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border-strong)', padding: '10px 20px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                                <button onClick={registrarPago} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Registrar Pago</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Sidebar>
    );
}