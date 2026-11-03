'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Sidebar from '@/components/Sidebar';

export default function PreInscripcionesPage() {
    const { docente, cargando } = useDocente();
    const [preinscripciones, setPreinscripciones] = useState([]);
    const [cursosFP, setCursosFP] = useState([]);
    const [filtroCurso, setFiltroCurso] = useState('todos');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [busqueda, setBusqueda] = useState('');
    const [mensaje, setMensaje] = useState(null);

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

    async function toggleDocumentacion(id, estadoActual) {
        const { error } = await supabase
            .from('fp_preinscripciones')
            .update({
                documentacion_completa: !estadoActual,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            setMensaje({ tipo: 'error', texto: error.message });
        } else {
            setMensaje({ tipo: 'ok', texto: !estadoActual ? 'Documentación marcada como completa' : 'Documentación marcada como pendiente' });
            cargarDatos();
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

        if (filtroEstado === 'completa') {
            resultado = resultado.filter(p => p.documentacion_completa);
        } else if (filtroEstado === 'pendiente') {
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
                        Gestioná las pre-inscripciones y marcá cuando el alumno entregue la documentación completa.
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
                                        <span style={{ color: '#15803d' }}>✓ {s.conDocCompleta} completos</span>
                                        <span style={{ color: '#92400e' }}>⏳ {s.pendientes} pendientes</span>
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
                        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }}>
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
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Documentación</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Fecha</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Acción</th>
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
                                            <td style={{ padding: '12px 16px', fontSize: 13 }}>{p.fecha_preinscripcion || '—'}</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                <button
                                                    onClick={() => toggleDocumentacion(p.id, p.documentacion_completa)}
                                                    style={{
                                                        background: p.documentacion_completa ? '#fef3c7' : '#dcfce7',
                                                        color: p.documentacion_completa ? '#92400e' : '#15803d',
                                                        border: 'none',
                                                        padding: '6px 12px',
                                                        borderRadius: 6,
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {p.documentacion_completa ? 'Marcar pendiente' : 'Marcar completa'}
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
            </div>
        </Sidebar>
    );
}