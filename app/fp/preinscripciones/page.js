'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Header from '@/components/Header';

export default function FpPreinscripciones2027Page() {
    const { docente, cargando } = useDocente();
    const [cursos, setCursos] = useState([]);
    const [cursoSel, setCursoSel] = useState(null);
    const [lista, setLista] = useState(null);
    const [error, setError] = useState(null);
    const [msg, setMsg] = useState(null);
    const [form, setForm] = useState({ nombre: '', dni: '', fecha_nac: '', telefono: '', email: '' });
    const [dniWarn, setDniWarn] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const esGestion = !!(docente && docente.puedeAdministrar);

    const cargarCursos = useCallback(async () => {
        if (!docente) return;
        let q = supabase.from('fp_cursos').select('id, nombre').eq('anio', 2027).eq('estado', 'inscripcion_abierta');
        if (!esGestion && docente.id) {
            const { data: prep } = await supabase
                .from('fp_cursos_preceptores').select('fp_curso_id').eq('profesor_id', docente.id);
            const ids = (prep || []).map(p => p.fp_curso_id);
            q = q.or(`profesor_id.eq.${docente.id}${ids.length ? `,id.in.(${ids.join(',')})` : ''}`);
        }
        const { data } = await q.order('nombre');
        setCursos(data || []);
        setCursoSel(data && data[0] ? data[0].id : null);
    }, [docente, esGestion]);

    const cargarLista = useCallback(async () => {
        if (!cursoSel) { setLista([]); return; }
        const { data, error } = await supabase
            .from('fp_preinscripciones').select('*').eq('fp_curso_id', cursoSel).order('nombre');
        if (error) { setError(error.message); return; }
        setLista(data || []);
    }, [cursoSel]);

    useEffect(() => { cargarCursos(); }, [cargarCursos]);
    useEffect(() => { cargarLista(); }, [cargarLista]);

    // Validación de DNI en vivo
    useEffect(() => {
        const dni = form.dni.trim();
        if (dni.length < 7 || !cursoSel) { setDniWarn(null); return; }
        (async () => {
            const { data: pre } = await supabase.from('fp_preinscripciones')
                .select('nombre').eq('dni', dni).eq('fp_curso_id', cursoSel).limit(1);
            if (pre && pre.length) { setDniWarn(`Ya hay una preinscripción de ${pre[0].nombre} en este curso`); return; }
            const { data: ins } = await supabase.from('fp_inscripciones')
                .select('nombre, fp_cursos(nombre)').eq('dni', dni).eq('fp_cursos.anio', 2027).limit(1);
            if (ins && ins.length) { setDniWarn(`${ins[0].nombre} ya está inscripto en ${ins[0].fp_cursos ? ins[0].fp_cursos.nombre : 'otro curso'} (regla: 1 curso por año)`); return; }
            setDniWarn(null);
        })();
    }, [form.dni, cursoSel]);

    const alta = async () => {
        if (!cursoSel) return;
        setGuardando(true); setError(null); setMsg(null);
        const { error } = await supabase.from('fp_preinscripciones').insert({
            fp_curso_id: cursoSel,
            nombre: form.nombre.trim().toUpperCase(),
            dni: form.dni.trim(),
            fecha_nac: form.fecha_nac || null,
            telefono: form.telefono || null,
            email: form.email || null,
        });
        setGuardando(false);
        if (error) { setError(error.message); return; }
        setMsg('Preinscripción cargada correctamente');
        setForm({ nombre: '', dni: '', fecha_nac: '', telefono: '', email: '' });
        cargarLista();
    };

    const tilde = async (row, campo) => {
        setError(null);
        const { error } = await supabase.from('fp_preinscripciones')
            .update({ [campo]: !row[campo] }).eq('id', row.id);
        if (error) { setError(error.message); return; }
        cargarLista();
    };

    const convertir = async (row) => {
        setError(null); setMsg(null);
        const { data, error } = await supabase.rpc('fn_convertir_preinscripcion', { p_id: row.id });
        if (error) { setError(error.message); return; }
        setMsg(`Preinscripción convertida en inscripción N° ${data} con legajo FP automático`);
        cargarLista();
    };

    if (cargando || !docente) return null;

    return (
        <>
            <Header docente={docente} />
            <main>
                <div className="toolbar">
                    <div className="titulo">
                        <h2>Preinscripciones FP 2027</h2>
                        <p>Carga de aspirantes y seguimiento de requisitos · cursos nocturnos</p>
                    </div>
                    <select value={cursoSel ?? ''} onChange={(e) => setCursoSel(Number(e.target.value) || null)}
                        style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'var(--surface-2)', color: 'var(--text)' }}>
                        {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                </div>

                {error && <div className="status error">{error}</div>}
                {msg && <div className="status">{msg}</div>}

                {cursos.length === 0 && (
                    <div className="empty"><div className="icon">🌙</div>
                        No tenés cursos FP 2027 asignados como preceptor/a, o tu función no tiene acceso a este panel.
                    </div>
                )}

                {cursos.length > 0 && (
                    <>
                        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                            <h3 style={{ margin: '0 0 10px' }}>Nueva preinscripción</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
                                <input placeholder="APELLIDO, Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                                <input placeholder="DNI" value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value.replace(/\D/g, '') })} />
                                <input type="date" title="Fecha de nacimiento" value={form.fecha_nac} onChange={(e) => setForm({ ...form, fecha_nac: e.target.value })} />
                                <input placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                                <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                            </div>
                            {dniWarn && <div className="status error" style={{ marginTop: 8 }}>⚠ {dniWarn}</div>}
                            <button onClick={alta} disabled={guardando || !form.nombre.trim() || form.dni.trim().length < 7 || !!dniWarn}
                                style={{ marginTop: 10, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                                Cargar preinscripción
                            </button>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-strong)' }}>
                                    <th style={{ padding: 8 }}>Aspirante</th><th style={{ padding: 8 }}>DNI</th>
                                    <th style={{ padding: 8 }}>Contacto</th>
                                    <th style={{ padding: 8 }}>Docs</th><th style={{ padding: 8 }}>Edad</th><th style={{ padding: 8 }}>Pago</th>
                                    <th style={{ padding: 8 }}>Estado</th>{esGestion && <th style={{ padding: 8 }}></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {(lista || []).map((r) => (
                                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: 8 }}>{r.nombre}</td>
                                        <td style={{ padding: 8 }}>{r.dni}</td>
                                        <td style={{ padding: 8 }}>{[r.telefono, r.email].filter(Boolean).join(' · ')}</td>
                                        <td style={{ padding: 8 }}><input type="checkbox" checked={r.req_documentacion} disabled={!esGestion || r.estado === 'convertida'} onChange={() => tilde(r, 'req_documentacion')} /></td>
                                        <td style={{ padding: 8 }}><input type="checkbox" checked={r.req_edad} disabled={!esGestion || r.estado === 'convertida'} onChange={() => tilde(r, 'req_edad')} /></td>
                                        <td style={{ padding: 8 }}><input type="checkbox" checked={r.req_pago} disabled={!esGestion || r.estado === 'convertida'} onChange={() => tilde(r, 'req_pago')} /></td>
                                        <td style={{ padding: 8 }}>{r.estado}</td>
                                        {esGestion && (
                                            <td style={{ padding: 8 }}>
                                                {r.estado !== 'convertida' && (
                                                    <button onClick={() => convertir(r)}
                                                        disabled={!r.req_documentacion || !r.req_edad || !r.req_pago}
                                                        title={!r.req_documentacion || !r.req_edad || !r.req_pago ? 'Faltan requisitos' : 'Convertir en inscripción con legajo FP'}
                                                        style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }}>
                                                        → Inscribir
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {lista && lista.length === 0 && <div className="empty" style={{ marginTop: 12 }}>Sin preinscripciones en este curso todavía.</div>}
                    </>
                )}
            </main>
        </>
    );
}