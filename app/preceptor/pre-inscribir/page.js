'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Sidebar from '@/components/Sidebar';

export default function PreInscribirPage() {
    const { docente, cargando } = useDocente();
    const [cursosFP, setCursosFP] = useState([]);
    const [enviando, setEnviando] = useState(false);
    const [mensaje, setMensaje] = useState(null);

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
        cargarCursos();
    }, [docente]);

    async function cargarCursos() {
        const { data, error } = await supabase
            .from('fp_cursos')
            .select('id, nombre, anio, turno, cupo')
            .order('nombre');
        if (error) return;
        setCursosFP(data || []);
    }

    function handleChange(e) {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setEnviando(true);
        setMensaje(null);

        try {
            const { error } = await supabase
                .from('fp_preinscripciones')
                .insert({
                    ...form,
                    fp_curso_id: Number(form.fp_curso_id),
                    preceptor_id: docente.id,
                    estado: 'preinscrito',
                    documentacion_completa: false,
                    fecha_preinscripcion: new Date().toISOString().split('T')[0],
                    req_documentacion: true,
                    req_edad: true,
                    req_pago: false
                });

            if (error) throw error;

            setMensaje({ tipo: 'ok', texto: 'Pre-inscripción registrada correctamente. El alumno deberá entregar la documentación para completar el proceso.' });
            setForm({
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
        } catch (err) {
            setMensaje({ tipo: 'error', texto: `Error: ${err.message}` });
        } finally {
            setEnviando(false);
        }
    }

    if (cargando || !docente) return null;

    return (
        <Sidebar docente={docente} titulo="Pre-inscripción FP">
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <div style={{ marginBottom: 24 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Ficha de Pre-inscripción - Formación Profesional</h2>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                        Complete los datos del alumno. La inscripción se confirmará cuando entregue la documentación completa.
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

                <form onSubmit={handleSubmit} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>

                    {/* Selección de curso */}
                    <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Curso al que se pre-inscribe</h3>
                        <select
                            name="fp_curso_id"
                            value={form.fp_curso_id}
                            onChange={handleChange}
                            required
                            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-strong)', fontSize: 14 }}
                        >
                            <option value="">Seleccione un curso...</option>
                            {cursosFP.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre} ({c.turno}) — Cupo: {c.cupo}</option>
                            ))}
                        </select>
                    </div>

                    {/* Datos personales */}
                    <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Datos personales</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Apellido *</label>
                                <input type="text" name="apellido" value={form.apellido} onChange={handleChange} required style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Nombre *</label>
                                <input type="text" name="nombre" value={form.nombre} onChange={handleChange} required style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>DNI *</label>
                                <input type="text" name="dni" value={form.dni} onChange={handleChange} required placeholder="12345678" style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                            </div>
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
                    </div>

                    {/* Contacto */}
                    <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Datos de contacto</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Teléfono *</label>
                                <input type="tel" name="telefono" value={form.telefono} onChange={handleChange} required placeholder="2345-123456" style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Email</label>
                                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="ejemplo@mail.com" style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Domicilio</label>
                                <input type="text" name="domicilio" value={form.domicilio} onChange={handleChange} placeholder="Calle, número, localidad" style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                            </div>
                        </div>
                    </div>

                    {/* Datos académicos y laborales */}
                    <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Datos académicos y laborales</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Estudios obtenidos *</label>
                                <select name="estudios_obtenidos" value={form.estudios_obtenidos} onChange={handleChange} required style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }}>
                                    <option value="primario_secundario">Primario / Secundario</option>
                                    <option value="nivel_superior">Nivel Superior / Universitario</option>
                                    <option value="formacion_profesional">Formación Profesional</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Situación laboral *</label>
                                <select name="situacion_laboral" value={form.situacion_laboral} onChange={handleChange} required style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }}>
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

                    {/* Datos de emergencia */}
                    <div style={{ marginBottom: 24 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Datos de emergencia</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Nombre completo</label>
                                <input type="text" name="emergencia_nombre" value={form.emergencia_nombre} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Parentesco</label>
                                <input type="text" name="emergencia_parentesco" value={form.emergencia_parentesco} onChange={handleChange} placeholder="Padre, madre, etc." style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Teléfono</label>
                                <input type="tel" name="emergencia_telefono" value={form.emergencia_telefono} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 14 }} />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            type="submit"
                            disabled={enviando}
                            style={{
                                background: enviando ? 'var(--text-muted)' : 'var(--accent)',
                                color: '#fff',
                                border: 'none',
                                padding: '12px 28px',
                                borderRadius: 8,
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: enviando ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {enviando ? 'Registrando...' : 'Registrar pre-inscripción'}
                        </button>
                    </div>
                </form>
            </div>
        </Sidebar>
    );
}