'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Header from '@/components/Header';

const NOTA_APROBACION = 7;

// ═══════════════════════════════════════════════════════════════════════
// Funciones de cálculo — SIN CAMBIOS respecto al diseño original.
// ═══════════════════════════════════════════════════════════════════════
function promedioDecimal(notas) {
  const v = notas.filter((n) => n !== null && n !== '' && !isNaN(n));
  if (v.length === 0) return null;
  return Math.round((v.reduce((a, b) => a + Number(b), 0) / v.length) * 100) / 100;
}
function promedioCuatrimestral(notas) {
  const v = notas.filter((n) => n !== null && n !== '' && !isNaN(n));
  if (v.length === 0) return null;
  return Math.round(v.reduce((a, b) => a + Number(b), 0) / v.length);
}
function fechaHoy() {
  return new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function notaValida(raw, min, max) {
  if (raw === '') return { ok: true, valor: null };
  if (!/^\d+$/.test(raw)) return { ok: false };
  const n = Number(raw);
  if (n < min || n > max) return { ok: false };
  return { ok: true, valor: n };
}
function fmt2(v) {
  return v === null || v === undefined ? '—' : Number(v).toFixed(2);
}
function crearCuatrimestre(n) {
  return { trayectorias: Array(n).fill(null), compensacion: null, listo: false, firmado: false, fechaFirma: null };
}
function calcularCuatrimestre(c) {
  const prom = promedioCuatrimestral(c.trayectorias);
  const habilitaCompensacion = prom !== null && prom < NOTA_APROBACION;
  // La compensación es una nota independiente (máx. 7) — cuando existe,
  // reemplaza directamente al promedio de trayectorias, no se promedia
  // ni se compara con él.
  return { promedioTrayectorias: prom, habilitaCompensacion, notaCuatrimestre: habilitaCompensacion ? c.compensacion : prom };
}
function calcularEstado(alumno) {
  const c1 = calcularCuatrimestre(alumno.cuat1);
  const c2 = calcularCuatrimestre(alumno.cuat2);
  let anual = c1.notaCuatrimestre !== null && c2.notaCuatrimestre !== null ? promedioDecimal([c1.notaCuatrimestre, c2.notaCuatrimestre]) : null;
  let definitiva = null, condicion = 'cursando', instancia = 'cuatrimestres';
  if (anual !== null) {
    if (anual >= NOTA_APROBACION) { definitiva = anual; condicion = 'aprobado'; instancia = 'anual'; }
    else if (alumno.intensificacion !== null) {
      if (alumno.intensificacion >= NOTA_APROBACION) { definitiva = alumno.intensificacion; condicion = 'aprobado'; instancia = 'intensificacion'; }
      else if (alumno.mesaExamen !== null) {
        instancia = 'mesa';
        if (alumno.mesaExamen >= NOTA_APROBACION) { definitiva = alumno.mesaExamen; condicion = 'aprobado'; }
        else condicion = 'previa';
      } else { condicion = 'previa'; instancia = 'mesa'; }
    } else { condicion = 'pendiente-intensificacion'; instancia = 'intensificacion'; }
  }
  return { c1, c2, anual, definitiva, condicion, instancia };
}
function contarEtapa(filas, extractor) {
  const valores = filas.map(extractor).filter((v) => v !== null && v !== undefined);
  const aprobados = valores.filter((v) => v >= NOTA_APROBACION).length;
  return { aprobados, desaprobados: valores.length - aprobados, total: valores.length };
}

// ═══════════════════════════════════════════════════════════════════════
// Capa de datos: acá está TODO lo nuevo — leer y guardar en Supabase.
// El resto del archivo (las dos pantallas) es el diseño original casi
// sin tocar.
// ═══════════════════════════════════════════════════════════════════════
const NOMBRES_TRAYECTORIA = (n) => Array.from({ length: n }, (_, i) => `Trayectoria ${i + 1}`);

async function asegurarEvaluaciones(materiaId, cantidadPorCuat) {
  const { data: existentes } = await supabase.from('evaluaciones').select('id, nombre, cuatrimestre').eq('materia_id', materiaId);
  const mapa = {};
  (existentes || []).forEach((e) => { mapa[`${e.cuatrimestre}_${e.nombre}`] = e.id; });

  const faltantes = [];
  for (const cuat of [1, 2]) {
    for (const nombre of [...NOMBRES_TRAYECTORIA(cantidadPorCuat[cuat]), 'Compensación']) {
      if (!mapa[`${cuat}_${nombre}`]) {
        faltantes.push({ materia_id: materiaId, cuatrimestre: cuat, nombre, tipo: nombre === 'Compensación' ? 'compensacion' : 'evaluacion' });
      }
    }
  }
  if (faltantes.length > 0) {
    const { data: creadas } = await supabase.from('evaluaciones').insert(faltantes).select('id, nombre, cuatrimestre');
    (creadas || []).forEach((e) => { mapa[`${e.cuatrimestre}_${e.nombre}`] = e.id; });
  }
  return mapa;
}

function contarTrayectoriasExistentes(evaluacionesRaw, cuat) {
  const nombres = evaluacionesRaw.filter((e) => e.cuatrimestre === cuat && e.nombre.startsWith('Trayectoria')).map((e) => e.nombre);
  return nombres.length || 3;
}

export default function MateriaPage() {
  const { id: materiaId } = useParams();
  const router = useRouter();

  const { docente, cargando: cargandoDocente } = useDocente();
  const [catedra, setCatedra] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [evalIds, setEvalIds] = useState({});
  const [cuatrimestre, setCuatrimestre] = useState(1);
  const [cantidad, setCantidad] = useState({ 1: 3, 2: 3 });
  const [vista, setVista] = useState('configuracion');
  const [alumnos, setAlumnos] = useState([]);

  useEffect(() => {
    if (!docente) return;
    (async () => {
      setCargando(true);
      const { data: m, error: errM } = await supabase
        .from('materias')
        .select(`id, grupo, curso_id, plan_materias ( nombre ), cursos ( anio, division, ciclo )`)
        .eq('id', materiaId)
        .single();

      if (errM || !m) { setError(errM?.message || 'No se encontró la materia'); setCargando(false); return; }
      setCatedra({
        materia: m.plan_materias.nombre + (m.grupo ? ` — ${m.grupo}` : ''),
        curso: `${m.cursos.anio}° ${m.cursos.division} · ${m.cursos.ciclo}`,
      });

      const { data: inscriptos } = await supabase
        .from('inscripciones')
        .select('alumnos ( id, nombre )')
        .eq('curso_id', m.curso_id)
        .order('alumnos(nombre)');
      const listaAlumnos = (inscriptos || []).map((i) => i.alumnos).filter(Boolean);

      if (listaAlumnos.length === 0) {
        setAlumnos([]);
        setCargando(false);
        return;
      }

      const { data: evaluacionesRaw } = await supabase.from('evaluaciones').select('id, nombre, cuatrimestre').eq('materia_id', materiaId);
      const cant1 = contarTrayectoriasExistentes(evaluacionesRaw || [], 1);
      const cant2 = contarTrayectoriasExistentes(evaluacionesRaw || [], 2);
      setCantidad({ 1: cant1, 2: cant2 });

      const mapaEval = await asegurarEvaluaciones(materiaId, { 1: cant1, 2: cant2 });
      setEvalIds(mapaEval);

      const idsEval = Object.values(mapaEval);
      const [neRes, cRes] = await Promise.all([
        idsEval.length > 0
          ? supabase.from('notas_evaluaciones').select('evaluacion_id, alumno_id, nota').in('evaluacion_id', idsEval)
          : Promise.resolve({ data: [] }),
        supabase.from('calificaciones').select('alumno_id, periodo, nota, firmado, fecha_firma').eq('materia_id', materiaId),
      ]);
      const ne = neRes.data, c = cRes.data;

      const notaEval = (evalId, alumnoId) => {
        const fila = (ne || []).find((n) => n.evaluacion_id === evalId && n.alumno_id === alumnoId);
        return fila ? fila.nota : null;
      };
      const califAlumno = (alumnoId, periodo) => (c || []).find((x) => x.alumno_id === alumnoId && x.periodo === periodo);

      const alumnosCargados = listaAlumnos.map((al) => {
        const cuat1 = crearCuatrimestre(cant1);
        const cuat2 = crearCuatrimestre(cant2);
        for (let i = 0; i < cant1; i++) cuat1.trayectorias[i] = notaEval(mapaEval[`1_Trayectoria ${i + 1}`], al.id);
        for (let i = 0; i < cant2; i++) cuat2.trayectorias[i] = notaEval(mapaEval[`2_Trayectoria ${i + 1}`], al.id);
        cuat1.compensacion = notaEval(mapaEval['1_Compensación'], al.id);
        cuat2.compensacion = notaEval(mapaEval['2_Compensación'], al.id);

        const c1oficial = califAlumno(al.id, 'cuat1');
        const c2oficial = califAlumno(al.id, 'cuat2');
        cuat1.firmado = c1oficial?.firmado || false;
        cuat1.fechaFirma = c1oficial?.fecha_firma || null;
        cuat2.firmado = c2oficial?.firmado || false;
        cuat2.fechaFirma = c2oficial?.fecha_firma || null;

        return {
          id: al.id,
          nombre: al.nombre,
          cuat1, cuat2,
          intensificacion: califAlumno(al.id, 'intensificacion')?.nota ?? null,
          mesaExamen: califAlumno(al.id, 'mesa_examen')?.nota ?? null,
        };
      });

      setAlumnos(alumnosCargados);
      setCargando(false);
    })();
  }, [docente, materiaId]);

  const guardarTrayectoria = useCallback(async (cuat, idx, alumnoId, valor) => {
    const evalId = evalIds[`${cuat}_Trayectoria ${idx + 1}`];
    if (!evalId) return;
    await supabase.from('notas_evaluaciones').upsert(
      { evaluacion_id: evalId, alumno_id: alumnoId, nota: valor },
      { onConflict: 'evaluacion_id,alumno_id' }
    );
  }, [evalIds]);

  const guardarCompensacion = useCallback(async (cuat, alumnoId, valor) => {
    const evalId = evalIds[`${cuat}_Compensación`];
    if (!evalId) return;
    await supabase.from('notas_evaluaciones').upsert(
      { evaluacion_id: evalId, alumno_id: alumnoId, nota: valor },
      { onConflict: 'evaluacion_id,alumno_id' }
    );
  }, [evalIds]);

  const guardarCalificacionOficial = useCallback(async (alumnoId, periodo, nota) => {
    await supabase.from('calificaciones').upsert(
      { alumno_id: alumnoId, materia_id: materiaId, periodo, nota },
      { onConflict: 'alumno_id,materia_id,periodo' }
    );
  }, [materiaId]);

  const sincronizarOficiales = useCallback((alumno) => {
    const estado = calcularEstado(alumno);
    guardarCalificacionOficial(alumno.id, 'cuat1', estado.c1.notaCuatrimestre);
    guardarCalificacionOficial(alumno.id, 'cuat2', estado.c2.notaCuatrimestre);
    guardarCalificacionOficial(alumno.id, 'anual', estado.anual);
    if (estado.definitiva !== null) guardarCalificacionOficial(alumno.id, 'definitiva', estado.definitiva);
  }, [guardarCalificacionOficial]);

  const guardarIntensificacion = useCallback(async (alumnoId, valor) => {
    await guardarCalificacionOficial(alumnoId, 'intensificacion', valor);
  }, [guardarCalificacionOficial]);

  const guardarMesaExamen = useCallback(async (alumnoId, valor) => {
    await guardarCalificacionOficial(alumnoId, 'mesa_examen', valor);
  }, [guardarCalificacionOficial]);

  const firmar = useCallback(async (alumnoIds, cuat) => {
    const periodo = cuat === 1 ? 'cuat1' : 'cuat2';
    const hoy = new Date().toISOString().slice(0, 10);
    for (const alumnoId of alumnoIds) {
      await supabase.from('calificaciones')
        .update({ firmado: true, fecha_firma: hoy })
        .eq('alumno_id', alumnoId).eq('materia_id', materiaId).eq('periodo', periodo);
    }
  }, [materiaId]);

  function ajustarCantidad(cuat, nueva) {
    if (nueva < 1) return;
    const clave = cuat === 1 ? 'cuat1' : 'cuat2';
    setCantidad((prev) => ({ ...prev, [cuat]: nueva }));
    setAlumnos((prev) => prev.map((a) => {
      const clon = structuredClone(a);
      const arr = clon[clave].trayectorias;
      clon[clave].trayectorias = nueva > arr.length ? [...arr, ...Array(nueva - arr.length).fill(null)] : arr.slice(0, nueva);
      return clon;
    }));
  }

  const progreso = {
    1: { firmados: alumnos.filter((a) => a.cuat1.firmado).length, total: alumnos.length },
    2: { firmados: alumnos.filter((a) => a.cuat2.firmado).length, total: alumnos.length },
  };

  if (cargandoDocente || !docente) return null;

  return (
    <>
      <Header docente={docente} />
      <main>
        <button className="back" style={{ marginBottom: 12 }} onClick={() => router.push('/materias')}>← Volver a mis materias</button>

        {cargando && <div className="empty">Cargando…</div>}
        {error && <div className="status error">{error}</div>}

        {!cargando && !error && alumnos.length === 0 && (
          <div className="empty">
            <div className="icon">👥</div>
            Todavía no hay alumnos inscriptos en este curso en el sistema.
          </div>
        )}

        {!cargando && !error && alumnos.length > 0 && catedra && (
          <PlanillaRoot
            docente={docente.nombre}
            catedra={catedra}
            cuatrimestre={cuatrimestre} setCuatrimestre={setCuatrimestre}
            cantidad={cantidad} ajustarCantidad={ajustarCantidad}
            vista={vista} setVista={setVista}
            alumnos={alumnos} setAlumnos={setAlumnos}
            progreso={progreso}
            onGuardarTrayectoria={guardarTrayectoria}
            onGuardarCompensacion={guardarCompensacion}
            onGuardarIntensificacion={guardarIntensificacion}
            onGuardarMesaExamen={guardarMesaExamen}
            onSincronizarOficiales={sincronizarOficiales}
            onFirmar={firmar}
          />
        )}
      </main>
    </>
  );
}

function PantallaConfiguracion({ docente, catedra, cuatrimestre, setCuatrimestre, cantidad, ajustarCantidad, progreso, onContinuar }) {
  const p = progreso[cuatrimestre];
  const hayFirmados = p.firmados > 0;

  return (
    <div className="pantalla-config">
      <p className="eyebrow">Cuaderno del docente · {docente}</p>
      <h1>{catedra.materia}</h1>
      <p style={{ fontSize: 13, color: 'var(--tinta-60)', marginTop: 4, marginBottom: 20 }}>{catedra.curso}</p>

      <div className="campo-config">
        <label>Cuatrimestre</label>
        <div className="tabs-cuat">
          {[1, 2].map((n) => (
            <button key={n} className={`tab-cuat ${cuatrimestre === n ? 'tab-cuat-activo' : ''}`} onClick={() => setCuatrimestre(n)}>
              {n === 1 ? '1er cuatrimestre' : '2do cuatrimestre'}
            </button>
          ))}
        </div>
      </div>

      <div className="campo-config">
        <label>Cantidad de trayectorias a evaluar</label>
        {hayFirmados ? (
          <p className="nota-cerrado-config">Ya hay {p.firmados} alumno(s) firmado(s) en este cuatrimestre — la cantidad queda fija en {cantidad[cuatrimestre]} para no descuadrar la planilla.</p>
        ) : (
          <div className="stepper">
            <button className="btn-mini" disabled={cantidad[cuatrimestre] <= 1} onClick={() => ajustarCantidad(cuatrimestre, cantidad[cuatrimestre] - 1)}>−</button>
            <span>{cantidad[cuatrimestre]}</span>
            <button className="btn-mini" onClick={() => ajustarCantidad(cuatrimestre, cantidad[cuatrimestre] + 1)}>+</button>
          </div>
        )}
      </div>

      <div className="aviso-progreso">
        {p.firmados} de {p.total} alumnos firmados en {cuatrimestre === 1 ? 'el 1er' : 'el 2do'} cuatrimestre.
      </div>

      <button className="btn-primario btn-grande" onClick={onContinuar}>Continuar a la carga de notas →</button>
    </div>
  );
}

function PantallaCarga({
  docente, catedra, cuatrimestre, alumnos, setAlumnos, onVolver,
  onGuardarTrayectoria, onGuardarCompensacion, onGuardarIntensificacion, onGuardarMesaExamen,
  onSincronizarOficiales, onFirmar,
}) {
  const clave = cuatrimestre === 1 ? 'cuat1' : 'cuat2';
  const claveEstado = cuatrimestre === 1 ? 'c1' : 'c2';
  const [soloMesa, setSoloMesa] = useState(false);

  function actualizar(id, updater) {
    setAlumnos((prev) => prev.map((a) => (a.id === id ? updater(structuredClone(a)) : a)));
  }

  const filas = useMemo(() => alumnos.map((a) => ({ alumno: a, estado: calcularEstado(a) })), [alumnos]);
  const pendientesMesa = filas.filter((f) => f.estado.condicion === 'previa');
  const filasVisibles = soloMesa ? pendientesMesa : filas;
  const resumen = contarEtapa(filas, (f) => f.estado[claveEstado].notaCuatrimestre);
  const listosSinFirmar = alumnos.filter((a) => a[clave].listo && !a[clave].firmado);
  const firmados = alumnos.filter((a) => a[clave].firmado).length;
  const todosListos = alumnos.every((a) => a[clave].listo || a[clave].firmado);

  function alternarListo(id) {
    actualizar(id, (a) => { a[clave].listo = !a[clave].listo; return a; });
  }
  function alternarTodos() {
    const marcar = !todosListos;
    setAlumnos((prev) => prev.map((a) => {
      const clon = structuredClone(a);
      if (!clon[clave].firmado) clon[clave].listo = marcar;
      return clon;
    }));
  }
  async function firmarTotal() {
    if (listosSinFirmar.length === 0) return;
    const ok = window.confirm(
      `Vas a firmar la calificación del ${cuatrimestre === 1 ? '1er' : '2do'} cuatrimestre de ${listosSinFirmar.length} alumno(s) en ${catedra.materia} (${catedra.curso}).\n\nUna vez firmadas, esas notas no se van a poder modificar.`
    );
    if (!ok) return;
    const hoy = fechaHoy();
    const ids = listosSinFirmar.map((a) => a.id);
    setAlumnos((prev) => prev.map((a) => {
      if (!a[clave].listo || a[clave].firmado) return a;
      const clon = structuredClone(a);
      clon[clave].firmado = true;
      clon[clave].fechaFirma = hoy;
      return clon;
    }));
    await onFirmar(ids, cuatrimestre);
  }
  function imprimir() { window.print(); }

  return (
    <div className="pantalla-carga">
      <div className="barra-superior no-imprimir">
        <button className="btn-volver" onClick={onVolver}>← Cambiar cuatrimestre / cantidad</button>
        <div className="barra-acciones">
          {cuatrimestre === 2 && pendientesMesa.length > 0 && (
            <button className={`btn-secundario ${soloMesa ? 'btn-secundario-activo' : ''}`} onClick={() => setSoloMesa((v) => !v)}>
              {soloMesa ? 'Ver todos' : `Pendientes de mesa (${pendientesMesa.length})`}
            </button>
          )}
          <button className="btn-secundario" onClick={imprimir}>Imprimir planilla</button>
          <button className="btn-firmar" disabled={listosSinFirmar.length === 0} onClick={firmarTotal}>
            Firmar {listosSinFirmar.length > 0 ? `(${listosSinFirmar.length})` : 'total'}
          </button>
        </div>
      </div>

      <div className="encabezado-catedra">
        <div className="identidad-docente">
          <p className="eyebrow">
            <span className="solo-pantalla">Cuaderno del docente</span>
            <span className="solo-imprimir">Planilla de Calificaciones — {catedra.materia}</span>
          </p>
          <h2>{docente}</h2>
        </div>
        <div className="chip-catedra">
          <span className="chip-catedra-materia">{catedra.materia}</span>
          <span className="chip-catedra-curso">{catedra.curso}</span>
        </div>
        <div className="tag-lateral">
          <span className="tag-cuat">{cuatrimestre === 1 ? '1er' : '2do'} cuatrimestre · {firmados}/{alumnos.length} firmados</span>
        </div>
      </div>

      <div className="layout">
        <div className="tabla-wrap">
          <table>
            <thead>
              <tr className="grupo">
                <th colSpan={2}></th>
                {cuatrimestre === 2 && <th>Nota del 1er cuatrimestre</th>}
                <th colSpan={alumnos[0][clave].trayectorias.length + 2}>
                  {cuatrimestre === 1 ? '1er cuatrimestre — trayectorias y compensación' : '2do cuatrimestre — trayectorias y compensación'}
                </th>
                {cuatrimestre === 2 && <th colSpan={4}>Intensificación, mesa, anual y definitiva</th>}
                <th className="no-imprimir"></th>
              </tr>
              <tr>
                <th className="col-nro">Nro</th>
                <th className="col-alumno">Alumno</th>
                {cuatrimestre === 2 && <th className="col-referencia">Calif. 1er cuat.</th>}
                {alumnos[0][clave].trayectorias.map((_, i) => <th key={i}>Trayectoria {i + 1}</th>)}
                <th>Compensación</th>
                <th className="col-resultado">Calificación {cuatrimestre === 1 ? '1er' : '2do'} cuat.</th>
                {cuatrimestre === 2 && (
                  <>
                    <th className="col-referencia">Intensif. (Dic.)</th>
                    <th className="col-referencia">Mesa (Feb.) — 1ª instancia</th>
                    <th className="col-referencia">Calif. anual</th>
                    <th className="col-referencia">Calif. definitiva</th>
                  </>
                )}
                <th className="col-firma no-imprimir">
                  <label className="check-todos">
                    <input type="checkbox" checked={todosListos} onChange={alternarTodos} />
                    Listo
                  </label>
                </th>
              </tr>
            </thead>
            <tbody>
              {filasVisibles.map(({ alumno, estado }) => {
                const idx = alumnos.indexOf(alumno);
                const c = alumno[clave];
                const calc = estado[claveEstado];
                const bloqueado = c.firmado;
                const provisorio = calc.habilitaCompensacion && (c.compensacion === null || c.compensacion === undefined);
                const valorMostrado = provisorio ? calc.promedioTrayectorias : calc.notaCuatrimestre;
                return (
                  <tr key={alumno.id} className={bloqueado ? 'fila-firmada' : ''}>
                    <td className="col-nro">{idx + 1}</td>
                    <td className="col-alumno">
                      {alumno.nombre}
                      {estado.condicion === 'previa' && <div className="badge-previa">PREVIA</div>}
                    </td>
                    {cuatrimestre === 2 && (
                      <td className="col-referencia">
                        <div className={`celda-calc ${estado.c1.notaCuatrimestre === null ? '' : estado.c1.notaCuatrimestre >= NOTA_APROBACION ? 'ok' : 'mal'}`}>
                          {estado.c1.notaCuatrimestre ?? '—'}
                        </div>
                      </td>
                    )}
                    {c.trayectorias.map((t, i) => (
                      <td key={i}>
                        {bloqueado ? (
                          <div className="celda-calc">{t ?? ''}</div>
                        ) : (
                          <input
                            type="number" min="0" max="10" step="1" defaultValue={t ?? ''}
                            onChange={(e) => { const r = notaValida(e.target.value, 0, 10); if (!r.ok) return; actualizar(alumno.id, (a) => { a[clave].trayectorias[i] = r.valor; return a; }); }}
                            onBlur={async (e) => {
                              const r = notaValida(e.target.value, 0, 10); if (!r.ok) return;
                              await onGuardarTrayectoria(cuatrimestre, i, alumno.id, r.valor);
                              const actualizado = { ...alumno, [clave]: { ...alumno[clave], trayectorias: alumno[clave].trayectorias.map((x, xi) => xi === i ? r.valor : x) } };
                              onSincronizarOficiales(actualizado);
                            }}
                            className="celda"
                          />
                        )}
                      </td>
                    ))}
                    <td>
                      {bloqueado ? (
                        <div className="celda-calc">{c.compensacion ?? ''}</div>
                      ) : (
                        <input
                          type="number" min="0" max="7" step="1" defaultValue={c.compensacion ?? ''}
                          disabled={!calc.habilitaCompensacion}
                          onChange={(e) => { const r = notaValida(e.target.value, 0, 7); if (!r.ok) return; actualizar(alumno.id, (a) => { a[clave].compensacion = r.valor; return a; }); }}
                          onBlur={async (e) => {
                            const r = notaValida(e.target.value, 0, 7); if (!r.ok) return;
                            await onGuardarCompensacion(cuatrimestre, alumno.id, r.valor);
                            const actualizado = { ...alumno, [clave]: { ...alumno[clave], compensacion: r.valor } };
                            onSincronizarOficiales(actualizado);
                          }}
                          className={`celda ${calc.habilitaCompensacion ? 'celda-dorado' : 'celda-disabled'}`}
                        />
                      )}
                    </td>
                    <td className="col-resultado">
                      <div className={`celda-calc celda-calc-fuerte ${provisorio ? 'celda-provisoria' : valorMostrado === null ? '' : valorMostrado >= NOTA_APROBACION ? 'ok' : 'mal'}`}>
                        {valorMostrado ?? '—'}
                      </div>
                      {provisorio && valorMostrado !== null && <div className="etiqueta-provisoria">provisorio</div>}
                    </td>
                    {cuatrimestre === 2 && (
                      <>
                        <td className="col-referencia">
                          {estado.anual !== null && estado.anual < NOTA_APROBACION ? (
                            bloqueado ? (
                              <div className="celda-calc">{alumno.intensificacion ?? ''}</div>
                            ) : (
                              <input
                                type="number" min="0" max="7" step="1" defaultValue={alumno.intensificacion ?? ''}
                                onChange={(e) => { const r = notaValida(e.target.value, 0, 7); if (!r.ok) return; actualizar(alumno.id, (a) => ({ ...a, intensificacion: r.valor })); }}
                                onBlur={async (e) => {
                                  const r = notaValida(e.target.value, 0, 7); if (!r.ok) return;
                                  await onGuardarIntensificacion(alumno.id, r.valor);
                                  onSincronizarOficiales({ ...alumno, intensificacion: r.valor });
                                }}
                                className="celda celda-dorado"
                              />
                            )
                          ) : <div className="celda-calc celda-calc-na">—</div>}
                        </td>
                        <td className="col-referencia">
                          {estado.condicion === 'previa' || alumno.mesaExamen !== null ? (
                            bloqueado ? (
                              <div className="celda-calc">{alumno.mesaExamen ?? ''}</div>
                            ) : (
                              <input
                                type="number" min="0" max="10" step="1" defaultValue={alumno.mesaExamen ?? ''}
                                onChange={(e) => { const r = notaValida(e.target.value, 0, 10); if (!r.ok) return; actualizar(alumno.id, (a) => ({ ...a, mesaExamen: r.valor })); }}
                                onBlur={async (e) => {
                                  const r = notaValida(e.target.value, 0, 10); if (!r.ok) return;
                                  await onGuardarMesaExamen(alumno.id, r.valor);
                                  onSincronizarOficiales({ ...alumno, mesaExamen: r.valor });
                                }}
                                className="celda celda-dorado"
                              />
                            )
                          ) : <div className="celda-calc celda-calc-na">—</div>}
                        </td>
                        <td className="col-referencia">
                          {(() => {
                            const anualMostrado = estado.definitiva ?? estado.anual;
                            return (
                              <div className={`celda-calc celda-calc-decimal ${anualMostrado === null ? '' : anualMostrado >= NOTA_APROBACION ? 'ok' : 'mal'}`}>{fmt2(anualMostrado)}</div>
                            );
                          })()}
                        </td>
                        <td className="col-referencia">
                          <div className={`celda-calc celda-calc-decimal celda-calc-fuerte ${estado.definitiva === null ? '' : 'ok'}`}>{fmt2(estado.definitiva)}</div>
                        </td>
                      </>
                    )}
                    <td className="col-firma no-imprimir">
                      {bloqueado ? (
                        <span className="badge-firmado" title={`Firmado el ${c.fechaFirma}`}>🔒 {c.fechaFirma}</span>
                      ) : (
                        <input type="checkbox" checked={c.listo} onChange={() => alternarListo(alumno.id)} className="check-fila" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="panel-lateral no-imprimir">
          <div className="panel-etapa">
            <div className="panel-etapa-titulo"><span>{cuatrimestre === 1 ? '1er' : '2do'} cuatrimestre</span><span>%</span></div>
            <div className="panel-etapa-fila"><span>Aprobados</span><b>{resumen.aprobados}</b><span>{resumen.total ? Math.round((resumen.aprobados / resumen.total) * 100) : '—'}</span></div>
            <div className="panel-etapa-fila"><span>Desaprobados</span><b>{resumen.desaprobados}</b><span>{resumen.total ? Math.round((resumen.desaprobados / resumen.total) * 100) : '—'}</span></div>
            <div className="panel-etapa-total panel-etapa-fila"><span>Total</span><b>{resumen.total}</b><span>{resumen.total ? '100' : '—'}</span></div>
          </div>
          <p className="nota-lateral">Tildá &quot;Listo&quot; en cada alumno que ya revisaste. &quot;Firmar&quot; cierra de una sola vez a todos los que estén tildados y no puedan editarse más.</p>
        </div>
      </div>
    </div>
  );
}

function PlanillaRoot(props) {
  const { vista, setVista, ...resto } = props;
  return (
    <div className="planilla-root">
      <style>{`
        .planilla-root {
          --tinta:#1B2A4A; --tinta-60:#5B6B8C; --papel:#F7F8FA; --dorado:#B8912F; --dorado-bg:#FBF3DE;
          --verde:#2F7D5C; --verde-bg:#E4F3EC; --rojo:#B54834; --rojo-bg:#FBEAE5; --borde:#DDE1EA;
          font-family:'IBM Plex Sans',-apple-system,sans-serif; background:var(--papel); color:var(--tinta);
          padding:24px; border-radius:14px; max-width:100%; overflow-x:auto;
        }
        .planilla-root * { box-sizing:border-box; }
        .eyebrow { font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--dorado); margin:0 0 5px 0; font-weight:600; }
        .pantalla-config { max-width:440px; margin:0 auto; padding:20px 0; }
        .pantalla-config h1 { font-size:22px; margin:0; }
        .campo-config { margin-bottom:20px; }
        .campo-config > label { display:block; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:var(--tinta-60); font-weight:700; margin-bottom:7px; }
        .tabs-cuat { display:flex; gap:8px; }
        .tab-cuat { flex:1; padding:11px; border-radius:9px; border:1.5px solid var(--borde); background:#fff; font-size:13px; font-weight:600; color:var(--tinta-60); cursor:pointer; }
        .tab-cuat-activo { border-color:var(--tinta); background:var(--tinta); color:#fff; }
        .stepper { display:flex; align-items:center; gap:14px; }
        .stepper span { font-family:'IBM Plex Mono',monospace; font-size:20px; font-weight:700; width:24px; text-align:center; }
        .btn-mini { width:30px; height:30px; border-radius:8px; border:1.5px solid var(--borde); background:#fff; cursor:pointer; font-size:16px; color:var(--tinta); }
        .btn-mini:disabled { opacity:.35; cursor:default; }
        .nota-cerrado-config { font-size:12.5px; color:var(--tinta-60); margin:0; }
        .aviso-progreso { background:var(--dorado-bg); color:#6b5015; border-radius:9px; padding:10px 14px; font-size:12.5px; margin-bottom:18px; }
        .btn-primario { background:var(--tinta); color:#fff; border:none; border-radius:9px; padding:10px 16px; font-size:13px; font-weight:600; cursor:pointer; }
        .btn-primario:hover { background:#14203a; }
        .btn-grande { width:100%; padding:13px; font-size:14px; }
        .barra-superior { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; }
        .btn-volver { background:none; border:none; color:var(--tinta-60); font-size:12.5px; cursor:pointer; font-weight:600; padding:0; }
        .btn-volver:hover { color:var(--tinta); }
        .barra-acciones { display:flex; gap:8px; }
        .btn-secundario { background:#fff; border:1.5px solid var(--borde); color:var(--tinta); border-radius:8px; padding:8px 14px; font-size:12.5px; font-weight:600; cursor:pointer; }
        .btn-secundario-activo { background:var(--rojo); border-color:var(--rojo); color:#fff; }
        .btn-firmar { background:var(--verde); border:none; color:#fff; border-radius:8px; padding:8px 14px; font-size:12.5px; font-weight:600; cursor:pointer; }
        .btn-firmar:hover { background:#255f47; }
        .btn-firmar:disabled { background:#B7BCC8; cursor:default; }
        .encabezado-catedra { display:flex; align-items:center; gap:16px; flex-wrap:wrap; border-bottom:2px solid var(--tinta); padding-bottom:16px; margin-bottom:16px; }
        .identidad-docente h2 { margin:0; font-size:17px; font-weight:700; }
        .chip-catedra { background:var(--tinta); color:#fff; border-radius:10px; padding:9px 16px; display:flex; flex-direction:column; gap:2px; flex:1; min-width:220px; }
        .chip-catedra-materia { font-size:15px; font-weight:700; }
        .chip-catedra-curso { font-size:12px; opacity:.75; font-family:'IBM Plex Mono',monospace; }
        .tag-lateral { display:flex; flex-direction:column; gap:6px; align-items:flex-end; }
        .tag-cuat { font-size:11px; font-weight:700; background:var(--verde-bg); color:var(--verde); padding:4px 10px; border-radius:100px; }
        .layout { display:flex; gap:16px; align-items:flex-start; }
        .tabla-wrap { overflow-x:auto; border:1px solid var(--borde); border-radius:10px; background:#fff; flex:1; min-width:0; }
        table { border-collapse:collapse; font-size:12.5px; white-space:nowrap; width:100%; }
        thead th { background:var(--tinta); color:#fff; font-weight:600; padding:8px 10px; font-size:11px; text-align:center; border-right:1px solid #2c3d63; }
        thead tr.grupo th { background:#14203a; font-size:9.5px; letter-spacing:.04em; text-transform:uppercase; padding:5px 8px; font-family:'IBM Plex Mono',monospace; }
        th.col-nro, td.col-nro { position:sticky; left:0; background:#EEF0F4; z-index:2; text-align:center; width:36px; }
        th.col-alumno, td.col-alumno { position:sticky; left:36px; background:#fff; z-index:2; text-align:left; padding:7px 12px; border-right:2px solid var(--tinta); min-width:210px; }
        thead th.col-nro, thead th.col-alumno { background:var(--tinta); z-index:3; }
        tbody tr:nth-child(even) td.col-alumno { background:#FAFBFC; }
        tbody tr:nth-child(even) td.col-nro { background:#E4E7EE; }
        tbody tr.fila-firmada td.col-alumno { background:var(--verde-bg); }
        td { border-right:1px solid var(--borde); border-bottom:1px solid var(--borde); padding:4px; text-align:center; }
        .col-resultado { border-left:2px solid var(--tinta); }
        .col-firma { border-left:2px solid var(--borde); min-width:78px; }
        .celda { width:44px; font-family:'IBM Plex Mono',monospace; font-variant-numeric:tabular-nums; border:1px solid var(--borde); border-radius:6px; padding:5px 3px; font-size:13px; text-align:center; background:#fff; }
        .celda:focus { outline:2px solid var(--tinta); outline-offset:1px; }
        .celda-disabled { background:#F1F2F5; color:#B7BCC8; }
        .celda-dorado { border-color:var(--dorado); background:#FBF6E9; }
        .celda-calc { width:44px; margin:0 auto; font-family:'IBM Plex Mono',monospace; font-variant-numeric:tabular-nums; font-weight:600; font-size:13px; padding:5px 3px; border-radius:6px; background:#EEF0F4; }
        .celda-calc.ok { background:var(--verde-bg); color:var(--verde); }
        .celda-calc.mal { background:var(--rojo-bg); color:var(--rojo); }
        .celda-calc-fuerte { background:var(--tinta); color:#fff; font-weight:700; }
        .celda-calc-fuerte.ok { background:var(--verde); color:#fff; }
        .celda-calc-fuerte.mal { background:var(--rojo); color:#fff; }
        .celda-provisoria { opacity:.65; background:#EEF0F4; color:var(--tinta-60); border:1.5px dashed var(--tinta-60); font-style:italic; }
        .etiqueta-provisoria { font-size:8.5px; color:var(--tinta-60); font-style:italic; margin-top:2px; }
        .col-referencia { background:#F5F6F9; }
        .col-referencia .celda-calc:not(.celda-calc-fuerte) { background:#E9EBF1; }
        .celda-calc-na { color:#C6CAD4; background:#F1F2F5 !important; }
        .celda-calc-decimal { width:58px; }
        .badge-previa { font-size:9.5px; color:var(--rojo); font-weight:700; font-family:'IBM Plex Mono',monospace; }
        .badge-firmado { font-size:10.5px; color:var(--verde); font-weight:700; font-family:'IBM Plex Mono',monospace; }
        .check-fila { width:16px; height:16px; cursor:pointer; }
        .check-todos { display:flex; align-items:center; gap:5px; font-size:10.5px; cursor:pointer; justify-content:center; }
        .check-todos input { width:13px; height:13px; }
        .panel-lateral { flex:0 0 190px; display:flex; flex-direction:column; gap:12px; }
        .panel-etapa { border:1px solid var(--borde); border-radius:10px; overflow:hidden; background:#fff; }
        .panel-etapa-titulo { display:flex; justify-content:space-between; background:var(--tinta); color:#fff; padding:7px 11px; font-size:10.5px; font-weight:700; letter-spacing:.03em; text-transform:uppercase; }
        .panel-etapa-fila { display:grid; grid-template-columns:1fr auto auto; gap:8px; padding:6px 11px; font-size:12px; border-top:1px solid var(--borde); align-items:center; }
        .panel-etapa-fila span:first-child { color:var(--tinta-60); }
        .panel-etapa-fila b { font-family:'IBM Plex Mono',monospace; }
        .panel-etapa-fila span:last-child { font-family:'IBM Plex Mono',monospace; color:var(--tinta-60); font-size:10.5px; width:30px; text-align:right; }
        .panel-etapa-total { background:#FAFBFC; font-weight:700; }
        .nota-lateral { font-size:11.5px; color:var(--tinta-60); line-height:1.5; padding:0 2px; }
        .solo-imprimir { display:none; }
        @media print {
          .no-imprimir { display:none !important; }
          .solo-pantalla { display:none; }
          .solo-imprimir { display:inline; }
          .planilla-root { padding:0; background:#fff; }
          .encabezado-catedra { border-bottom:2px solid #000; }
          .chip-catedra { background:#000 !important; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        }
      `}</style>

      {vista === 'configuracion' ? (
        <PantallaConfiguracion {...resto} onContinuar={() => setVista('carga')} />
      ) : (
        <PantallaCarga {...resto} onVolver={() => setVista('configuracion')} />
      )}
    </div>
  );
}
