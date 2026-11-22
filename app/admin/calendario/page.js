'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Sidebar from '@/components/Sidebar';

const Iconos = {
    calendario: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    feriado: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>,
    suspension: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>,
    receso: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
    agregar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
    eliminar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
    check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>,
    masivo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
};

// ✅ FERIADOS NACIONALES FIJOS DE ARGENTINA (no cambian de fecha)
const FERIADOS_NACIONALES_FIJOS = [
    { mes: 3, dia: 24, nombre: 'Día Nacional de la Memoria por la Verdad y la Justicia' },
    { mes: 4, dia: 2, nombre: 'Día del Veterano y de los Caídos en la Guerra de Malvinas' },
    { mes: 5, dia: 1, nombre: 'Día del Trabajador' },
    { mes: 5, dia: 25, nombre: 'Día de la Revolución de Mayo' },
    { mes: 6, dia: 20, nombre: 'Día de la Bandera' },
    { mes: 7, dia: 9, nombre: 'Día de la Independencia' },
    { mes: 8, dia: 17, nombre: 'Paso a la Inmortalidad del Gral. José de San Martín' },
    { mes: 10, dia: 12, nombre: 'Día del Respeto a la Diversidad Cultural' },
    { mes: 11, dia: 20, nombre: 'Día de la Soberanía Nacional' },
    { mes: 12, dia: 8, nombre: 'Inmaculada Concepción de María' },
    { mes: 12, dia: 25, nombre: 'Navidad' }
];

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

