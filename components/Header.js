'use client';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const MENU = [
  { etiqueta: 'Principal', href: '/materias' },
  { etiqueta: 'Mis materias', href: '/materias' },
  { etiqueta: 'Legajo', href: '/legajo' },
  { etiqueta: 'Constancias', href: '/constancias' },
  { etiqueta: 'Horarios / Informes', href: '/horarios-informes' },
];

export default function Header({ docente }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);

  async function cerrarSesion() {
    setMenuAbierto(false);
    await supabase.auth.signOut();
    router.push('/');
  }

  function ir(href) {
    setMenuAbierto(false);
    router.push(href);
  }

  return (
    <header>
      <div className="brand">
        <div className="logo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <h1>Gestión Escuela Técnica Fray Luis Beltrán</h1>
          <p>Sistema de gestión académica</p>
        </div>
      </div>
      {docente && (
        <div className="nav-wrap">
          <button
            className="nav-toggle"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-expanded={menuAbierto}
            aria-label="Abrir menú"
          >
            ☰ Menú
          </button>
          {menuAbierto && (
            <div className="nav-menu">
              <div className="nav-user">{docente.nombre}</div>
              {MENU.map((item) => (
                <button
                  key={item.etiqueta}
                  className={'nav-item' + (pathname === item.href ? ' activo' : '')}
                  onClick={() => ir(item.href)}
                >
                  {item.etiqueta}
                </button>
              ))}
              <button className="nav-item nav-salir" onClick={cerrarSesion}>
                Salir
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
