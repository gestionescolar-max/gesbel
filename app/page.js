'use client';
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
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error) {
      setStatus({ tipo: 'error', mensaje: 'Email o contraseña incorrectos.' });
      return;
    }
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
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ingresar()}
              placeholder="tu-email@ejemplo.com"
            />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ingresar()}
              placeholder="••••••••"
            />
          </div>
          <button className="btn block" onClick={ingresar}>Ingresar</button>
          {status && <div className={`status ${status.tipo}`}>{status.mensaje}</div>}
          <p className="hint" style={{ marginTop: 16, marginBottom: 0 }}>
            ¿Todavía no tenés cuenta?{' '}
            <Link href="/signup" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              Registrate acá
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