// Genera la fecha ISO a partir de año, mes y día
function generarFechaISO(anio, mes, dia) {
    const m = String(mes).padStart(2, '0');
    const d = String(dia).padStart(2, '0');
    return `${anio}-${m}-${d}`;
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
    const [modalCargaMasiva, setModalCargaMasiva] = useState({ abierto: false, feriados: [], seleccionados: [] });

    // Suspensiones
    const [suspensiones, setSuspensiones] = useState([]);
    const [cursos, setCursos] = useState([]);
    const [formSuspension, setFormSuspension] = useState({
        fp_curso_id: '',
        fecha: '',
        motivo: ''
    });

    // Recesos
    const [recesos, setRecesos] = useState([]);
    const [formReceso, setFormReceso] = useState({
        nombre: '',
        fecha_inicio: '',
        fecha_fin: '',
        anio: new Date().getFullYear()
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
        if (vista === 'recesos') cargarRecesos();
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

    async function cargarRecesos() {
        try {
            const { data, error } = await supabase
                .from('calendario_recesos')
                .select('*')
                .eq('anio', filtroAnio)
                .order('fecha_inicio');
            if (error) throw error;
            setRecesos(data || []);
        } catch (err) {
            console.error('Error al cargar recesos:', err);
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

    // ✅ CARGA MASIVA DE FERIADOS NACIONALES
    function abrirModalCargaMasiva() {
        // Generar la lista de feriados fijos para el año seleccionado
        const feriadosGenerados = FERIADOS_NACIONALES_FIJOS.map(f => ({
            fecha: generarFechaISO(filtroAnio, f.mes, f.dia),
            nombre: f.nombre,
            alcance: 'nacional',
            anio: filtroAnio
        }));

        // Marcar todos como seleccionados por defecto
        const seleccionados = feriadosGenerados.map((_, i) => i);

        setModalCargaMasiva({
            abierto: true,
            feriados: feriadosGenerados,
            seleccionados
        });
    }

    function toggleSeleccionFeriado(index) {
        setModalCargaMasiva(prev => {
            const nuevos = prev.seleccionados.includes(index)
                ? prev.seleccionados.filter(i => i !== index)
                : [...prev.seleccionados, index];
            return { ...prev, seleccionados: nuevos };
        });
    }

    function seleccionarTodos() {
        setModalCargaMasiva(prev => ({
            ...prev,
            seleccionados: prev.feriados.map((_, i) => i)
        }));
    }

    function deseleccionarTodos() {
        setModalCargaMasiva(prev => ({ ...prev, seleccionados: [] }));
    }

    async function confirmarCargaMasiva() {
        if (modalCargaMasiva.seleccionados.length === 0) {
            setMensaje({ tipo: 'error', texto: 'Seleccioná al menos un feriado.' });
            return;
        }
        setProcesando(true);
        try {
            const feriadosAInsertar = modalCargaMasiva.seleccionados.map(i => modalCargaMasiva.feriados[i]);

            // Insertar todos de una vez
            const { error } = await supabase
                .from('calendario_feriados')
                .upsert(feriadosAInsertar, { onConflict: 'fecha, anio' });

            if (error) throw error;

            setMensaje({ tipo: 'ok', texto: `${feriadosAInsertar.length} feriados nacionales cargados correctamente.` });
            setModalCargaMasiva({ abierto: false, feriados: [], seleccionados: [] });
            await cargarFeriados();
            setTimeout(() => setMensaje(null), 3000);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        } finally {
            setProcesando(false);
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

    // === RECESOS ===
    async function guardarReceso() {
        if (!formReceso.nombre || !formReceso.fecha_inicio || !formReceso.fecha_fin) {
            setMensaje({ tipo: 'error', texto: 'Completá nombre, fecha inicio y fecha fin.' });
            return;
        }
        if (formReceso.fecha_fin < formReceso.fecha_inicio) {
            setMensaje({ tipo: 'error', texto: 'La fecha fin debe ser posterior a la fecha inicio.' });
            return;
        }
        setProcesando(true);
        try {
            const { error } = await supabase
                .from('calendario_recesos')
                .insert({
                    anio: formReceso.anio,
                    nombre: formReceso.nombre,
                    fecha_inicio: formReceso.fecha_inicio,
                    fecha_fin: formReceso.fecha_fin
                });
            if (error) throw error;
            setMensaje({ tipo: 'ok', texto: 'Receso registrado correctamente.' });
            setFormReceso({ nombre: '', fecha_inicio: '', fecha_fin: '', anio: formReceso.anio });
            await cargarRecesos();
            setTimeout(() => setMensaje(null), 3000);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        } finally {
            setProcesando(false);
        }
    }

    async function eliminarReceso(id) {
        if (!confirm('¿Eliminar este receso?')) return;
        try {
            const { error } = await supabase.from('calendario_recesos').delete().eq('id', id);
            if (error) throw error;
            setMensaje({ tipo: 'ok', texto: 'Receso eliminado.' });
            await cargarRecesos();
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
                    <button onClick={() => setVista('recesos')} style={{ padding: '12px 24px', background: vista === 'recesos' ? '#1e3a8a' : 'transparent', color: vista === 'recesos' ? '#fff' : '#4b5563', border: 'none', borderBottom: vista === 'recesos' ? '2px solid #1e3a8a' : '2px solid transparent', fontSize: 14, fontWeight: vista === 'recesos' ? 600 : 400, cursor: 'pointer', marginBottom: -2, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {Iconos.receso} Recesos
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
                        {/* Botón de carga masiva */}
                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 20, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>
                                    Carga rápida de feriados nacionales
                                </div>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>
                                    Carga automáticamente los 11 feriados nacionales fijos de Argentina para {filtroAnio}. Los feriados móviles (Carnaval, Semana Santa, Güemes) se agregan manualmente.
                                </div>
                            </div>
                            <button
                                onClick={abrirModalCargaMasiva}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    background: '#1e3a8a',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '10px 20px',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {Iconos.masivo} Cargar feriados {filtroAnio}
                            </button>
                        </div>

                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, marginBottom: 24 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Agregar feriado manualmente
                            </h3>
                            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: '#92400e' }}>
                                💡 Usá este formulario solo para feriados móviles (Carnaval, Semana Santa, Güemes) o provinciales/locales.
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                                <div>
                                    <label style={labelStyle}>Fecha</label>
                                    <input type="date" value={formFeriado.fecha} onChange={(e) => setFormFeriado(prev => ({ ...prev, fecha: e.target.value }))} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Nombre</label>
                                    <input type="text" value={formFeriado.nombre} onChange={(e) => setFormFeriado(prev => ({ ...prev, nombre: e.target.value }))} placeholder="Ej: Carnaval" style={inputStyle} />
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
                                <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>No hay feriados registrados para {filtroAnio}. Usá el botón "Cargar feriados {filtroAnio}" para agregar los nacionales automáticamente.</div>
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

                {/* ===== RECESOS ===== */}
                {vista === 'recesos' && (
                    <div>
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, marginBottom: 24 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Registrar receso
                            </h3>
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: '#1e40af' }}>
                                Los recesos son períodos donde no hay clases para todas las modalidades (ej: receso invernal, de primavera).
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                                <div>
                                    <label style={labelStyle}>Nombre</label>
                                    <input type="text" value={formReceso.nombre} onChange={(e) => setFormReceso(prev => ({ ...prev, nombre: e.target.value }))} placeholder="Ej: Receso Invernal" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Fecha inicio</label>
                                    <input type="date" value={formReceso.fecha_inicio} onChange={(e) => setFormReceso(prev => ({ ...prev, fecha_inicio: e.target.value }))} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Fecha fin</label>
                                    <input type="date" value={formReceso.fecha_fin} onChange={(e) => setFormReceso(prev => ({ ...prev, fecha_fin: e.target.value }))} style={inputStyle} />
                                </div>
                            </div>
                            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={guardarReceso} disabled={procesando} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: procesando ? '#9ca3af' : '#1e3a8a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: procesando ? 'not-allowed' : 'pointer' }}>
                                    {Iconos.agregar} {procesando ? 'Guardando...' : 'Registrar receso'}
                                </button>
                            </div>
                        </div>

                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                                <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Recesos del año {filtroAnio} ({recesos.length})
                                </h3>
                            </div>
                            {recesos.length === 0 ? (
                                <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>No hay recesos registrados para {filtroAnio}.</div>
                            ) : (
                                <div className="vista-desktop">
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                        <thead>
                                            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Nombre</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Período</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Duración</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recesos.map((r, idx) => {
                                                const inicio = new Date(r.fecha_inicio);
                                                const fin = new Date(r.fecha_fin);
                                                const dias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
                                                return (
                                                    <tr key={r.id} style={{ borderBottom: idx < recesos.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e3a8a' }}>{r.nombre}</td>
                                                        <td style={{ padding: '12px 16px', color: '#4b5563' }}>{formatearFechaCorta(r.fecha_inicio)} — {formatearFechaCorta(r.fecha_fin)}</td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                            <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                                                                {dias} días
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                            <button onClick={() => eliminarReceso(r.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff', color: '#b91c1c', border: '1px solid #b91c1c', padding: '5px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                                                                {Iconos.eliminar}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ===== MODAL: CARGA MASIVA DE FERIADOS ===== */}
            {modalCargaMasiva.abierto && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setModalCargaMasiva({ abierto: false, feriados: [], seleccionados: [] })}>
                    <div style={{ background: '#fff', borderRadius: 8, padding: 28, maxWidth: 600, width: '100%', maxHeight: '85vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>
                            Cargar feriados nacionales {filtroAnio}
                        </h3>
                        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px 0' }}>
                            Seleccioná los feriados que querés cargar. Desmarcá los que no correspondan (ej: si cae en fin de semana).
                        </p>

                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            <button onClick={seleccionarTodos} style={{ fontSize: 12, color: '#1e40af', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                Seleccionar todos
                            </button>
                            <span style={{ color: '#d1d5db' }}>|</span>
                            <button onClick={deseleccionarTodos} style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                Deseleccionar todos
                            </button>
                        </div>

                        <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, maxHeight: 400, overflow: 'auto' }}>
                            {modalCargaMasiva.feriados.map((f, i) => {
                                const fecha = new Date(f.fecha + 'T00:00:00');
                                const diaSemana = fecha.toLocaleDateString('es-AR', { weekday: 'long' });
                                const isSelected = modalCargaMasiva.seleccionados.includes(i);
                                return (
                                    <label
                                        key={i}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            padding: '12px 16px',
                                            borderBottom: i < modalCargaMasiva.feriados.length - 1 ? '1px solid #e5e7eb' : 'none',
                                            background: isSelected ? '#f0fdf4' : '#fff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSeleccionFeriado(i)}
                                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a' }}>{f.nombre}</div>
                                            <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'capitalize' }}>
                                                {formatearFechaCorta(f.fecha)} · {diaSemana}
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>

                        <div style={{ marginTop: 16, padding: 12, background: '#fef3c7', borderRadius: 6, fontSize: 12, color: '#92400e' }}>
                            💡 <strong>Recordá:</strong> Los feriados móviles (Carnaval, Semana Santa, Güemes) se agregan manualmente después, ya que cambian de fecha cada año.
                        </div>

                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                            <button
                                onClick={() => setModalCargaMasiva({ abierto: false, feriados: [], seleccionados: [] })}
                                style={{ background: '#fff', color: '#4b5563', border: '1px solid #d1d5db', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmarCargaMasiva}
                                disabled={procesando || modalCargaMasiva.seleccionados.length === 0}
                                style={{
                                    background: (procesando || modalCargaMasiva.seleccionados.length === 0) ? '#9ca3af' : '#1e3a8a',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '10px 18px',
                                    borderRadius: 4,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: (procesando || modalCargaMasiva.seleccionados.length === 0) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {procesando ? 'Cargando...' : `Cargar ${modalCargaMasiva.seleccionados.length} feriados`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Sidebar>
    );
}