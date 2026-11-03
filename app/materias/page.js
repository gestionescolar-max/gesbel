'use client';
import { useDocente } from '@/lib/useDocente';
import Sidebar from '@/components/Sidebar';

export default function MateriasPage() {
  const { docente, cargando } = useDocente();

  if (cargando || !docente) return null;

  return (
    <Sidebar docente={docente} titulo="Mis materias">
      {/* Acá va todo el contenido específico de esta página */}
      <p>Contenido de las materias...</p>
    </Sidebar>
  );
}