'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';

// Credenciales directas de Supabase
const SUPABASE_URL = 'https://ghzbphqkbdhbstpefney.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VGE6IcSXLn5lE1n-Qt5bvw_KZT2ng2a';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Socio { id: string; full_name: string; elo: number; role: string; cuota_al_dia: boolean; }
interface Torneo { id: string; nombre: string; fecha: string; costo_inscripcion: number; }
interface Clase { id: string; titulo: string; dia_horario: string; profesor: string; }
interface Inscripcion { id: string; torneo_id: string; socio_id: string; pago_confirmado: boolean; profiles?: { full_name: string }; torneos?: { nombre: string }; }

export default function Home() {
  // Estados de Autenticación
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('socio');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Estados de Navegación y Datos
  const [tab, setTab] = useState<'socios' | 'torneos' | 'clases' | 'cobranzas'>('socios');
  const [socios, setSocios] = useState<Socio[]>([]);
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulario de Torneo / Clase (Admins)
  const [torneoNombre, setTorneoNombre] = useState('');
  const [torneoFecha, setTorneoFecha] = useState('');
  const [torneoCosto, setTorneoCosto] = useState('0');
  const [claseTitulo, setClaseTitulo] = useState('');
  const [claseHorario, setClaseHorario] = useState('');
  const [claseProfe, setClaseProfe] = useState('');

  // Bloqueo PWA
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(true);

  // 1. Cargar Sesión y Datos de Perfil
  async function cargarUsuarioYPerfil(sessionUser: any) {
    if (!sessionUser) {
      setUser(null);
      setUserRole('socio');
      return;
    }
    setUser(sessionUser);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', sessionUser.id)
      .single();

    if (profile) setUserRole(profile.role || 'socio');
  }

  async function fetchDatos() {
    setLoading(true);
    const { data: dSocios } = await supabase.from('profiles').select('*').order('elo', { ascending: false });
    const { data: dTorneos } = await supabase.from('torneos').select('*');
    const { data: dClases } = await supabase.from('clases').select('*');
    const { data: dInscripciones } = await supabase.from('inscripciones').select('*, profiles(full_name), torneos(nombre)');

    if (dSocios) setSocios(dSocios as Socio[]);
    if (dTorneos) setTorneos(dTorneos as Torneo[]);
    if (dClases) setClases(dClases as Clase[]);
    if (dInscripciones) setInscripciones(dInscripciones as any);
    setLoading(false);
  }

  useEffect(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsStandalone(isPWA);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsStandalone(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Observer del estado de autenticación
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) cargarUsuarioYPerfil(session.user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      cargarUsuarioYPerfil(session?.user ?? null);
    });

    fetchDatos();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 2. Manejo de Login y Registro
  async function handleAuth(e: FormEvent) {
    e.preventDefault();
    if (isRegistering) {
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      });

      if (error) {
        alert('Error al registrarse: ' + error.message);
      } else if (data.user) {
        await supabase.from('profiles').insert([
          {
            id: data.user.id,
            full_name: authName || 'Socio Nuevo',
            elo: 1200,
            role: 'socio',
            cuota_al_dia: false,
          },
        ]);
        alert('¡Cuenta creada con éxito! Ya podés ingresar.');
        setIsRegistering(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) alert('Error al ingresar: ' + error.message);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  // 3. Acciones de Socios y Cobranzas
  async function handleInscribirseTorneo(torneoId: string) {
    if (!user) return alert('Debés iniciar sesión para anotarte.');
    const { error } = await supabase.from('inscripciones').insert([
      { torneo_id: torneoId, socio_id: user.id, pago_confirmado: false },
    ]);
    if (error) {
      alert('Ya estás inscripto a este torneo.');
    } else {
      alert('¡Te anotaste correctamente! Estado: Pendiente de pago.');
      fetchDatos();
    }
  }

  async function togglePagoCuota(socioId: string, valorActual: boolean) {
    await supabase.from('profiles').update({ cuota_al_dia: !valorActual }).eq('id', socioId);
    fetchDatos();
  }

  async function togglePagoTorneo(inscripcionId: string, valorActual: boolean) {
    await supabase.from('inscripciones').update({ pago_confirmado: !valorActual }).eq('id', inscripcionId);
    fetchDatos();
  }

  async function handleGuardarTorneo(e: FormEvent) {
    e.preventDefault();
    await supabase.from('torneos').insert([
      { nombre: torneoNombre, fecha: torneoFecha, costo_inscripcion: parseFloat(torneoCosto) || 0 },
    ]);
    setTorneoNombre(''); setTorneoFecha(''); setTorneoCosto('0'); fetchDatos();
  }

  async function handleGuardarClase(e: FormEvent) {
    e.preventDefault();
    await supabase.from('clases').insert([
      { titulo: claseTitulo, dia_horario: claseHorario, profesor: claseProfe },
    ]);
    setClaseTitulo(''); setClaseHorario(''); setClaseProfe(''); fetchDatos();
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsStandalone(true);
      setDeferredPrompt(null);
    } else {
      alert('En iPhone: tocá Compartir ⎋ y seleccioná "Agregar a inicio".');
    }
  };

  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const isCobranza = userRole === 'cobranza' || isAdmin;

  return (
    <main className="min-h-screen bg-slate-900 text-white p-4 md:p-8 relative">
      {/* BLOQUEO DE PANTALLA PWA SI NO ESTÁ INSTALADA */}
      {!isStandalone && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl max-w-md shadow-2xl space-y-6">
            <span className="text-6xl">♟️</span>
            <h2 className="text-2xl font-bold text-amber-400">Instalación Requerida</h2>
            <p className="text-slate-300 text-sm">Instalá la aplicación en tu celular para continuar.</p>
            <button onClick={handleInstallClick} className="w-full bg-amber-500 font-bold text-slate-950 py-3 rounded-xl">
              📲 Instalar Aplicación Ahora
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        <header className="border-b border-slate-700 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-amber-400">♟️ Club de Ajedrez</h1>
            <p className="text-slate-400">Padrón, Torneos y Cobranzas</p>
          </div>
          {user && (
            <div className="text-right">
              <span className="block text-xs text-amber-400 capitalize font-bold">Rol: {userRole}</span>
              <button onClick={handleLogout} className="text-xs text-rose-400 underline mt-1">Cerrar Sesión</button>
            </div>
          )}
        </header>

        {/* PANTALLA DE LOGIN/REGISTRO */}
        {!user ? (
          <section className="bg-slate-800 rounded-lg p-6 max-w-md mx-auto shadow-xl border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 text-center">{isRegistering ? 'Crear Cuenta de Socio' : 'Ingresar a la App'}</h2>
            <form onSubmit={handleAuth} className="space-y-4">
              {isRegistering && (
                <input
                  type="text"
                  placeholder="Nombre y Apellido"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
                  required
                />
              )}
              <input
                type="email"
                placeholder="Correo Electrónico"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
                required
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
                required
              />
              <button type="submit" className="w-full bg-amber-500 font-bold text-slate-950 rounded p-2">
                {isRegistering ? 'Registrarme' : 'Iniciar Sesión'}
              </button>
            </form>
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="w-full text-center text-xs text-slate-400 mt-4 underline"
            >
              {isRegistering ? '¿Ya tenés cuenta? Iniciá sesión' : '¿No tenés cuenta? Registrate como socio'}
            </button>
          </section>
        ) : (
          <>
            {/* BARRA DE PESTAÑAS */}
            <div className="flex space-x-2 border-b border-slate-700 overflow-x-auto">
              <button
                onClick={() => setTab('socios')}
                className={`py-2 px-4 font-bold border-b-2 transition ${tab === 'socios' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400'}`}
              >
                👥 Socios
              </button>
              <button
                onClick={() => setTab('torneos')}
                className={`py-2 px-4 font-bold border-b-2 transition ${tab === 'torneos' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400'}`}
              >
                🏆 Torneos
              </button>
              <button
                onClick={() => setTab('clases')}
                className={`py-2 px-4 font-bold border-b-2 transition ${tab === 'clases' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400'}`}
              >
                📚 Clases
              </button>
              {isCobranza && (
                <button
                  onClick={() => setTab('cobranzas')}
                  className={`py-2 px-4 font-bold border-b-2 transition ${tab === 'cobranzas' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400'}`}
                >
                  💰 Cobranzas
                </button>
              )}
            </div>

            {/* TAB SOCIOS */}
            {tab === 'socios' && (
              <section className="bg-slate-800 rounded-lg p-6 shadow-xl">
                <h2 className="text-xl font-semibold mb-4">Ranking de Jugadores</h2>
                {loading ? <p className="text-slate-400">Cargando datos...</p> : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400">
                        <th className="py-2">Nombre</th>
                        <th className="py-2">Rol</th>
                        <th className="py-2 text-right">ELO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {socios.map((s) => (
                        <tr key={s.id} className="border-b border-slate-700/50">
                          <td className="py-3 font-medium">{s.full_name}</td>
                          <td className="py-3 text-slate-400 capitalize">{s.role}</td>
                          <td className="py-3 text-right font-bold text-amber-400">{s.elo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            )}

            {/* TAB TORNEOS */}
            {tab === 'torneos' && (
              <div className="space-y-6">
                {isAdmin && (
                  <section className="bg-slate-800 rounded-lg p-6 shadow-xl">
                    <h2 className="text-xl font-semibold mb-4 text-amber-400">Crear Nuevo Torneo (Admin)</h2>
                    <form onSubmit={handleGuardarTorneo} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <input type="text" placeholder="Nombre" value={torneoNombre} onChange={(e) => setTorneoNombre(e.target.value)} className="bg-slate-700 border border-slate-600 rounded p-2" required />
                      <input type="text" placeholder="Fecha y Hora" value={torneoFecha} onChange={(e) => setTorneoFecha(e.target.value)} className="bg-slate-700 border border-slate-600 rounded p-2" required />
                      <input type="number" placeholder="Costo ($)" value={torneoCosto} onChange={(e) => setTorneoCosto(e.target.value)} className="bg-slate-700 border border-slate-600 rounded p-2" required />
                      <button type="submit" className="bg-amber-500 font-bold text-slate-950 rounded p-2">+ Crear</button>
                    </form>
                  </section>
                )}

                <section className="bg-slate-800 rounded-lg p-6 shadow-xl">
                  <h2 className="text-xl font-semibold mb-4">Próximos Torneos</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {torneos.map((t) => {
                      const miInscripcion = inscripciones.find((i) => i.torneo_id === t.id && i.socio_id === user.id);
                      return (
                        <div key={t.id} className="bg-slate-700/50 border border-slate-600 p-4 rounded-lg flex justify-between items-center">
                          <div>
                            <h3 className="font-bold text-amber-400 text-lg">{t.nombre}</h3>
                            <p className="text-slate-300 text-sm">📅 {t.fecha}</p>
                            <p className="text-slate-400 text-sm">💵 Inscripción: ${t.costo_inscripcion}</p>
                          </div>
                          <div>
                            {miInscripcion ? (
                              <span className={`text-xs px-2 py-1 rounded font-bold ${miInscripcion.pago_confirmado ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                {miInscripcion.pago_confirmado ? '✅ Inscripto (Pagado)' : '⏳ Pendiente de Pago'}
                              </span>
                            ) : (
                              <button
                                onClick={() => handleInscribirseTorneo(t.id)}
                                className="bg-amber-500 hover:bg-amber-600 font-bold text-slate-950 text-sm py-2 px-3 rounded"
                              >
                                📲 Anotarme
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* TAB CLASES */}
            {tab === 'clases' && (
              <div className="space-y-6">
                {isAdmin && (
                  <section className="bg-slate-800 rounded-lg p-6 shadow-xl">
                    <h2 className="text-xl font-semibold mb-4 text-amber-400">Publicar Clase (Admin)</h2>
                    <form onSubmit={handleGuardarClase} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <input type="text" placeholder="Título" value={claseTitulo} onChange={(e) => setClaseTitulo(e.target.value)} className="bg-slate-700 border border-slate-600 rounded p-2" required />
                      <input type="text" placeholder="Día/Horario" value={claseHorario} onChange={(e) => setClaseHorario(e.target.value)} className="bg-slate-700 border border-slate-600 rounded p-2" required />
                      <input type="text" placeholder="Profesor" value={claseProfe} onChange={(e) => setClaseProfe(e.target.value)} className="bg-slate-700 border border-slate-600 rounded p-2" required />
                      <button type="submit" className="bg-amber-500 font-bold text-slate-950 rounded p-2">+ Publicar</button>
                    </form>
                  </section>
                )}

                <section className="bg-slate-800 rounded-lg p-6 shadow-xl">
                  <h2 className="text-xl font-semibold mb-4">Horarios de Clases</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clases.map((c) => (
                      <div key={c.id} className="bg-slate-700/50 border border-slate-600 p-4 rounded-lg">
                        <h3 className="font-bold text-amber-400 text-lg">{c.titulo}</h3>
                        <p className="text-slate-300 text-sm">🕒 {c.dia_horario}</p>
                        <p className="text-slate-400 text-sm">👨‍🏫 Prof: {c.profesor}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* TAB COBRANZAS */}
            {tab === 'cobranzas' && isCobranza && (
              <div className="space-y-6">
                <section className="bg-slate-800 rounded-lg p-6 shadow-xl">
                  <h2 className="text-xl font-semibold mb-4 text-amber-400">Cuotas Mensuales de Socios</h2>
                  <div className="space-y-2">
                    {socios.map((s) => (
                      <div key={s.id} className="flex justify-between items-center bg-slate-700/40 p-3 rounded border border-slate-600">
                        <span>{s.full_name}</span>
                        <button
                          onClick={() => togglePagoCuota(s.id, s.cuota_al_dia)}
                          className={`text-xs font-bold py-1 px-3 rounded transition ${s.cuota_al_dia ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'}`}
                        >
                          {s.cuota_al_dia ? 'Cuota al Día ✅' : 'Marcar como Pagado 💵'}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-slate-800 rounded-lg p-6 shadow-xl">
                  <h2 className="text-xl font-semibold mb-4 text-amber-400">Cobro de Torneos</h2>
                  <div className="space-y-2">
                    {inscripciones.map((ins) => (
                      <div key={ins.id} className="flex justify-between items-center bg-slate-700/40 p-3 rounded border border-slate-600">
                        <div>
                          <p className="font-bold">{ins.profiles?.full_name}</p>
                          <p className="text-xs text-slate-400">Torneo: {ins.torneos?.nombre}</p>
                        </div>
                        <button
                          onClick={() => togglePagoTorneo(ins.id, ins.pago_confirmado)}
                          className={`text-xs font-bold py-1 px-3 rounded transition ${ins.pago_confirmado ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'}`}
                        >
                          {ins.pago_confirmado ? 'Pago Confirmado ✅' : 'Confirmar Pago 💵'}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}