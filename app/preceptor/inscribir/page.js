'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Header from '@/components/Header';

export default function InscribirPage() {
  const { docente, cargando } = useDocente();
  const [cursosFP, setCursosFP] = useState([]);
  const [cursosSec, setCursosSec] = useState([]);
  const [cursoId, setCursoId] = useState('');
  const [tipoCurso, setTipoCurso] = useState(null);
  const [alumnos, setAlumnos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [fechaNac, setFechaNac] = useState('');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!docente) return;
    cargarCursos();
  }, [docente]);

  useEffect(() => {
    if (cursoId) cargarAlumnos();
  }, [cursoId]);

  async function cargarCursos() {
    // 1. Cargar cursos de Secundario (asignados al preceptor)
    const { data: dataSec, error: errSec } = await supabase
      .from('preceptores_curso')
      .select('curso_id, cursos ( id, anio, division, ciclo, turno )')
      .eq('profesor_id', docente.id);

    if (errSec) console.error('Error Secundario:', errSec);
    const cursosSecundario = dataSec?.map(d => d.cursos).filter(Boolean) || [];
    setCursosSec(cursosSecundario);

    // 2. Cargar cursos de FP (asignados al preceptor)
    const { data: dataFP, error: errFP } = await supabase
      .from('fp_cursos_preceptores')
      .select('fp_curso_id, fp_cursos ( id, nombre, anio, turno, cupo )')
      .eq('profesor_id', docente.id);

    if (errFP) console.error('Error FP:', errFP);
    const cursosFPList = dataFP?.map(d => d.fp_cursos).filter(Boolean) || [];
    setCursosFP(cursosFPList);

    // 3. Si no tiene cursos asignados en ninguna tabla, mostrar mensaje
    if (cursosSecundario.length === 0 && cursosFPList.length === 0) {
      setStatus({ tipo: 'error', mensaje: 'No tenés cursos asignados. Contactá al administrador.' });
    }
  }

  async function cargarAlumnos() {
    setStatus(null);
    if (!cursoId || !tipoCurso) return;

    if (tipoCurso === 'fp') {
      const { data, error } = await supabase
        .from('fp_inscripciones')
        .select('*')
        .eq('fp_curso_id', cursoId)
        .order('nombre');
      if (error) { setStatus({ tipo: 'error', mensaje: error.message }); return; }
      setAlumnos(data || []);
    } else {
      const { data, error } = await supabase
        .from('inscripciones')
        .select('id, condicion, alumnos ( id, nombre, dni, legajo )')
        .eq('curso_id', cursoId)
        .order('alumnos(nombre)');
      if (error) { setStatus({ tipo: 'error', mensaje: error.message }); return; }
      setAlumnos(data || []);
    }
  }

  async function agregarAlumno() {
    if (!nombre.trim()) {
      setStatus({ tipo: 'error', mensaje: 'El nombre es obligatorio' });
      return;
    }
    setStatus({ tipo: 'loading', mensaje: 'Inscribiendo...' });

    if (tipoCurso === 'fp') {
      const { error } = await supabase
        .from('fp_inscripciones')
        .insert({
          fp_curso_id: cursoId,
          nombre: nombre.trim(),
          dni: dni.trim() || null,
          telefono: telefono.trim() || null,
          email: email.trim() || null,
          fecha_nac: fechaNac || null,
          fecha_inscripcion: new Date().toISOString().split('T')[0],
          estado: 'activo'
        });
      if (error) { setStatus({ tipo: 'error', mensaje: error.message }); return; }
    } else {
      const { data: alumno, error: errAlumno } = await supabase
        .from('alumnos')
        .upsert({ nombre: nombre.trim(), dni: dni.trim() || null }, { onConflict: 'nombre' })
        .select('id')
        .single();
      if (errAlumno) { setStatus({ tipo: 'error', mensaje: errAlumno.message }); return; }

      const { error: errInsc } = await supabase
        .from('inscripciones')
        .insert({
          alumno_id: alumno.id,
          curso_id: cursoId,
          condicion: 'Regular',
          fecha_inscripcion: new Date().toISOString().split('T')[0]
        });
      if (errInsc) { setStatus({ tipo: 'error', mensaje: errInsc.message }); return; }
    }

    setNombre(''); setDni(''); setTelefono(''); setEmail(''); setFechaNac('');
    setStatus({ tipo: 'ok', mensaje: 'Alumno inscripto correctamente' });
    cargarAlumnos();
  }

  async function quitarAlumno(inscId) {
    if (!confirm('¿Seguro que querés quitar a este alumno?')) return;
    const tabla = tipoCurso === 'fp' ? 'fp_inscripciones' : 'inscripciones';
    const { error } = await supabase.from(tabla).delete().eq('id', inscId);
    if (error) { setStatus({ tipo: 'error', mensaje: error.message }); return; }
    cargarAlumnos();
  }

  function handleCursoChange(e) {
    const val = e.target.value;
    if (!val) { setCursoId(''); setTipoCurso(null); setAlumnos([]); return; }
    const [tipo, id] = val.split('-');
    setCursoId(id);
    setTipoCurso(tipo);
  }

  if (cargando || !docente) return null;

  return (
    <>
      <Header docente={docente} />
      <main>
        <div className="toolbar">
          <div className="titulo">
            <h2>Inscripción de alumnos</h2>
            <p>Gestioná alumnos de FP y Secundario</p>
          </div>
        </div>

        {status && <div className={`status ${status.tipo}`}>{status.mensaje}</div>}

        <div className="field" style={{ maxWidth: 600 }}>
          <label>Seleccionar Curso</label>
          <select value={cursoId ? `${tipoCurso}-${cursoId}` : ''} onChange={handleCursoChange}>
            <option value="">-- Elegí un curso --</option>

            {cursosSec.length > 0 && (
              <optgroup label="📚 Secundario">
                {cursosSec.map(c => (
                  <option key={`sec-${c.id}`} value={`sec-${c.id}`}>
                    {c.anio}° {c.division} — {c.ciclo} {c.turno ? `(${c.turno})` : ''}
                  </option>
                ))}
              </optgroup>
            )}

            {cursosFP.length > 0 && (
              <optgroup label="🌙 Formación Profesional">
                {cursosFP.map(c => (
                  <option key={`fp-${c.id}`} value={`fp-${c.id}`}>
                    {c.nombre} ({c.turno}) — Cupo: {c.cupo}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {cursoId && (
          <>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>
                Agregar nuevo alumno {tipoCurso === 'fp' ? '(FP)' : '(Secundario)'}
              </h3>
              <div className="field">
                <label>Nombre y Apellido *</label>
                <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: PEREZ, Juan Carlos" />
              </div>
              <div className="field">
                <label>DNI</label>
                <input type="text" value={dni} onChange={(e) => setDni(e.target.value)} placeholder="12345678" />
              </div>
              {tipoCurso === 'fp' && (
                <>
                  <div className="field">
                    <label>Fecha de nacimiento</label>
                    <input type="date" value={fechaNac} onChange={(e) => setFechaNac(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Teléfono</label>
                    <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="2345-123456" />
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alumno@ejemplo.com" />
                  </div>
                </>
              )}
              <button className="btn" onClick={agregarAlumno}>Inscribir Alumno</button>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>
                Alumnos inscriptos ({alumnos.length})
              </h3>
              {alumnos.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay alumnos inscriptos en este curso.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {alumnos.map(i => {
                    const nombreAlumno = tipoCurso === 'fp' ? i.nombre : i.alumnos?.nombre;
                    const dniAlumno = tipoCurso === 'fp' ? i.dni : i.alumnos?.dni;
                    const extra = tipoCurso === 'fp'
                      ? `${i.telefono ? `Tel: ${i.telefono}` : ''} ${i.email ? `· ${i.email}` : ''}`
                      : `Legajo: ${i.alumnos?.legajo || 'N/A'} ${i.condicion ? `· ${i.condicion}` : ''}`;

                    return (
                      <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{nombreAlumno || 'Sin nombre'}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {dniAlumno ? `DNI: ${dniAlumno}` : 'Sin DNI'} {extra && `· ${extra}`}
                          </div>
                        </div>
                        <button
                          onClick={() => quitarAlumno(i.id)}
                          style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                        >
                          Quitar
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}