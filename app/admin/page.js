'use client';

import { useSesion } from '@/lib/useSesion';
import Header from '@/components/Header';

const ACCESOS = [
  { href: '/admin/asignar-profesores', titulo: 'Asignar profesores', desc: 'Vincular cada materia con el profesor que la dicta', roles: ['secretario', 'directivo'] },
  { href: '/admin/asignar-preceptores', titulo: 'Asignar preceptores', desc: 'Definir qué preceptor está a cargo de cada curso', roles: ['directivo'] },
  { href: '/preceptor/inscribir', titulo: 'Inscripción de alumnos', desc: 'Agregar o dar de baja alumnos en un curso', roles: ['preceptor', 'directivo'] },
  { href: '/materias', titulo: 'Mis materias', desc: 'Volver al cuaderno del docente', roles: [] },
];

export default function AdminHomePage() {
  const { sesion, cargando, autorizado } = useSesion(null); // cualquier cuenta con sesión válida puede ver el panel; el acceso real a cada pantalla se filtra adentro

  if (cargando) return null;

  return (
    <>
      <Header docente={{ nombre: `${sesion.email}${sesion.esAdmin ? ' · superusuario' : ''}` }} />
      <main>
        <div className="toolbar">
          <div className="titulo">
            <h2>Panel de administración</h2>
            <p>Accesos según tu rol{sesion.esAdmin ? ' — tenés acceso a todo por ser superusuario' : ''}</p>
          </div>
        </div>
        <div className="materias-grid">
          {ACCESOS.map((a) => (
            <a key={a.href} href={a.href} className="materia-card" style={{ display: 'block' }}>
              <div className="nombre">{a.titulo}</div>
              <div className="curso">{a.desc}</div>
            </a>
          ))}
        </div>
      </main>
    </>
  );
}
