'use client';
import { useSesion } from '@/lib/useSesion';
import Header from '@/components/Header';
import CrudSimple from '@/components/CrudSimple';

export default function Page() {
  const { sesion, cargando, autorizado } = useSesion(['secretario', 'directivo']);
  if (cargando) return null;
  if (autorizado === false) return (<><Header docente={null} /><main><div className="status error">No tenés permiso para ver esta pantalla.</div></main></>);
  return (
    <>
      <Header docente={{ nombre: sesion.email }} />
      <main>
        <CrudSimple
          tabla="profesores"
          titulo="Profesores"
          descripcion="Alta y edición de profesores"
          orden={{ campo: 'nombre' }}
          campos={[
            { nombre: 'nombre', etiqueta: 'Nombre completo', tipo: 'texto', requerido: true },
            { nombre: 'dni', etiqueta: 'DNI', tipo: 'texto' },
            { nombre: 'email', etiqueta: 'Email', tipo: 'texto' },
            { nombre: 'activo', etiqueta: 'Activo', tipo: 'checkbox' },
          ]}
        />
      </main>
    </>
  );
}
