'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Sidebar from '@/components/Sidebar';

export default function PerfilPage() {
    const { docente, cargando } = useDocente();
    const [dni, setDni] = useState('—');
    const [email, setEmail] = useState('—');
    const [nuevaPassword, setNuevaPassword] = useState('');
    const [mensaje, setMensaje] = useState(null);
    const [cargandoPerfil, setCargandoPerfil] = useState(true);

    useEffect(() => {
        if (!docente) return;
        async function cargarDatosCompletos() {
            setCargandoPerfil(true);
            try {
                // 1. Obtener DNI desde la tabla profesores
                if (docente.id) {
                    const { data: prof } = await supabase
                        .from('profesores')
                        .select('dni')
                        .eq('id', docente.id)
                        .single();
                    if (prof) setDni(prof.dni || '—');
                }

                // 2. Obtener Email real desde la sesión de auth
                const { data: { user } } = await supabase.auth.getUser();
                if (user) setEmail(user.email || '—');
            } catch (err) {
                console.error('Error al cargar perfil:', err);
            } finally {
                setCargandoPerfil(false);
            }
        }
        cargarDatosCompletos();
    }, [docente]);

    async function cambiarPassword(e) {
        e.preventDefault();
        setMensaje(null);

        if (nuevaPassword.length < 6) {
            setMensaje({ tipo: 'error', texto: 'La contraseña debe tener al menos 6 caracteres.' });
            return;
        }

        const { error } = await supabase.auth.updateUser({ password: nuevaPassword });

        if (error) {
            setMensaje({ tipo: 'error', texto: `Error: ${error.message}` });
        } else {
            setMensaje({ tipo: 'ok', texto: '¡Contraseña actualizada correctamente!' });
            setNuevaPassword('');
        }
    }

    if (cargando || !docente) return null;

    const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' };
    const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, background: '#fff', outline: 'none', color: '#1e3a8a' };

    return (
        <Sidebar docente={docente} titulo="Mi Perfil">
            <div style={{ maxWidth: 800, margin: '0 auto' }}>

                {mensaje && (
                    <div style={{
                        background: mensaje.tipo === 'ok' ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${mensaje.tipo === 'ok' ? '#bbf7d0' : '#fecaca'}`,
                        color: mensaje.tipo === 'ok' ? '#15803d' : '#b91c1c',
                        padding: 14, borderRadius: 8, marginBottom: 20, fontSize: 14
                    }}>
                        {mensaje.texto}
                    </div>
                )}

                {cargandoPerfil ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Cargando datos del perfil...</div>
                ) : (
                    <>
                        {/* Tarjeta 1: Datos Personales */}
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, marginBottom: 24 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e3a8a', marginBottom: 20, borderBottom: '1px solid #e5e7eb', paddingBottom: 12 }}>
                                Datos Personales
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div>
                                    <div style={labelStyle}>Nombre Completo</div>
                                    <div style={{ fontSize: 14, color: '#1e3a8a', fontWeight: 500 }}>{docente.nombre || '—'}</div>
                                </div>
                                <div>
                                    <div style={labelStyle}>DNI</div>
                                    <div style={{ fontSize: 14, color: '#1e3a8a', fontWeight: 500 }}>{dni}</div>
                                </div>
                                <div>
                                    <div style={labelStyle}>Legajo</div>
                                    <div style={{ fontSize: 14, color: '#1e3a8a', fontWeight: 500 }}>{docente.legajo || '—'}</div>
                                </div>
                                <div>
                                    <div style={labelStyle}>Rol en el Sistema</div>
                                    <div style={{ fontSize: 14, color: '#1e3a8a', fontWeight: 500 }}>
                                        {(() => {
                                            // Construir descripción compuesta del rol
                                            const roles = [];

                                            if (docente.esAdmin) roles.push('Administrador');
                                            if (docente.esDirectivo) roles.push('Directivo');
                                            if (docente.esVicedirector) roles.push('Vicerrector');
                                            if (docente.esJefeSeccion) roles.push('Jefe de Sección');
                                            if (docente.esPreceptor) roles.push('Preceptor');
                                            if (docente.esSecretaria) roles.push('Secretario');
                                            if (docente.esLegajos) roles.push('Legajos');
                                            if (docente.id) roles.push('Docente');

                                            // Si no tiene ningún booleano activo, usar el rol base
                                            if (roles.length === 0) {
                                                return docente.rol ? docente.rol.charAt(0).toUpperCase() + docente.rol.slice(1) : '—';
                                            }

                                            return roles.join(' / ');
                                        })()}
                                    </div>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <div style={labelStyle}>Email de la Cuenta</div>
                                    <div style={{ fontSize: 14, color: '#1e3a8a', fontWeight: 500 }}>{email}</div>
                                </div>
                            </div>
                        </div>

                        {/* Tarjeta 2: Seguridad */}
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e3a8a', marginBottom: 20, borderBottom: '1px solid #e5e7eb', paddingBottom: 12 }}>
                                Seguridad
                            </h3>
                            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
                                Cambiá tu contraseña de acceso al sistema. Debe tener al menos 6 caracteres.
                            </p>
                            <form onSubmit={cambiarPassword}>
                                <div style={{ marginBottom: 20 }}>
                                    <label style={labelStyle}>Nueva Contraseña</label>
                                    <input
                                        type="password"
                                        value={nuevaPassword}
                                        onChange={(e) => setNuevaPassword(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        style={inputStyle}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        background: '#1e3a8a',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: 6,
                                        fontSize: 14,
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Actualizar Contraseña
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </Sidebar>
    );
}