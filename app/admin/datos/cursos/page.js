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
          tabla="cursos"
          titulo="Cursos"
          descripcion="Un curso = plan de estudios + año + división + ciclo lectivo"
          orden={{ campo: 'anio' }}
          campos={[
            { nombre: 'plan_id', etiqueta: 'Plan de estudios', tipo: 'relacion', requerido: true, relacion: { tabla: 'planes_estudio', campoTexto: 'titulo' } },
            { nombre: 'ciclo_lectivo_id', etiqueta: 'Ciclo lectivo', tipo: 'relacion', requerido: true, relacion: { tabla: 'ciclos_lectivos', campoTexto: 'anio' } },
            { nombre: 'ciclo', etiqueta: 'Ciclo', tipo: 'texto', requerido: true, placeholder: 'Ciclo Básico o Ciclo Superior' },
            { nombre: 'anio', etiqueta: 'Año', tipo: 'numero', requerido: true },
            { nombre: 'division', etiqueta: 'División', tipo: 'texto', requerido: true },
            { nombre: 'turno', etiqueta: 'Turno', tipo: 'texto' },
          ]}
        />
      </main>
    </>
  );
}
