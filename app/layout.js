import './globals.css';

export const metadata = {
  title: 'Gestión Escolar - Fray Luis Beltrán',
  description: 'Sistema de gestión académica - Escuela Técnica Fray Luis Beltrán',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/favicon.png" />
        <link rel="shortcut icon" href="/favicon.png" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}