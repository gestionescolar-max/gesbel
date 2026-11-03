'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Sidebar({ docente, titulo, children }) {
    const [abierto, setAbierto] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    // Detectar si es móvil de forma segura (evita errores de SSR)
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
            {/* Overlay para móvil */}
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

            {/* Sidebar */}
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
                {/* Header del sidebar */}
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

                {/* Menú de navegación */}
                <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
                    {menuItems.map((item, idx) => (
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
                                padding: '12px 16px',
                                background: pathname === item.ruta ? 'var(--accent-bg)' : 'transparent',
                                color: pathname === item.ruta ? 'var(--accent)' : 'var(--text)',
                                border: 'none',
                                borderBottom: '1px solid var(--border)',
                                cursor: 'pointer',
                                fontSize: 14,
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
                            <span style={{ fontSize: 18 }}>{item.icono}</span>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                {/* Botón de salir */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                    <button
                        onClick={salir}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '12px',
                            background: 'var(--danger-bg)',
                            color: 'var(--danger)',
                            border: '1px solid #fecaca',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 600,
                            justifyContent: 'center'
                        }}
                    >
                        <span>🚪</span>
                        <span>Cerrar sesión</span>
                    </button>
                </div>
            </aside>

            {/* Botón hamburguesa para móvil */}
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

            {/* Contenido principal con margen para el sidebar */}
            <div style={{
                marginLeft: !isMobile ? 280 : 0,
                minHeight: '100vh',
                background: 'var(--bg)',
                transition: 'margin-left 0.3s ease'
            }}>
                {/* Header superior */}
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

                {/* Contenido de la página (inyectado desde children) */}
                <main style={{ padding: isMobile ? '16px' : '24px' }}>
                    {children}
                </main>
            </div>
        </>
    );
}

// Función para obtener items del menú según el rol
function getMenuItems(docente) {
    const items = [];
    if (!docente) return items;

    // === DOCENTE (común si es docente) ===
    if (docente.es_docente) {
        items.push({ label: 'Mis materias', ruta: '/materias', icono: '📖' });
        items.push({ label: 'Horarios / Informes', ruta: '/horarios', icono: '🕐' });
        items.push({ label: 'Constancias', ruta: '/constancias', icono: '📄' });
        items.push({ label: 'Actas', ruta: '/actas', icono: '📝' });
    }

    // === ADMINISTRADOR ===
    if (docente.esAdmin) {
        items.push({ label: 'Panel de administración', ruta: '/admin', icono: '⚙️' });
        items.push({ label: 'Asignar preceptores', ruta: '/admin/asignar-preceptores', icono: '👥' });
        items.push({ label: 'Horarios / Informes', ruta: '/horarios', icono: '🕐' });
        items.push({ label: 'Constancias', ruta: '/constancias', icono: '📄' });
        items.push({ label: 'Actas', ruta: '/actas', icono: '📝' });
    }

    // === DIRECTIVO ===
    if (docente.esDirectivo && !docente.esAdmin) {
        items.push({ label: 'Panel de administración', ruta: '/admin', icono: '⚙️' });
        items.push({ label: 'Asignar preceptores', ruta: '/admin/asignar-preceptores', icono: '👥' });
        items.push({ label: 'Horarios / Informes', ruta: '/horarios', icono: '🕐' });
        items.push({ label: 'Constancias', ruta: '/constancias', icono: '📄' });
        items.push({ label: 'Actas', ruta: '/actas', icono: '📝' });
    }

    // === SECRETARÍA ===
    if (docente.esSecretaria) {
        items.push({ label: 'Panel de administración', ruta: '/admin', icono: '⚙️' });
        items.push({ label: 'Carga de profesor', ruta: '/admin/carga-profesor', icono: '👨‍🏫' });
        items.push({ label: 'Horarios / Informes', ruta: '/horarios', icono: '🕐' });
        items.push({ label: 'Constancias', ruta: '/constancias', icono: '📄' });
        items.push({ label: 'Actas', ruta: '/actas', icono: '📝' });
    }

    // === PRECEPTOR ===
    if (docente.esPreceptor) {
        if (!docente.es_docente) { // Evitar duplicar "Mis materias" si ya es docente
            items.push({ label: 'Mis materias', ruta: '/materias', icono: '📖' });
        }
        items.push({ label: 'Inscripciones', ruta: '/preceptor/inscribir', icono: '✍️' });
        items.push({ label: 'Actas', ruta: '/preceptor/actas', icono: '📝' });
        items.push({ label: 'Asistencias', ruta: '/preceptor/asistencias', icono: '✅' });
        items.push({ label: 'Legajo alumno', ruta: '/preceptor/legajo-alumno', icono: '📋' });
    }

    // === LEGAJOS / AUXILIAR LEGAJOS ===
    if (docente.esLegajos) {
        // SOLO legajo de alumno, nada del profesor
        items.push({ label: 'Legajo alumno', ruta: '/admin/legajo-alumno', icono: '📋' });
    }

    // Fallback si no tiene ningún menú específico
    if (items.length === 0) {
        items.push({ label: 'Inicio', ruta: '/', icono: '🏠' });
    }

    return items;
}