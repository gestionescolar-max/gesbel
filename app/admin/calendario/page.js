'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Sidebar from '@/components/Sidebar';

const Iconos = {
    calendario: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    feriado: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>,
    suspension: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>,
    agregar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
    eliminar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
    check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
};

const DIAS_SEMANA = [
    { valor: 'lunes', etiqueta: 'Lunes' },
    { valor: 'martes', etiqueta: 'Martes' },
    { valor: 'miercoles', etiqueta: 'Miércoles' },
    { valor: 'jueves', etiqueta: 'Jueves' },
    { valor: 'viernes', etiqueta: 'Viernes' },
    { valor: 'sabado', etiqueta: 'Sábado' },
    { valor: 'domingo', etiqueta: 'Domingo' }
];

const MODALIDADES = [
    { valor: 'fp', etiqueta: 'Formación Profesional' },
    { valor: 'secundaria', etiqueta: 'Secundaria' },
    { valor: 'tecnica', etiqueta: 'Técnica' }
];

const ALCANCES_FERIADO = ['nacional', 'provincial', 'local'];

function formatearFechaLarga(fechaISO) {
    if (!fechaISO) return '—';
    const [anio, mes, dia] = fechaISO.split('-').map(Number);
    const d = new Date(anio, mes - 1, dia);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatearFechaCorta(fechaISO) {
    if (!fechaISO) return '—';
    const [anio, mes, dia] = fechaISO.split('-').map(Number);
    const d = new Date(anio, mes - 1, dia);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function CalendarioPage() {
    const { docente, cargando } = useDocente();
    const [vista, setVista] = useState('academico');
    const [mensaje, setMensaje] = useState(null);
    const [procesando, setProcesando] = useState(false);

    // Calendario académico
    const [calendarios, setCalendarios] = useState([]);
    const [formCalendario, setFormCalendario] = useState({
        anio: new Date().getFullYear(),
        modalidad: 'fp',
        fecha_inicio: '',
        fecha_fin: '',
        dias_clase: []
    });

    // Feriados
    const [feriados, setFeriados] = useState([]);
    const [formFeriado, setFormFeriado] = useState({
        fecha: '',
        nombre: '',
        alcance: 'nacional',
        anio: new Date().getFullYear()
    });

    // Suspensiones
    const [suspensiones, setSuspensiones] = useState([]);
    const [cursos, setCursos] = useState([]);
    const [formSuspension, setFormSuspension] = useState({
        fp_curso_id: '',
        fecha: '',
        motivo: ''
    });

    // Filtros
    const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear());

    useEffect(() => {
        if (!docente) return;
        cargarTodo();
    }, [docente]);

    useEffect(() => {
        if (vista === 'feriados') cargarFeriados();
        if (vista === 'suspensiones') {
            cargarCursos();
            cargarSuspensiones();
        }
        if (vista === 'academico') cargarCalendarios();
    }, [vista, filtroAnio]);

    async function cargarTodo() {
        await cargarCalendarios();
        await cargarFeriados();
        await cargarCursos();
    }

    async function cargarCalendarios() {
        try {
            const { data, error } = await supabase
                .from('calendario_academico')
                .select('*')
                .eq('anio', filtroAnio)
                .order('modalidad');
            if (error) throw error;
            setCalendarios(data || []);
        } catch (err) {
            console.error('Error al cargar calendarios:', err);
        }
    }

    async function cargarFeriados() {
        try {
            const { data, error } = await supabase
                .from('calendario_feriados')
                .select('*')
                .eq('anio', filtroAnio)
                .order('fecha');
            if (error) throw error;
            setFeriados(data || []);
        } catch (err) {
            console.error('Error al cargar feriados:', err);
        }
    }

    async function cargarCursos() {
        try {
            const { data, error } = await supabase
                .from('fp_cursos')
                .select('id, nombre, anio, turno')
                .eq('anio', filtroAnio)
                .order('nombre');
            if (error) throw error;
            setCursos(data || []);
        } catch (err) {
            console.error('Error al cargar cursos:', err);
        }
    }

    async function cargarSuspensiones() {
        try {
            const { data, error } = await supabase
                .from('calendario_suspensiones')
                .select('*, fp_cursos(nombre)')
                .eq('fp_cursos.anio', filtroAnio)
                .order('fecha', { ascending: false });
            if (error) throw error;
            setSuspensiones(data || []);
        } catch (err) {
            console.error('Error al cargar suspensiones:', err);
        }
    }

    // === CALENDARIO ACADÉMICO ===
    function toggleDia(dia) {
        setFormCalendario(prev => {
            const dias = prev.dias_clase.includes(dia)
                ? prev.dias_clase.filter(d => d !== dia)
                : [...prev.dias_clase, dia];
            return { ...prev, dias_clase: dias };
        });
    }

    async function guardarCalendario() {
        if (!formCalendario.fecha_inicio || !formCalendario.fecha_fin || formCalendario.dias_clase.length === 0) {
            setMensaje({ tipo: 'error', texto: 'Completá fecha inicio, fecha fin y al menos un día de clase.' });
            return;
        }
        setProcesando(true);
        try {
            const { error } = await supabase
                .from('calendario_academico')
                .upsert({
                    anio: formCalendario.anio,
                    modalidad: formCalendario.modalidad,
                    fecha_inicio: formCalendario.fecha_inicio,
                    fecha_fin: formCalendario.fecha_fin,
                    dias_clase: formCalendario.dias_clase
                }, { onConflict: 'anio, modalidad' });
            if (error) throw error;
            setMensaje({ tipo: 'ok', texto: 'Calendario académico guardado correctamente.' });
            await cargarCalendarios();
            setTimeout(() => setMensaje(null), 3000);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        } finally {
            setProcesando(false);
        }
    }

    async function eliminarCalendario(id) {
        if (!confirm('¿Eliminar este calendario académico?')) return;
        try {
            const { error } = await supabase.from('calendario_academico').delete().eq('id', id);
            if (error) throw error;
            setMensaje({ tipo: 'ok', texto: 'Calendario eliminado.' });
            await cargarCalendarios();
            setTimeout(() => setMensaje(null), 3000);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        }
    }

    // === FERIADOS ===
    async function guardarFeriado() {
        if (!formFeriado.fecha || !formFeriado.nombre) {
            setMensaje({ tipo: 'error', texto: 'Completá fecha y nombre del feriado.' });
            return;
        }
        setProcesando(true);
        try {
            const { error } = await supabase
                .from('calendario_feriados')
                .insert({
                    fecha: formFeriado.fecha,
                    nombre: formFeriado.nombre,
                    alcance: formFeriado.alcance,
                    anio: formFeriado.anio
                });
            if (error) throw error;
            setMensaje({ tipo: 'ok', texto: 'Feriado agregado correctamente.' });
            setFormFeriado({ fecha: '', nombre: '', alcance: 'nacional', anio: formFeriado.anio });
            await cargarFeriados();
            setTimeout(() => setMensaje(null), 3000);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        } finally {
            setProcesando(false);
        }
    }

    async function eliminarFeriado(id) {
        if (!confirm('¿Eliminar este feriado?')) return;
        try {
            const { error } = await supabase.from('calendario_feriados').delete().eq('id', id);
            if (error) throw error;
            setMensaje({ tipo: 'ok', texto: 'Feriado eliminado.' });
            await cargarFeriados();
            setTimeout(() => setMensaje(null), 3000);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        }
    }

    // === SUSPENSIONES ===
    async function guardarSuspension() {
        if (!formSuspension.fp_curso_id || !formSuspension.fecha) {
            setMensaje({ tipo: 'error', texto: 'Seleccioná un curso y una fecha.' });
            return;
        }
        setProcesando(true);
        try {
            const { error } = await supabase
                .from('calendario_suspensiones')
                .insert({
                    fp_curso_id: Number(formSuspension.fp_curso_id),
                    fecha: formSuspension.fecha,
                    motivo: formSuspension.motivo || null
                });
            if (error) throw error;
            setMensaje({ tipo: 'ok', texto: 'Suspensión registrada correctamente.' });
            setFormSuspension({ fp_curso_id: '', fecha: '', motivo: '' });
            await cargarSuspensiones();
            setTimeout(() => setMensaje(null), 3000);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        } finally {
            setProcesando(false);
        }
    }

    async function eliminarSuspension(id) {
        if (!confirm('¿Eliminar esta suspensión?')) return;
        try {
            const { error } = await supabase.from('calendario_suspensiones').delete().eq('id', id);
            if (error) throw error;
            setMensaje({ tipo: 'ok', texto: 'Suspensión eliminada.' });
            await cargarSuspensiones();
            setTimeout(() => setMensaje(null), 3000);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        }
    }

    if (cargando || !docente) return null;

    const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' };
    const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, background: '#fff', color: '#1e3a8a' };

    return (
        <Sidebar docente={docente} titulo="Calendario Académico">
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>

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

                {/* Filtro de año global */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <label style={labelStyle}>Año lectivo</label>
                        <select value={filtroAnio} onChange={(e) => setFiltroAnio(Number(e.target.value))} style={inputStyle}>
                            {[2024, 2025, 2026, 2027, 2028].map(a => (
                                <option key={a} value={a}>{a}{a === new Date().getFullYear() ? ' (vigente)' : ''}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Pestañas */}
                <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #e5e7eb', flexWrap: 'wrap' }}>
                    <button onClick={() => setVista('academico')} style={{ padding: '12px 24px', background: vista === 'academico' ? '#1e3a8a' : 'transparent', color: vista === 'academico' ? '#fff' : '#4b5563', border: 'none', borderBottom: vista === 'academico' ? '2px solid #1e3a8a' : '2px solid transparent', fontSize: 14, fontWeight: vista === 'academico' ? 600 : 400, cursor: 'pointer', marginBottom: -2, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {Iconos.calendario} Calendario Académico
                    </button>
                    <button onClick={() => setVista('feriados')} style={{ padding: '12px 24px', background: vista === 'feriados' ? '#1e3a8a' : 'transparent', color: vista === 'feriados' ? '#fff' : '#4b5563', border: 'none', borderBottom: vista === 'feriados' ? '2px solid #1e3a8a' : '2px solid transparent', fontSize: 14, fontWeight: vista === 'feriados' ? 600 : 400, cursor: 'pointer', marginBottom: -2, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {Iconos.feriado} Feriados
                    </button>
                    <button onClick={() => setVista('suspensiones')} style={{ padding: '12px 24px', background: vista === 'suspensiones' ? '#1e3a8a' : 'transparent', color: vista === 'suspensiones' ? '#fff' : '#4b5563', border: 'none', borderBottom: vista === 'suspensiones' ? '2px solid #1e3a8a' : '2px solid transparent', fontSize: 14, fontWeight: vista === 'suspensiones' ? 600 : 400, cursor: 'pointer', marginBottom: -2, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {Iconos.suspension} Suspensiones
                    </button>
                </div>

                {/* ===== CALENDARIO ACADÉMICO ===== */}
                {vista === 'academico' && (
                    <div>
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, marginBottom: 24 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {calendarios.length > 0 ? 'Editar calendario' : 'Nuevo calendario académico'}
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                                <div>
                                    <label style={labelStyle}>Año</label>
                                    <input type="number" value={formCalendario.anio} onChange={(e) => setFormCalendario(prev => ({ ...prev, anio: Number(e.target.value) }))} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Modalidad</label>
                                    <select value={formCalendario.modalidad} onChange={(e) => setFormCalendario(prev => ({ ...prev, modalidad: e.target.value }))} style={inputStyle}>
                                        {MODALIDADES.map(m => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Fecha inicio</label>
                                    <input type="date" value={formCalendario.fecha_inicio} onChange={(e) => setFormCalendario(prev => ({ ...prev, fecha_inicio: e.target.value }))} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Fecha fin</label>
                                    <input type="date" value={formCalendario.fecha_fin} onChange={(e) => setFormCalendario(prev => ({ ...prev, fecha_fin: e.target.value }))} style={inputStyle} />
                                </div>
                            </div>

                            <div style={{ marginTop: 20 }}>
                                <label style={labelStyle}>Días de clase</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {DIAS_SEMANA.map(d => (
                                        <button
                                            key={d.valor}
                                            type="button"
                                            onClick={() => toggleDia(d.valor)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: 6,
                                                border: `1px solid ${formCalendario.dias_clase.includes(d.valor) ? '#1e3a8a' : '#d1d5db'}`,
                                                background: formCalendario.dias_clase.includes(d.valor) ? '#1e3a8a' : '#fff',
                                                color: formCalendario.dias_clase.includes(d.valor) ? '#fff' : '#4b5563',
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {d.etiqueta}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={guardarCalendario} disabled={procesando} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: procesando ? '#9ca3af' : '#1e3a8a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: procesando ? 'not-allowed' : 'pointer' }}>
                                    {Iconos.check} {procesando ? 'Guardando...' : 'Guardar calendario'}
                                </button>
                            </div>
                        </div>

                        {/* Listado de calendarios */}
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                                <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Calendarios del año {filtroAnio}
                                </h3>
                            </div>
                            {calendarios.length === 0 ? (
                                <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>No hay calendarios configurados para {filtroAnio}.</div>
                            ) : (
                                <div className="vista-desktop">
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                        <thead>
                                            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Modalidad</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Período</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Días de clase</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {calendarios.map((c, idx) => (
                                                <tr key={c.id} style={{ borderBottom: idx < calendarios.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e3a8a' }}>{MODALIDADES.find(m => m.valor === c.modalidad)?.etiqueta || c.modalidad}</td>
                                                    <td style={{ padding: '12px 16px', color: '#4b5563' }}>{formatearFechaCorta(c.fecha_inicio)} — {formatearFechaCorta(c.fecha_fin)}</td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                            {c.dias_clase.map(d => (
                                                                <span key={d} style={{ padding: '2px 8px', background: '#eff6ff', color: '#1e40af', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>
                                                                    {DIAS_SEMANA.find(ds => ds.valor === d)?.etiqueta}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                        <button onClick={() => eliminarCalendario(c.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff', color: '#b91c1c', border: '1px solid #b91c1c', padding: '5px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                                                            {Iconos.eliminar}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ===== FERIADOS ===== */}
                {vista === 'feriados' && (
                    <div>
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, marginBottom: 24 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Agregar feriado
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                                <div>
                                    <label style={labelStyle}>Fecha</label>
                                    <input type="date" value={formFeriado.fecha} onChange={(e) => setFormFeriado(prev => ({ ...prev, fecha: e.target.value }))} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Nombre</label>
                                    <input type="text" value={formFeriado.nombre} onChange={(e) => setFormFeriado(prev => ({ ...prev, nombre: e.target.value }))} placeholder="Ej: Día de la Independencia" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Alcance</label>
                                    <select value={formFeriado.alcance} onChange={(e) => setFormFeriado(prev => ({ ...prev, alcance: e.target.value }))} style={inputStyle}>
                                        {ALCANCES_FERIADO.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={guardarFeriado} disabled={procesando} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: procesando ? '#9ca3af' : '#1e3a8a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: procesando ? 'not-allowed' : 'pointer' }}>
                                    {Iconos.agregar} {procesando ? 'Guardando...' : 'Agregar feriado'}
                                </button>
                            </div>
                        </div>

                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                                <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Feriados del año {filtroAnio} ({feriados.length})
                                </h3>
                            </div>
                            {feriados.length === 0 ? (
                                <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>No hay feriados registrados para {filtroAnio}.</div>
                            ) : (
                                <div className="vista-desktop">
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                        <thead>
                                            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Fecha</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Nombre</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Alcance</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {feriados.map((f, idx) => (
                                                <tr key={f.id} style={{ borderBottom: idx < feriados.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e3a8a', fontVariantNumeric: 'tabular-nums' }}>{formatearFechaLarga(f.fecha)}</td>
                                                    <td style={{ padding: '12px 16px', color: '#4b5563' }}>{f.nombre}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: f.alcance === 'nacional' ? '#dbeafe' : f.alcance === 'provincial' ? '#fef3c7' : '#f3f4f6', color: f.alcance === 'nacional' ? '#1e40af' : f.alcance === 'provincial' ? '#92400e' : '#4b5563', border: `1px solid ${f.alcance === 'nacional' ? '#bfdbfe' : f.alcance === 'provincial' ? '#fde68a' : '#e5e7eb'}` }}>
                                                            {f.alcance}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                        <button onClick={() => eliminarFeriado(f.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff', color: '#b91c1c', border: '1px solid #b91c1c', padding: '5px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                                                            {Iconos.eliminar}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ===== SUSPENSIONES ===== */}
                {vista === 'suspensiones' && (
                    <div>
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, marginBottom: 24 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Registrar suspensión de clase
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                                <div>
                                    <label style={labelStyle}>Curso</label>
                                    <select value={formSuspension.fp_curso_id} onChange={(e) => setFormSuspension(prev => ({ ...prev, fp_curso_id: e.target.value }))} style={inputStyle}>
                                        <option value="">Seleccionar curso...</option>
                                        {cursos.map(c => (
                                            <option key={c.id} value={c.id}>{c.nombre} ({c.turno})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Fecha</label>
                                    <input type="date" value={formSuspension.fecha} onChange={(e) => setFormSuspension(prev => ({ ...prev, fecha: e.target.value }))} style={inputStyle} />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelStyle}>Motivo (opcional)</label>
                                    <input type="text" value={formSuspension.motivo} onChange={(e) => setFormSuspension(prev => ({ ...prev, motivo: e.target.value }))} placeholder="Ej: Corte de luz, paro docente, etc." style={inputStyle} />
                                </div>
                            </div>
                            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={guardarSuspension} disabled={procesando} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: procesando ? '#9ca3af' : '#1e3a8a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: procesando ? 'not-allowed' : 'pointer' }}>
                                    {Iconos.agregar} {procesando ? 'Guardando...' : 'Registrar suspensión'}
                                </button>
                            </div>
                        </div>

                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                                <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Suspensiones del año {filtroAnio} ({suspensiones.length})
                                </h3>
                            </div>
                            {suspensiones.length === 0 ? (
                                <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>No hay suspensiones registradas para {filtroAnio}.</div>
                            ) : (
                                <div className="vista-desktop">
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                        <thead>
                                            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Fecha</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Curso</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Motivo</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {suspensiones.map((s, idx) => (
                                                <tr key={s.id} style={{ borderBottom: idx < suspensiones.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e3a8a', fontVariantNumeric: 'tabular-nums' }}>{formatearFechaLarga(s.fecha)}</td>
                                                    <td style={{ padding: '12px 16px', color: '#4b5563' }}>{s.fp_cursos?.nombre || '—'}</td>
                                                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>{s.motivo || '—'}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                        <button onClick={() => eliminarSuspension(s.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff', color: '#b91c1c', border: '1px solid #b91c1c', padding: '5px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                                                            {Iconos.eliminar}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Sidebar>
    );
}