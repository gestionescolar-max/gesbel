'use client';
import { useSesion } from '@/lib/useSesion';
import Header from '@/components/Header';

const ACCESOS = [
  { href: '/admin/asignar-profesores', titulo: 'Asignar profesores', desc: 'Vincular cada materia con el profesor que la dicta' },
  { href: '/admin/asignar-preceptores', titulo: 'Asignar preceptores', desc: 'Definir qué preceptor está a cargo de cada curso' },
  { href: '/preceptor/inscribir', titulo: 'Inscripción de alumnos', desc: 'Agregar o dar de baja alumnos en un curso' },
  { href: '/preceptor/preinscripcion-fp', titulo: 'Preinscripción FP 2027', desc: 'Anotar alumnos a las ofertas de Formación Profesional del ciclo 2027' },
  { href: '/admin/datos/ofertas-fp', titulo: 'Carga: Ofertas FP', desc: 'Cursos y talleres de FP por ciclo lectivo, con cupos y horarios' },
  { href: '/admin/datos/profesores', titulo: 'Carga: Profesores', desc: 'Alta y edición de profesores' },
  { href: '/admin/datos/alumnos', titulo: 'Carga: Alumnos', desc: 'Datos generales de cada alumno' },
  { href: '/admin/datos/resoluciones', titulo: 'Carga: Resoluciones', desc: 'Normativa que respalda planes y designaciones' },
  { href: '/admin/datos/planes', titulo: 'Carga: Planes de estudio', desc: 'Tecnicaturas y modalidades' },
  { href: '/admin/datos/cursos', titulo: 'Carga: Cursos', desc: 'Año + división + plan + ciclo lectivo' },
  { href: '/admin/datos/institucion', titulo: 'Carga: Institución', desc: 'Datos de la escuela y sus autoridades' },
  { href: '/materias', titulo: 'Mis materias', desc: 'Volver al cuaderno del docente' },
];

export default function AdminHomePage() {
  const { sesion, cargando } = useSesion(null);
  if (cargando) return null;
  return (
    <>
      <Header docente={{ nombre: `${sesion.email}${sesion.esAdmin ? ' · superusuario' : ''}` }} />
      <main>
        <div className="toolbar">
          <div className="titulo"><h2>Panel de administración</h2><p>Accesos según tu rol{sesion.esAdmin ? ' — tenés acceso a todo por ser superusuario' : ''}</p></div>
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
