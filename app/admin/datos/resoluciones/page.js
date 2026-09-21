'use client';
import { useSesion } from '@/lib/useSesion';
import Header from '@/components/Header';
import CrudSimple from '@/components/CrudSimple';

export default function Page() {
  const { sesion, cargando, autorizado } = useSesion(['directivo']);
  if (cargando) return null;
  if (autorizado === false) return (<><Header docente={null} /><main><div className="status error">No tenés permiso para ver esta pantalla.</div></main></>);
  return (
    <>
      <Header docente={{ nombre: sesion.email }} />
      <main>
        <CrudSimple
          tabla="resoluciones"
          titulo="Resoluciones"
          descripcion="Normativa que respalda planes de estudio y designaciones"
          orden={{ campo: 'fecha', asc: false }}
          campos={[
            { nombre: 'numero', etiqueta: 'Número', tipo: 'texto', requerido: true, placeholder: 'Ej: 1755/25' },
            { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'texto', placeholder: 'RM, CFE, Res. Interna...' },
            { nombre: 'organismo', etiqueta: 'Organismo', tipo: 'texto' },
            { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha' },
            { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'texto' },
          ]}
        />
      </main>
    </>
  );
}
