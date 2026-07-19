import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Lock, LogIn, Moon, Sun, User2 } from 'lucide-react';
import logoNova from '../../imports/nova-removebg-preview-1.png';
import { useAuth } from './AuthContext';

export function Login() {
  const { login } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [error, setError] = useState('');
  const [temaLogin, setTemaLogin] = useState<'claro' | 'oscuro'>(() => {
    if (typeof window === 'undefined') {
      return 'claro';
    }

    return window.localStorage.getItem('nova-theme') === 'oscuro' ? 'oscuro' : 'claro';
  });

  const credenciales = useMemo(
    () => ({
      admin: { password: '123', role: 'admin' as const, name: 'Administrador' },
      user: { password: '123', role: 'user' as const, name: 'Usuario Estandar' },
    }),
    []
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', temaLogin === 'oscuro');
    window.localStorage.setItem('nova-theme', temaLogin);
  }, [temaLogin]);

  const handleUsuarioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const valor = event.target.value;
    if (/^[a-zA-Z\s]*$/.test(valor)) {
      setUsuario(valor.toLowerCase());
    }
  };

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();

    const usuarioNormalizado = usuario.trim().toLowerCase() as 'admin' | 'user';
    const credencial = credenciales[usuarioNormalizado];

    if (credencial && contrasena === credencial.password) {
      setError('');
      login(credencial.role, credencial.name);
      return;
    }

    setError('Usuario o contrasena incorrectos.');
  };

  const loginInputClass =
    temaLogin === 'oscuro'
      ? 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-500'
      : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400';

  return (
    <div data-login-theme={temaLogin} className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-8 dark:bg-slate-950">
      <style>{`
        [data-login-theme="claro"] .login-input,
        [data-login-theme="claro"] .login-input:not(:placeholder-shown) {
          background-color: #ffffff;
          color: #0f172a;
        }

        [data-login-theme="claro"] .login-input:-webkit-autofill,
        [data-login-theme="claro"] .login-input:-webkit-autofill:hover,
        [data-login-theme="claro"] .login-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #0f172a;
          caret-color: #0f172a;
          -webkit-box-shadow: 0 0 0px 1000px #ffffff inset;
          box-shadow: 0 0 0px 1000px #ffffff inset;
          transition: background-color 9999s ease-in-out 0s;
        }

        [data-login-theme="oscuro"] .login-input,
        [data-login-theme="oscuro"] .login-input:not(:placeholder-shown) {
          background-color: #020617;
          color: #ffffff;
        }

        .dark .login-input:-webkit-autofill,
        .dark .login-input:-webkit-autofill:hover,
        .dark .login-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #ffffff;
          caret-color: #ffffff;
          -webkit-box-shadow: 0 0 0px 1000px #020617 inset;
          box-shadow: 0 0 0px 1000px #020617 inset;
          transition: background-color 9999s ease-in-out 0s;
        }
      `}</style>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.18),_transparent_42%)] dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_42%)]" />

      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_30px_80px_rgba(2,6,23,0.55)]">
        <div className="flex items-center justify-center p-6 sm:p-8 lg:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <div className="flex flex-col items-center text-center">
                <img src={logoNova} alt="Logo NOVA" className="h-auto w-44 object-contain sm:w-52" />
                <h2 className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">Iniciar sesion</h2>
                <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-300">
                  Accede al sistema con tu perfil para continuar trabajando.
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Usuario</label>
                <div className="relative">
                  <User2 className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                  <input
                    type="text"
                    value={usuario}
                    onChange={handleUsuarioChange}
                    placeholder="Ingrese su usuario"
                    autoComplete="username"
                    className={`login-input w-full rounded-2xl py-3 pl-11 pr-4 outline-none transition-colors focus:border-[#0066ff] focus:ring-2 focus:ring-[#0066ff]/20 ${loginInputClass}`}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Contrasena</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                  <input
                    type={mostrarContrasena ? 'text' : 'password'}
                    value={contrasena}
                    onChange={(event) => setContrasena(event.target.value)}
                    placeholder="Ingrese su contrasena"
                    autoComplete="current-password"
                    className={`login-input w-full rounded-2xl py-3 pl-11 pr-14 outline-none transition-colors focus:border-[#0066ff] focus:ring-2 focus:ring-[#0066ff]/20 ${loginInputClass}`}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarContrasena((current) => !current)}
                    aria-label={mostrarContrasena ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-white dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    {mostrarContrasena ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0066ff] px-6 py-3.5 font-semibold text-white transition-colors hover:bg-[#0052cc]"
              >
                <LogIn size={20} />
                Iniciar sesion
              </button>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setTemaLogin((current) => (current === 'oscuro' ? 'claro' : 'oscuro'))}
                  aria-label={temaLogin === 'oscuro' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800"
                >
                  {temaLogin === 'oscuro' ? <Moon size={18} /> : <Sun size={18} />}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
