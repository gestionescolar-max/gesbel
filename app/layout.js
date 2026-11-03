import './globals.css';

export const metadata = {
  title: 'Gestión Escolar - Fray Luis Beltrán',
  description: 'Sistema de gestión académica'
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}