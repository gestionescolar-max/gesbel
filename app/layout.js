import './globals.css';

export const metadata = {
  title: 'Cuaderno del Profesor — Escuela Técnica Fray Luis Beltrán',
  description: 'Sistema de gestión académica',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
