'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import Header from '@/components/Header';

export default function RecuperarPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState(null);

    async function recuperarContrasena(e) {
        e.preventDefault();

        if (!email.trim()) {
            setStatus({ tipo: 'error', mensaje: 'Por favor, ingresá tu email.' });
            return;
        }

        setStatus({ tipo: 'loading', mensaje: 'Enviando enlace de recuperación...' });

        // Supabase envía un email con un link mágico para restablecer la contraseña
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/actualizar-contrasena`,
        });

        if (error) {
            setStatus({ tipo: 'error', mensaje: `Error: ${error.message}` });
        } else {
            setStatus({
                tipo: 'ok',
                mensaje: 'Te enviamos un enlace a tu email para restablecer la contraseña. Revisá tu bandeja de entrada (y la carpeta de Spam).'
            });
        }
    }

    return (
        <>
            <Header docente={null} />
            <main>
                <div className="center-card">
                    <h2>Recuperar Contraseña</h2>
                    <p className="hint">Ingresá el email con el que te registraste en el sistema. Te enviaremos un enlace seguro para que puedas crear una nueva contraseña.</p>

                    <form onSubmit={recuperarContrasena}>
                        <div className="field">
                            <label>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu-email@ejemplo.com"
                                required
                            />
                        </div>
                        <button className="btn block" type="submit">Enviar enlace de recuperación</button>
                    </form>

                    {status && <div className={`status ${status.tipo}`}>{status.mensaje}</div>}

                    <p className="hint" style={{ marginTop: 16, marginBottom: 0 }}>
                        ¿Recordaste tu contraseña? <Link href="/" style={{ color: 'var(--accent)', fontWeight: 600 }}>Volver al Login</Link>
                    </p>
                </div>
            </main>
        </>
    );
}