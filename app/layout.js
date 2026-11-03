import './globals.css';

export const metadata = {
  title: 'Gestión Escuela Técnica Fray Luis Beltrán',
  description: 'Sistema de gestión académica'
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}