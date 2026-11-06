'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Sidebar({ docente, titulo, children }) {
    const [abierto, setAbierto] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    async function salir() {
        await supabase.auth.signOut();
        router.push('/');
    }

    const menuItems = getMenuItems(docente);

    return (
        <>
            {abierto && isMobile && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.4)',
                        zIndex: 999,
                    }}
                    onClick={() => setAbierto(false)}
                />
            )}

            <aside style={{
                position: 'fixed',
                left: 0,
                top: 0,
                bottom: 0,
                width: 260,
                background: '#1a1f2e',
                zIndex: 1000,
                transform: (abierto || !isMobile) ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
            }}>
                <div style={{
                    padding: '24px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            background: '#3b82f6',
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                            </svg>
                        </div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>Gestión Escolar</div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Fray Luis Beltrán</div>
                        </div>
                    </div>
                    {docente && (
                        <div style={{
                            fontSize: 12,
                            padding: '10px 12px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: 6,
                            border: '1px solid rgba(255,255,255,0.08)'
                        }}>
                            <div style={{ fontWeight: 500, color: '#fff', marginBottom: 2, fontSize: 13 }}>{docente.nombre}</div>
                            <div style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize', fontSize: 11 }}>{docente.rol || 'Usuario'}</div>
                        </div>
                    )}
                </div>

                <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                    {menuItems.map((item, idx) => {
                        if (item.tipo === 'separador') {
                            return (
                                <div key={idx} style={{
                                    padding: '12px 20px 6px',
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: 'rgba(255,255,255,0.4)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em'
                                }}>
                                    {item.label}
                                </div>
                            );
                        }
                        const isActive = pathname === item.ruta;
                        return (
                            <button
                                key={idx}
                                onClick={() => {
                                    router.push(item.ruta);
                                    setAbierto(false);
                                }}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '10px 20px',
                                    background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                    color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.75)',
                                    border: 'none',
                                    borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    fontWeight: isActive ? 500 : 400,
                                    textAlign: 'left',
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                        e.currentTarget.style.color = '#fff';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
                                    }
                                }}
                            >
                                <span style={{ opacity: 0.8, flexShrink: 0 }}>{item.icono}</span>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                        onClick={salir}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 12px',
                            background: 'transparent',
                            color: 'rgba(255,255,255,0.6)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 500,
                            justifyContent: 'center',
                            transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                            e.currentTarget.style.color = '#ef4444';
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span>Cerrar sesión</span>
                    </button>
                </div>
            </aside>

            <button
                onClick={() => setAbierto(!abierto)}
                style={{
                    position: 'fixed',
                    top: 16,
                    left: 16,
                    zIndex: 1001,
                    background: '#fff',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: isMobile ? 'block' : 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a1f2e" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
            </button>

            <div style={{
                marginLeft: !isMobile ? 260 : 0,
                minHeight: '100vh',
                background: '#f5f6f8',
                transition: 'margin-left 0.3s ease'
            }}>
                <header style={{
                    background: '#fff',
                    borderBottom: '1px solid #e5e7eb',
                    padding: '16px 28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'sticky',
                    top: 0,
                    zIndex: 100
                }}>
                    <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#1a1f2e', letterSpacing: '-0.01em' }}>
                        {titulo || 'Panel de Control'}
                    </h1>
                    <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
                        Ciclo lectivo 2026
                    </div>
                </header>

                <main style={{ padding: isMobile ? '16px' : '28px' }}>
                    {children}
                </main>
            </div>
        </>
    );
}

// Iconos SVG profesionales
const Iconos = {
    materias: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>,
    horario: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    actas: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
    constancias: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="15" x2="15" y2="15" /></svg>,
    curriculum: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>,
    notas: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
    inscripciones: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>,
    asistencias: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
    legajo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>,
    profesor: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    alumno: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    admin: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
    preceptores: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    estadisticas: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
    config: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
    perfil: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
};

function getMenuItems(docente) {
    const items = [];
    if (!docente) return items;

    // DOCENTE
    if (docente.es_docente) {
        items.push({ tipo: 'separador', label: 'Docencia' });
        items.push({ label: 'Mis materias', ruta: '/materias', icono: Iconos.materias });
        items.push({ label: 'Horarios', ruta: '/docente/horarios', icono: Iconos.horario });
        items.push({ label: 'Actas de exámenes', ruta: '/docente/actas', icono: Iconos.actas });
        items.push({ label: 'Constancias', ruta: '/docente/constancias', icono: Iconos.constancias });
        items.push({ label: 'Currículum', ruta: '/docente/curriculum', icono: Iconos.curriculum });
        items.push({ label: 'Notas / Documentación', ruta: '/docente/notas', icono: Iconos.notas });
    }

    // PRECEPTOR
    if (docente.esPreceptor) {
        items.push({ tipo: 'separador', label: 'Preceptoría' });
        if (!docente.es_docente) {
            items.push({ label: 'Mis materias', ruta: '/materias', icono: Iconos.materias });
        }
        items.push({ label: 'Inscripciones FP', ruta: '/preceptor/inscripciones', icono: Iconos.inscripciones });
        items.push({ label: 'Asistencias', ruta: '/preceptor/asistencias', icono: Iconos.asistencias });
        items.push({ label: 'Actas', ruta: '/preceptor/actas', icono: Iconos.actas });
        items.push({ label: 'Legajo alumno', ruta: '/preceptor/legajo-alumno', icono: Iconos.legajo });
    }

    // SECRETARÍA
    if (docente.esSecretaria) {
        items.push({ tipo: 'separador', label: 'Secretaría' });
        items.push({ label: 'Carga de profesor', ruta: '/admin/carga-profesor', icono: Iconos.profesor });
        items.push({ label: 'Carga de alumno', ruta: '/admin/carga-alumno', icono: Iconos.alumno });
        items.push({ label: 'Horarios', ruta: '/admin/horarios', icono: Iconos.horario });
        items.push({ label: 'Constancias', ruta: '/admin/constancias', icono: Iconos.constancias });
        items.push({ label: 'Actas', ruta: '/admin/actas', icono: Iconos.actas });
    }

    // LEGAJOS
    if (docente.esLegajos) {
        items.push({ tipo: 'separador', label: 'Legajos' });
        items.push({ label: 'Legajo alumno', ruta: '/admin/legajo-alumno', icono: Iconos.legajo });
    }

    // ADMINISTRADOR / DIRECTIVO
    if (docente.esAdmin || docente.esDirectivo) {
        items.push({ tipo: 'separador', label: 'Administración' });
        items.push({ label: 'Panel de control', ruta: '/admin', icono: Iconos.admin });
        items.push({ label: 'Asignar preceptores', ruta: '/admin/asignar-preceptores', icono: Iconos.preceptores });
        items.push({ label: 'Estadísticas', ruta: '/admin/estadisticas', icono: Iconos.estadisticas });
        items.push({ label: 'Configuración', ruta: '/admin/configuracion', icono: Iconos.config });
    }

    // PERFIL (común)
    items.push({ tipo: 'separador', label: 'Cuenta' });
    items.push({ label: 'Mi perfil', ruta: '/perfil', icono: Iconos.perfil });

    return items;
}