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
                        background: 'rgba(0, 0, 0, 0.5)',
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
                width: 280,
                background: 'var(--surface)',
                borderRight: '1px solid var(--border)',
                zIndex: 1000,
                transform: (abierto || !isMobile) ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                <div style={{
                    padding: '20px 16px',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--surface-2)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            background: 'var(--accent)',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 20
                        }}>📚</div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>Gestión Escolar</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fray Luis Beltrán</div>
                        </div>
                    </div>
                    {docente && (
                        <div style={{
                            fontSize: 12,
                            color: 'var(--text-muted)',
                            padding: '8px 12px',
                            background: 'var(--surface)',
                            borderRadius: 6,
                            border: '1px solid var(--border)'
                        }}>
                            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{docente.nombre}</div>
                            <div style={{ textTransform: 'capitalize' }}>{docente.rol || 'Usuario'}</div>
                        </div>
                    )}
                </div>

                <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
                    {menuItems.map((item, idx) => {
                        if (item.tipo === 'separador') {
                            return (
                                <div key={idx} style={{
                                    padding: '8px 16px 4px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    borderTop: '1px solid var(--border)',
                                    marginTop: '8px'
                                }}>
                                    {item.label}
                                </div>
                            );
                        }
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
                                    padding: '10px 16px',
                                    background: pathname === item.ruta ? 'var(--accent-bg)' : 'transparent',
                                    color: pathname === item.ruta ? 'var(--accent)' : 'var(--text)',
                                    border: 'none',
                                    borderBottom: '1px solid var(--border)',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    fontWeight: pathname === item.ruta ? 600 : 400,
                                    textAlign: 'left',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    if (pathname !== item.ruta) {
                                        e.currentTarget.style.background = 'var(--surface-2)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (pathname !== item.ruta) {
                                        e.currentTarget.style.background = 'transparent';
                                    }
                                }}
                            >
                                <span style={{ fontSize: 16 }}>{item.icono}</span>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                    <button
                        onClick={salir}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px',
                            background: 'var(--danger-bg)',
                            color: 'var(--danger)',
                            border: '1px solid #fecaca',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                            justifyContent: 'center'
                        }}
                    >
                        <span>🚪</span>
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
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    cursor: 'pointer',
                    display: isMobile ? 'block' : 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
            >
                <span style={{ fontSize: 20 }}>☰</span>
            </button>

            <div style={{
                marginLeft: !isMobile ? 280 : 0,
                minHeight: '100vh',
                background: 'var(--bg)',
                transition: 'margin-left 0.3s ease'
            }}>
                <header style={{
                    background: 'var(--surface)',
                    borderBottom: '1px solid var(--border)',
                    padding: '16px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'sticky',
                    top: 0,
                    zIndex: 100
                }}>
                    <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                        {titulo || 'Panel de Control'}
                    </h1>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Ciclo 2026
                    </div>
                </header>

                <main style={{ padding: isMobile ? '16px' : '24px' }}>
                    {children}
                </main>
            </div>
        </>
    );
}

function getMenuItems(docente) {
    const items = [];
    if (!docente) return items;

    // ==========================================
    // DOCENTE (Secundario y/o FP)
    // ==========================================
    if (docente.es_docente) {
        items.push({ tipo: 'separador', label: 'Docencia' });
        items.push({ label: 'Mis materias', ruta: '/materias', icono: '📖' });
        items.push({ label: 'Horarios', ruta: '/docente/horarios', icono: '🕐' });
        items.push({ label: 'Actas de exámenes', ruta: '/docente/actas', icono: '📝' });
        items.push({ label: 'Constancias', ruta: '/docente/constancias', icono: '📄' });
        items.push({ label: 'Currículum', ruta: '/docente/curriculum', icono: '📚' });
        items.push({ label: 'Notas/Documentación', ruta: '/docente/notas', icono: '📋' });
    }

    // ==========================================
    // PRECEPTOR
    // ==========================================
    if (docente.esPreceptor) {
        items.push({ tipo: 'separador', label: 'Preceptoría' });
        if (!docente.es_docente) {
            items.push({ label: 'Mis materias', ruta: '/materias', icono: '📖' });
        }
        items.push({ label: 'Inscripciones', ruta: '/preceptor/inscribir', icono: '✍️' });
        items.push({ label: 'Asistencias', ruta: '/preceptor/asistencias', icono: '✅' });
        items.push({ label: 'Actas', ruta: '/preceptor/actas', icono: '📝' });
        items.push({ label: 'Legajo alumno', ruta: '/preceptor/legajo-alumno', icono: '' });
    }

    // ==========================================
    // SECRETARÍA (Carga y gestión administrativa)
    // ==========================================
    if (docente.esSecretaria) {
        items.push({ tipo: 'separador', label: 'Secretaría' });
        items.push({ label: 'Carga de profesor', ruta: '/admin/carga-profesor', icono: '👨🏫' });
        items.push({ label: 'Carga de alumno', ruta: '/admin/carga-alumno', icono: '👨🎓' });
        items.push({ label: 'Horarios', ruta: '/admin/horarios', icono: '🕐' });
        items.push({ label: 'Constancias', ruta: '/admin/constancias', icono: '📄' });
        items.push({ label: 'Actas', ruta: '/admin/actas', icono: '📝' });
    }

    // ==========================================
    // LEGAJOS (Seguimiento del alumno)
    // ==========================================
    if (docente.esLegajos) {
        items.push({ tipo: 'separador', label: 'Legajos' });
        items.push({ label: 'Legajo alumno', ruta: '/admin/legajo-alumno', icono: '📋' });
    }

    // ==========================================
    // ADMINISTRADOR / DIRECTIVO
    // ==========================================
    if (docente.esAdmin || docente.esDirectivo) {
        items.push({ tipo: 'separador', label: 'Administración' });
        items.push({ label: 'Panel de control', ruta: '/admin', icono: '⚙️' });
        items.push({ label: 'Asignar preceptores', ruta: '/admin/asignar-preceptores', icono: '👥' });
        items.push({ label: 'Estadísticas', ruta: '/admin/estadisticas', icono: '📊' });
        items.push({ label: 'Configuración', ruta: '/admin/configuracion', icono: '🔧' });
    }

    // ==========================================
    // PERFIL (Común para todos)
    // ==========================================
    items.push({ tipo: 'separador', label: 'Personal' });
    items.push({ label: 'Mi perfil', ruta: '/perfil', icono: '👤' });

    return items;
}