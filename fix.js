const fs = require('fs');
const path = require('path');

// 1. Arreglar layout.js
const layoutPath = path.join(__dirname, 'app', 'layout.js');
const layoutContent = `import './globals.css';

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
}`;
fs.writeFileSync(layoutPath, layoutContent);

// 2. Arreglar globals.css (limpia los espacios rotos)
const cssPath = path.join(__dirname, 'app', 'globals.css');
let cssContent = fs.readFileSync(cssPath, 'utf8');

cssContent = cssContent.replace(/text-decorat ion/g, 'text-decoration');
cssContent = cssContent.replace(/ali gn-items/g, 'align-items');
cssContent = cssContent.replace(/docente-chi p/g, 'docente-chip');
cssContent = cssContent.replace(/bo rder-radius/g, 'border-radius');
cssContent = cssContent.replace(/font-w eight/g, 'font-weight');
cssContent = cssContent.replace(/s olid/g, 'solid');
cssContent = cssContent.replace(/na v-user/g, 'nav-user');
cssContent = cssContent.replace(/n one/g, 'none');
cssContent = cssContent.replace(/bor der/g, 'border');
cssContent = cssContent.replace(/ra dius/g, 'radius');
cssContent = cssContent.replace(/p adding/g, 'padding');
cssContent = cssContent.replace(/empt y/g, 'empty');
cssContent = cssContent.replace(/ac cent/g, 'accent');
cssContent = cssContent.replace(/inpu t/g, 'input');
cssContent = cssContent.replace(/borde r/g, 'border');
// Arreglar el selector universal que perdió el asterisco
cssContent = cssContent.replace(/^\{ box-sizing/gm, '* { box-sizing');

fs.writeFileSync(cssPath, cssContent);

// 3. Arreglar page.js (reescribirlo limpio)
const pagePath = path.join(__dirname, 'app', 'page.js');
const pageContent = `'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Header from '@/components/Header';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(null);
  const router = useRouter();

  async function ingresar() {
    if (!email.trim() || !password) return;
    setStatus({ tipo: 'loading', mensaje: 'Ingresando…' });
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setStatus({ tipo: 'error', mensaje: 'Email o contraseña incorrectos.' }); return; }
    router.push('/materias');
  }

  return (
    <>
      <Header docente={null} />
      <main>
        <div className="center-card">
          <h2>Ingresar</h2>
          <p className="hint">Ingresá con el email y la contraseña de tu cuenta.</p>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ingresar()} placeholder="tu-email@ejemplo.com" />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ingresar()} placeholder="••••••••" />
          </div>
          <button className="btn block" onClick={ingresar}>Ingresar</button>
          {status && <div className={\`status \${status.tipo}\`}>{status.mensaje}</div>}
          <p className="hint" style={{ marginTop: 16, marginBottom: 0 }}>
            ¿Todavía no tenés cuenta? <Link href="/signup" style={{ color: 'var(--accent)', fontWeight: 600 }}>Registrate acá</Link>
          </p>
        </div>
      </main>
    </>
  );
}`;
fs.writeFileSync(pagePath, pageContent);

console.log('✅ Archivos del frontend corregidos exitosamente.');