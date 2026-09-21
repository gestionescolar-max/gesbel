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
          tabla="institucion"
          titulo="Institución"
          descripcion="Datos de la escuela — en la práctica, una sola fila"
          campos={[
            { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true },
            { nombre: 'cue', etiqueta: 'CUE', tipo: 'texto' },
            { nombre: 'tipo_gestion', etiqueta: 'Tipo de gestión', tipo: 'texto', placeholder: 'estatal / privada' },
            { nombre: 'domicilio', etiqueta: 'Domicilio', tipo: 'texto' },
            { nombre: 'localidad', etiqueta: 'Localidad', tipo: 'texto' },
            { nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'texto' },
            { nombre: 'email', etiqueta: 'Email', tipo: 'texto' },
          ]}
        />
        <div style={{ marginTop: 32 }}>
          <CrudSimple
            tabla="institucion_autoridades"
            titulo="Autoridades"
            descripcion="Rector, vicerrector, secretario/a — con historial: al cambiar de gestión, cargá una fila nueva"
            orden={{ campo: 'cargo' }}
            campos={[
              { nombre: 'institucion_id', etiqueta: 'Institución', tipo: 'relacion', requerido: true, relacion: { tabla: 'institucion', campoTexto: 'nombre' } },
              { nombre: 'cargo', etiqueta: 'Cargo', tipo: 'texto', requerido: true, placeholder: 'rector, vicerrector...' },
              { nombre: 'nombre', etiqueta: 'Nombre completo', tipo: 'texto', requerido: true },
              { nombre: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true },
              { nombre: 'hasta', etiqueta: 'Hasta (vacío = en funciones)', tipo: 'fecha' },
            ]}
          />
        </div>
      </main>
    </>
  );
}
