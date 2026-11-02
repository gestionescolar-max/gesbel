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
          tabla="ofertas_fp"
          titulo="Ofertas de Formación Profesional"
          descripcion="Cursos y talleres de FP que la escuela propone para cada ciclo lectivo. Los preceptores anotan alumnos en Preinscripción FP."
          orden={{ campo: 'titulo' }}
          campos={[
            { nombre: 'titulo', etiqueta: 'Título de la oferta', tipo: 'texto', requerido: true, placeholder: 'Ej: Soldadura básica' },
            { nombre: 'especialidad', etiqueta: 'Especialidad', tipo: 'texto', placeholder: 'Ej: Industria, Informática, Servicios' },
            { nombre: 'ciclo_lectivo_id', etiqueta: 'Ciclo lectivo', tipo: 'relacion', requerido: true, relacion: { tabla: 'ciclos_lectivos', campoTexto: 'anio' }, ayuda: 'Para las ofertas del ciclo 2027 elegí 2027.' },
            { nombre: 'plan_id', etiqueta: 'Plan / tecnicatura de referencia', tipo: 'relacion', relacion: { tabla: 'planes_estudio', campoTexto: 'titulo' }, ayuda: 'Opcional — se usa si desde la preinscripción se genera un curso nuevo.' },
            { nombre: 'preceptor_id', etiqueta: 'Preceptor responsable', tipo: 'relacion', relacion: { tabla: 'profesores', campoTexto: 'nombre' } },
            { nombre: 'cupo', etiqueta: 'Cupo máximo', tipo: 'numero', ayuda: 'Dejar vacío si no hay límite.' },
            { nombre: 'horario', etiqueta: 'Horario', tipo: 'texto', placeholder: 'Ej: Martes y jueves 18 a 21 hs' },
            { nombre: 'aula', etiqueta: 'Aula', tipo: 'texto' },
            { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'texto' },
            { nombre: 'activa', etiqueta: 'Activa (visible para preinscribir)', tipo: 'checkbox' },
          ]}
        />
      </main>
    </>
  );
}
