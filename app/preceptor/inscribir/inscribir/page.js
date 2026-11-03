'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useSesion } from '@/lib/useSesion';
import Header from '@/components/Header';

export default function InscribirAlumnosPage() {
  const { sesion, cargando, autorizado } = useSesion(['preceptor', 'directivo']);
  const [cursos, setCursos] = useState([]);
  const [cursoId, setCursoId] = useState('');
  const [inscriptos, setInscriptos] = useState(null);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [dniNuevo, setDniNuevo] = useState('');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!autorizado) return;
    (async () => {
      let query = supabase.from('cursos').select('id, anio, division, ciclo').order('ciclo', { ascending: false }).order('anio').order('division');
      if (sesion.rol === 'preceptor' && !sesion.esAdmin) {
        const { data: asignados } = await supabase.from('preceptores_curso').select('curso_id').eq('profesor_id', sesion.profesorId ?? -1).is('vigente_hasta', null);
        const ids = (asignados || []).map((a) => a.curso_id);
        if (ids.length === 0) { setCursos([]); return; }
        query = query.in('id', ids);
      }
      const { data } = await query;
      setCursos(data || []);
    })();
  }, [autorizado, sesion]);

  async function cargarInscriptos(id) {
    setCursoId(id);
    if (!id) { setInscriptos(null); return; }
    const { data } = await supabase.from('inscripciones').select('id, condicion, alumnos ( id, nombre, dni )').eq('curso_id', id).order('alumnos(nombre)');
    setInscriptos(data || []);
  }

  async function agregarAlumno() {
    const nombre = nombreNuevo.trim();
    if (!nombre || !cursoId) return;
    setStatus({ tipo: 'loading', mensaje: 'Agregando…' });
    const { data: alumno, error: errAlumno } = await supabase.from('alumnos').upsert({ nombre, dni: dniNuevo.trim() || null }, { onConflict: 'nombre' }).select('id').single();
    if (errAlumno) { setStatus({ tipo: 'error', mensaje: errAlumno.message }); return; }
    const { error: errInsc } = await supabase.from('inscripciones').insert({ alumno_id: alumno.id, curso_id: cursoId });
    if (errInsc) { setStatus({ tipo: 'error', mensaje: errInsc.message.includes('duplicate') ? 'Ese alumno ya está inscripto en este curso.' : errInsc.message }); return; }
    setNombreNuevo(''); setDniNuevo('');
    setStatus({ tipo: 'ok', mensaje: `${nombre} agregado.` });
    cargarInscriptos(cursoId);
  }

  async function quitarInscripcion(inscripcionId) {
    const ok = window.confirm('¿Dar de baja a este alumno del curso? (no se borra su historial, solo la inscripción actual)');
    if (!ok) return;
    await supabase.from('inscripciones').delete().eq('id', inscripcionId);
    cargarInscriptos(cursoId);
  }

  if (cargando) return null;
  if (autorizado === false) return (<><Header docente={null} /><main><div className="status error">No tenés permiso para ver esta pantalla (hace falta rol de preceptor o directivo).</div></main></>);

  return (
    <>
      <Header docente={{ nombre: `${sesion.email} · preceptor` }} />
      <main>
        <div className="toolbar"><div className="titulo"><h2>Inscripción de alumnos</h2><p>Elegí el curso y agregá o quitá alumnos</p></div></div>
        <div className="field" style={{ maxWidth: 320, marginBottom: 20 }}>
          <label>Curso</label>
          <select value={cursoId} onChange={(e) => cargarInscriptos(e.target.value ? Number(e.target.value) : '')}>
            <option value="">— Elegí un curso —</option>
            {cursos.map((c) => <option key={c.id} value={c.id}>{c.anio}° {c.division} — {c.ciclo}</option>)}
          </select>
        </div>
        {cursos.length === 0 && (<div className="empty"><div className="icon">📭</div>No tenés cursos asignados como preceptor todavía.</div>)}
        {cursoId && (
          <>
            <div className="center-card" style={{ margin: '0 0 20px 0', maxWidth: 480 }}>
              <h2 style={{ marginBottom: 12 }}>Agregar alumno</h2>
              <div className="field"><label>Nombre completo</label><input value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} placeholder="Apellido Nombre" /></div>
              <div className="field"><label>DNI (opcional)</label><input value={dniNuevo} onChange={(e) => setDniNuevo(e.target.value)} placeholder="Si lo tenés a mano" /></div>
              <button className="btn block" onClick={agregarAlumno}>Agregar al curso</button>
              {status && <div className={`status ${status.tipo}`}>{status.mensaje}</div>}
            </div>
            {inscriptos === null && <div className="empty">Cargando…</div>}
            {inscriptos && inscriptos.length === 0 && <div className="empty">Todavía no hay alumnos inscriptos en este curso.</div>}
            {inscriptos && inscriptos.length > 0 && (
              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)', maxWidth: 560 }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                  <thead><tr style={{ background: 'var(--surface-2)' }}><th style={th}>Alumno</th><th style={th}>DNI</th><th style={th}>Condición</th><th style={th}></th></tr></thead>
                  <tbody>
                    {inscriptos.map((i) => (
                      <tr key={i.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={td}>{i.alumnos.nombre}</td>
                        <td style={td}>{i.alumnos.dni || '—'}</td>
                        <td style={td}>{i.condicion}</td>
                        <td style={td}><button onClick={() => quitarInscripcion(i.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 12 }}>Quitar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
const th = { padding: '8px 10px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.03em', color: 'var(--text-muted)' };
const td = { padding: '8px 10px' };
