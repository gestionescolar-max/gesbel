'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Header from '@/components/Header';

export default function InscribirPage() {
  const { docente, cargando } = useDocente();
  const [cursos, setCursos] = useState([]);
  const [cursoId, setCursoId] = useState('');
  const [alumnos, setAlumnos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [status, setStatus] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!docente) return;
    cargarCursosFP();
  }, [docente]);

  useEffect(() => {
    if (cursoId) cargarAlumnos();
  }, [cursoId]);

  async function cargarCursosFP() {
    const { data, error } = await supabase
      .from('cursos')
      .select('id, anio, division, ciclo, turno, modalidad, fp_perfiles ( nombre )')
      .eq('modalidad', 'FP')
      .order('ciclo', { ascending: false });

    if (error) {
      setStatus({ tipo: 'error', mensaje: error.message });
      return;
    }
    setCursos(data || []);
  }

  async function cargarAlumnos() {
    setStatus(null);
    const { data, error } = await supabase
      .from('inscripciones')
      .select('id, condicion, alumnos ( id, nombre, dni, legajo )')
      .eq('curso_id', cursoId)
      .order('alumnos(nombre)');

    if (error) {
      setStatus({ tipo: 'error', mensaje: error.message });
      return;
    }
    setAlumnos(data || []);
  }

  async function agregarAlumno() {
    if (!nombre.trim()) {
      setStatus({ tipo: 'error', mensaje: 'El nombre es obligatorio' });
      return;
    }
    setStatus({ tipo: 'loading', mensaje: 'Agregando alumno...' });

    // 1. Crear o actualizar alumno
    const { data: alumno, error: errAlumno } = await supabase
      .from('alumnos')
      .upsert({ nombre: nombre.trim(), dni: dni.trim() || null }, { onConflict: 'nombre' })
      .select('id')
      .single();

    if (errAlumno) {
      setStatus({ tipo: 'error', mensaje: errAlumno.message });
      return;
    }

    // 2. Inscribirlo en el curso
    const { error: errInsc } = await supabase
      .from('inscripciones')
      .insert({
        alumno_id: alumno.id,
        curso_id: cursoId,
        condicion: 'Regular',
        fecha_inscripcion: new Date().toISOString().split('T')[0]
      });

    if (errInsc) {
      setStatus({ tipo: 'error', mensaje: errInsc.message });
      return;
    }

    setNombre('');
    setDni('');
    setStatus({ tipo: 'ok', mensaje: 'Alumno inscripto correctamente' });
    cargarAlumnos();
  }

  async function quitarAlumno(inscId) {
    if (!confirm('¿Seguro que querés quitar a este alumno del curso?')) return;

    const { error } = await supabase.from('inscripciones').delete().eq('id', inscId);
    if (error) {
      setStatus({ tipo: 'error', mensaje: error.message });
      return;
    }
    cargarAlumnos();
  }

  if (cargando || !docente) return null;

  return (
    <>
      <Header docente={docente} />
      <main>
        <div className="toolbar">
          <div className="titulo">
            <h2>Inscripción de alumnos - Formación Profesional</h2>
            <p>Gestioná los alumnos de todas las comisiones FP</p>
          </div>
        </div>

        <div className="field" style={{ maxWidth: 500 }}>
          <label>Seleccionar Comisión FP</label>
          <select value={cursoId} onChange={(e) => setCursoId(e.target.value)}>
            <option value="">-- Elegí un curso --</option>
            {cursos.map(c => (
              <option key={c.id} value={c.id}>
                🌙 {c.fp_perfiles?.nombre || 'Perfil FP'} — {c.ciclo} {c.turno ? `(${c.turno})` : ''}
              </option>
            ))}
          </select>
        </div>

        {cursoId && (
          <>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>Agregar nuevo alumno</h3>
              <div className="field">
                <label>Nombre y Apellido</label>
                <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: PEREZ, Juan Carlos" />
              </div>
              <div className="field">
                <label>DNI (opcional)</label>
                <input type="text" value={dni} onChange={(e) => setDni(e.target.value)} placeholder="12345678" />
              </div>
              <button className="btn" onClick={agregarAlumno}>Inscribir Alumno</button>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>Alumnos inscriptos ({alumnos.length})</h3>
              {alumnos.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay alumnos inscriptos en esta comisión todavía.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {alumnos.map(i => (
                    <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{i.alumnos.nombre}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {i.alumnos.dni ? `DNI: ${i.alumnos.dni}` : 'Sin DNI'}
                          {i.alumnos.legajo ? ` · Legajo: ${i.alumnos.legajo}` : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => quitarAlumno(i.id)}
                        style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {status && <div className={`status ${status.tipo}`} style={{ marginTop: 16 }}>{status.mensaje}</div>}
      </main>
    </>
  );
}