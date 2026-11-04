'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useDocente } from '@/lib/useDocente';
import Sidebar from '@/components/Sidebar';

export default function ComprobantePage() {
    const { id } = useParams();
    const router = useRouter();
    const { docente, cargando } = useDocente();
    const [data, setData] = useState(null);

    useEffect(() => {
        if (!docente || !id) return;
        async function cargar() {
            const { data: preinsc, error: err1 } = await supabase
                .from('fp_preinscripciones')
                .select('*, fp_cursos (nombre, turno)')
                .eq('id', id)
                .single();

            const { data: pagos, error: err2 } = await supabase
                .from('fp_pagos')
                .select('*')
                .eq('preinscripcion_id', id)
                .order('creado_en', { ascending: false });

            if (!err1) setData({ ...preinsc, pagos: pagos || [] });
        }
        cargar();
    }, [docente, id]);

    if (cargando || !docente || !data) return null;

    return (
        <Sidebar docente={docente} titulo="Comprobante de Pre-inscripción">
            <div style={{ maxWidth: 800, margin: '0 auto' }}>

                {/* Botón solo visible en pantalla, no en la impresión */}
                <div className="no-print" style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
                    <button onClick={() => router.back()} style={{ padding: '10px 20px', borderRadius: 6, border: '1px solid var(--border-strong)', background: 'var(--surface)', cursor: 'pointer' }}>
                        ← Volver
                    </button>
                    <button onClick={() => window.print()} style={{ padding: '10px 20px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                        🖨️ Imprimir Comprobante
                    </button>
                </div>

                {/* Hoja A4 para imprimir */}
                <div className="print-area" style={{ background: '#fff', padding: '40px', border: '1px solid #ddd', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>

                    {/* Encabezado Institucional */}
                    <div style={{ textAlign: 'center', borderBottom: '2px solid #1a1f2e', paddingBottom: 20, marginBottom: 30 }}>
                        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#1a1f2e' }}>Escuela Técnica "Fray Luis Beltrán"</h1>
                        <h2 style={{ fontSize: 16, fontWeight: 500, margin: '8px 0 0', color: '#4b5563' }}>Comprobante de Pre-inscripción - Formación Profesional</h2>
                        <div style={{ marginTop: 12, fontSize: 14, color: '#6b7280' }}>
                            Expediente N°: <strong style={{ color: '#1a1f2e' }}>{data.numero_expediente}</strong>
                        </div>
                    </div>

                    {/* Datos del Alumno */}
                    <div style={{ marginBottom: 30 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', borderBottom: '1px solid #e5e7eb', paddingBottom: 4, marginBottom: 12 }}>Datos del Alumno</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 14 }}>
                            <div><strong>Apellido y Nombre:</strong> {data.apellido}, {data.nombre}</div>
                            <div><strong>DNI:</strong> {data.dni}</div>
                            <div><strong>Fecha de Nacimiento:</strong> {data.fecha_nac}</div>
                            <div><strong>Nacionalidad:</strong> {data.nacionalidad}</div>
                            <div><strong>Teléfono:</strong> {data.telefono}</div>
                            <div><strong>Email:</strong> {data.email || 'No proporcionado'}</div>
                            <div style={{ gridColumn: '1 / -1' }}><strong>Domicilio:</strong> {data.domicilio || 'No proporcionado'}</div>
                        </div>
                    </div>

                    {/* Datos del Curso */}
                    <div style={{ marginBottom: 30 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', borderBottom: '1px solid #e5e7eb', paddingBottom: 4, marginBottom: 12 }}>Curso Solicitado</h3>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1f2e' }}>
                            {data.fp_cursos?.nombre} ({data.fp_cursos?.turno})
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                            Fecha de pre-inscripción: {data.fecha_preinscripcion}
                        </div>
                    </div>

                    {/* Checklist de Documentación */}
                    <div style={{ marginBottom: 30 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', borderBottom: '1px solid #e5e7eb', paddingBottom: 4, marginBottom: 12 }}>Documentación Presentada</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14 }}>
                            <div>{data.doc_dni ? '✅' : '⬜'} Copia de DNI</div>
                            <div>{data.doc_foto ? '✅' : '⬜'} Foto 4x4</div>
                            <div>{data.doc_certificado_estudios ? '✅' : '⬜'} Certificado de estudios</div>
                            <div>{data.doc_cuil ? '✅' : '⬜'} Constancia de CUIL/CUIT</div>
                            <div>{data.doc_certificado_medico ? '✅' : '⬜'} Certificado médico</div>
                            <div>{data.doc_libreta_trabajo ? '✅' : '⬜'} Libreta de trabajo</div>
                        </div>
                        {data.link_carpeta_drive && (
                            <div style={{ marginTop: 12, fontSize: 13, color: '#2563eb' }}>
                                📁 Carpeta digital: {data.link_carpeta_drive}
                            </div>
                        )}
                    </div>

                    {/* Pagos Realizados */}
                    {data.pagos && data.pagos.length > 0 && (
                        <div style={{ marginBottom: 30 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', borderBottom: '1px solid #e5e7eb', paddingBottom: 4, marginBottom: 12 }}>Pagos Registrados</h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#f9fafb' }}>
                                        <th style={{ padding: 8, textAlign: 'left', border: '1px solid #e5e7eb' }}>Concepto</th>
                                        <th style={{ padding: 8, textAlign: 'left', border: '1px solid #e5e7eb' }}>Fecha</th>
                                        <th style={{ padding: 8, textAlign: 'right', border: '1px solid #e5e7eb' }}>Monto</th>
                                        <th style={{ padding: 8, textAlign: 'left', border: '1px solid #e5e7eb' }}>Recibo N°</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.pagos.map((p, i) => (
                                        <tr key={i}>
                                            <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>{p.concepto}</td>
                                            <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>{p.fecha_pago}</td>
                                            <td style={{ padding: 8, textAlign: 'right', border: '1px solid #e5e7eb' }}>${p.monto}</td>
                                            <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>{p.numero_recibo || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Firmas */}
                    <div style={{ marginTop: 60, display: 'flex', justifyContent: 'space-between', paddingTop: 40 }}>
                        <div style={{ textAlign: 'center', width: '40%' }}>
                            <div style={{ borderTop: '1px solid #000', paddingTop: 8, fontSize: 13 }}>Firma y Aclaración del Alumno / Tutor</div>
                        </div>
                        <div style={{ textAlign: 'center', width: '40%' }}>
                            <div style={{ borderTop: '1px solid #000', paddingTop: 8, fontSize: 13 }}>Sello y Firma de la Institución</div>
                        </div>
                    </div>

                    <div style={{ marginTop: 40, textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>
                        Este comprobante acredita la pre-inscripción. La inscripción definitiva queda sujeta a la aprobación de la documentación y el cumplimiento de los requisitos del ciclo lectivo.
                    </div>
                </div>
            </div>

            {/* Estilos específicos para impresión */}
            <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .print-area { 
            box-shadow: none !important; 
            border: none !important; 
            padding: 0 !important; 
            margin: 0 !important;
            max-width: 100% !important;
          }
          /* Ocultar sidebar y header al imprimir */
          aside, header { display: none !important; }
          main { margin-left: 0 !important; padding: 0 !important; }
        }
      `}</style>
        </Sidebar>
    );
}