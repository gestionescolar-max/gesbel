'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Header from '@/components/Header';

export default function SignupPage() {
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(null);
  const router = useRouter();

  async function registrarse() {
    if (!dni.trim() || !email.trim() || password.length < 6) {
      setStatus({ tipo: 'error', mensaje: 'Completá tu DNI, un email válido y una contraseña de al menos 6 caracteres.' });
      return;
    }
    setStatus({ tipo: 'loading', mensaje: 'Verificando tu DNI…' });
    const { data: profesor, error: errProfesor } = await supabase.from('profesores').select('id, nombre').eq('dni', dni.trim()).maybeSingle();
    if (errProfesor) { setStatus({ tipo: 'error', mensaje: `Error de conexión: ${errProfesor.message}` }); return; }
    if (!profesor) { setStatus({ tipo: 'error', mensaje: 'No encontramos ningún profesor con ese DNI en el sistema. Pedile al equipo directivo que te den de alta antes de registrarte.' }); return; }
    const { data: perfilExistente } = await supabase.from('perfiles').select('user_id').eq('profesor_id', profesor.id).maybeSingle();
    if (perfilExistente) { setStatus({ tipo: 'error', mensaje: `Ya existe una cuenta creada para ${profesor.nombre}. Si sos vos y olvidaste la contraseña, usá "¿Olvidaste tu contraseña?" en el login.` }); return; }
    setStatus({ tipo: 'loading', mensaje: 'Creando tu cuenta…' });
    const { data: authData, error: errAuth } = await supabase.auth.signUp({ email: email.trim(), password });
    if (errAuth) { setStatus({ tipo: 'error', mensaje: `No se pudo crear la cuenta: ${errAuth.message}` }); return; }
    if (!authData.user) { setStatus({ tipo: 'error', mensaje: 'No se pudo crear la cuenta — es posible que ese email ya esté registrado. Probá con "¿Olvidaste tu contraseña?" en el login.' }); return; }
    const { error: errPerfil } = await supabase.from('perfiles').insert({ user_id: authData.user.id, profesor_id: profesor.id, rol: 'docente' });
    if (errPerfil) { setStatus({ tipo: 'error', mensaje: `Tu cuenta se creó pero hubo un problema al vincularla: ${errPerfil.message}. Avisale a dirección.` }); return; }
    if (authData.session) { router.push('/materias'); }
    else { setStatus({ tipo: 'ok', mensaje: `¡Listo, ${profesor.nombre}! Te enviamos un email de confirmación — abrilo y después ingresá con tu email y contraseña.` }); }
  }

  return (
    <>
      <Header docente={null} />
      <main>
        <div className="center-card">
          <h2>Crear mi cuenta</h2>
          <p className="hint">Solo hace falta una vez. Usamos tu DNI para encontrarte entre los profesores ya cargados en el sistema y vincular tu cuenta nueva con tus materias.</p>
          <div className="field"><label>DNI</label><input type="text" value={dni} onChange={(e) => setDni(e.target.value)} placeholder="Ej: 24665069" /></div>
          <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu-email@ejemplo.com" /></div>
          <div className="field"><label>Contraseña</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
          <button className="btn block" onClick={registrarse}>Crear cuenta</button>
          {status && <div className={`status ${status.tipo}`}>{status.mensaje}</div>}
          <p className="hint" style={{ marginTop: 16, marginBottom: 0 }}>¿Ya tenés cuenta? <Link href="/" style={{ color: 'var(--accent)', fontWeight: 600 }}>Ingresá acá</Link></p>
        </div>
      </main>
    </>
  );
}
