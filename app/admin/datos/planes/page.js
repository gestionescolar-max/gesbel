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
          tabla="planes_estudio"
          titulo="Planes de estudio"
          descripcion="Tecnicaturas y modalidades. Las materias de cada plan se cargan por SQL — avisame cuando tengas un plan nuevo."
          orden={{ campo: 'titulo' }}
          campos={[
            { nombre: 'resolucion_id', etiqueta: 'Resolución', tipo: 'relacion', requerido: true, relacion: { tabla: 'resoluciones', campoTexto: 'numero' } },
            { nombre: 'titulo', etiqueta: 'Título', tipo: 'texto', requerido: true },
            { nombre: 'modalidad', etiqueta: 'Modalidad', tipo: 'texto' },
            { nombre: 'especialidad', etiqueta: 'Especialidad', tipo: 'texto' },
            { nombre: 'anio_inicio', etiqueta: 'Año inicio', tipo: 'numero', requerido: true },
            { nombre: 'anio_fin', etiqueta: 'Año fin', tipo: 'numero', requerido: true },
            { nombre: 'vigente_desde', etiqueta: 'Vigente desde', tipo: 'fecha', requerido: true },
          ]}
        />
      </main>
    </>
  );
}
