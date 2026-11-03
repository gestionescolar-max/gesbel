'use client';
import { useDocente } from '@/lib/useDocente';
import Header from '@/components/Header';

// Placeholder reutilizable para las secciones del menú que todavía no fueron desarrolladas.
export default function ProximaSeccion({ titulo, descripcion }) {
    const { docente, cargando } = useDocente();
    if (cargando || !docente) return null;
    return (
        <>
            <Header docente={docente} />
            <main>
                <div className="toolbar">
                    <div className="titulo"><h2>{titulo}</h2><p>{descripcion}</p></div>
                </div>
                <div className="empty">
                    <div className="icon">🚧</div>
                    Esta sección estará disponible próximamente.
                </div>
            </main>
        </>
    );
}
