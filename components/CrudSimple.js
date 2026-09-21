'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function CrudSimple({ tabla, titulo, descripcion, campos, orden = null }) {
  const [filas, setFilas] = useState(null);
  const [opcionesFK, setOpcionesFK] = useState({});
  const [form, setForm] = useState({});
  const [editandoId, setEditandoId] = useState(null);
  const [status, setStatus] = useState(null);

  const cargarFilas = useCallback(async () => {
    let query = supabase.from(tabla).select('*');
    if (orden) query = query.order(orden.campo, { ascending: orden.asc !== false });
    const { data, error } = await query;
    if (error) { setStatus({ tipo: 'error', mensaje: error.message }); return; }
    setFilas(data || []);
  }, [tabla, orden]);

  useEffect(() => { cargarFilas(); }, [cargarFilas]);

  useEffect(() => {
    (async () => {
      const nuevas = {};
      for (const campo of campos) {
        if (campo.tipo === 'relacion') {
          const { data } = await supabase.from(campo.relacion.tabla).select(`id, ${campo.relacion.campoTexto}`).order(campo.relacion.campoTexto);
          nuevas[campo.nombre] = (data || []).map((r) => ({ value: r.id, label: r[campo.relacion.campoTexto] }));
        }
      }
      setOpcionesFK(nuevas);
    })();
  }, [campos]);

  function limpiarForm() { setForm({}); setEditandoId(null); }
  function editar(fila) { setForm(fila); setEditandoId(fila.id); setStatus(null); }

  async function guardar() {
    const faltante = campos.find((c) => c.requerido && !form[c.nombre]);
    if (faltante) { setStatus({ tipo: 'error', mensaje: `Falta completar "${faltante.etiqueta}".` }); return; }
    setStatus({ tipo: 'loading', mensaje: 'Guardando…' });
    const datos = {};
    campos.forEach((c) => {
      let v = form[c.nombre];
      if (v === '' || v === undefined) v = null;
      if (c.tipo === 'numero' && v !== null) v = Number(v);
      if (c.tipo === 'relacion' && v !== null) v = Number(v);
      datos[c.nombre] = v;
    });
    const resultado = editandoId
      ? await supabase.from(tabla).update(datos).eq('id', editandoId)
      : await supabase.from(tabla).insert(datos);
    if (resultado.error) { setStatus({ tipo: 'error', mensaje: resultado.error.message }); return; }
    setStatus({ tipo: 'ok', mensaje: editandoId ? 'Actualizado.' : 'Agregado.' });
    limpiarForm();
    cargarFilas();
  }

  async function borrar(id) {
    const ok = window.confirm('¿Borrar esta fila? Esta acción no se puede deshacer.');
    if (!ok) return;
    const { error } = await supabase.from(tabla).delete().eq('id', id);
    if (error) { setStatus({ tipo: 'error', mensaje: `No se pudo borrar: ${error.message}` }); return; }
    cargarFilas();
  }

  function etiquetaDe(campo, valor) {
    if (campo.tipo !== 'relacion') return String(valor ?? '—');
    const opciones = opcionesFK[campo.nombre] || [];
    const encontrada = opciones.find((o) => o.value === valor);
    return encontrada ? encontrada.label : (valor ?? '—');
  }

  return (
    <div>
      <div className="toolbar">
        <div className="titulo"><h2>{titulo}</h2><p>{descripcion}</p></div>
      </div>
      <div className="center-card" style={{ margin: '0 0 24px 0', maxWidth: 560 }}>
        <h2 style={{ marginBottom: 4 }}>{editandoId ? 'Editar' : 'Agregar nuevo'}</h2>
        {editandoId && <p className="hint" style={{ marginBottom: 12 }}>Editando fila #{editandoId}. <a href="#" onClick={(e) => { e.preventDefault(); limpiarForm(); }} style={{ color: 'var(--accent)' }}>Cancelar y cargar uno nuevo</a></p>}
        {campos.map((c) => (
          <div className="field" key={c.nombre}>
            <label>{c.etiqueta}{c.requerido ? ' *' : ''}</label>
            {c.tipo === 'relacion' ? (
              <select value={form[c.nombre] ?? ''} onChange={(e) => setForm({ ...form, [c.nombre]: e.target.value })}>
                <option value="">— Elegir —</option>
                {(opcionesFK[c.nombre] || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : c.tipo === 'checkbox' ? (
              <input type="checkbox" checked={!!form[c.nombre]} onChange={(e) => setForm({ ...form, [c.nombre]: e.target.checked })} style={{ width: 18, height: 18 }} />
            ) : c.tipo === 'fecha' ? (
              <input type="date" value={form[c.nombre] ?? ''} onChange={(e) => setForm({ ...form, [c.nombre]: e.target.value })} />
            ) : c.tipo === 'numero' ? (
              <input type="number" value={form[c.nombre] ?? ''} onChange={(e) => setForm({ ...form, [c.nombre]: e.target.value })} />
            ) : (
              <input type="text" value={form[c.nombre] ?? ''} onChange={(e) => setForm({ ...form, [c.nombre]: e.target.value })} placeholder={c.placeholder || ''} />
            )}
            {c.ayuda && <p className="hint" style={{ marginTop: 4, marginBottom: 0 }}>{c.ayuda}</p>}
          </div>
        ))}
        <button className="btn block" onClick={guardar}>{editandoId ? 'Guardar cambios' : 'Agregar'}</button>
        {status && <div className={`status ${status.tipo}`}>{status.mensaje}</div>}
      </div>
      {filas === null && <div className="empty">Cargando…</div>}
      {filas && filas.length === 0 && <div className="empty">Todavía no hay nada cargado acá.</div>}
      {filas && filas.length > 0 && (
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                {campos.map((c) => <th key={c.nombre} style={th}>{c.etiqueta}</th>)}
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id} style={{ borderTop: '1px solid var(--border)' }}>
                  {campos.map((c) => (
                    <td key={c.nombre} style={td}>{c.tipo === 'checkbox' ? (f[c.nombre] ? 'Sí' : 'No') : etiquetaDe(c, f[c.nombre])}</td>
                  ))}
                  <td style={td}>
                    <button onClick={() => editar(f)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, marginRight: 10 }}>Editar</button>
                    <button onClick={() => borrar(f.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 12 }}>Borrar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
const th = { padding: '8px 10px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.03em', color: 'var(--text-muted)' };
const td = { padding: '8px 10px' };
