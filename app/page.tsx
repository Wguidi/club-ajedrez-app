'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';

// Credenciales directas de Supabase
const SUPABASE_URL = 'https://ghzbphqkbdhbstpefney.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_...'; // PEGÁ ACÁ TU CLAVE ANON_KEY COMPLETA

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Socio {
  id: string;
  full_name: string;
  elo: number;
  role: string;
}

export default function Home() {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [elo, setElo] = useState('1200');

  // Estados para controlar la instalación de la PWA
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(true);

  // Función de carga declarada en el ámbito principal
  async function fetchSocios() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('elo', { ascending: false });

      if (!error && data) {
        setSocios(data as Socio[]);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  useEffect(() => {
    // Detectar si la app ya está instalada o abierta en modo standalone
    const isPWA =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone;
    setIsStandalone(isPWA);

    // Capturar el evento de instalación del navegador
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsStandalone(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Cargar socios al iniciar
    fetchSocios();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Lanzar la ventana emergente de instalación
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    } else {
      alert(
        'Para instalar en iPhone (Safari): tocá el botón Compartir ⎋ y seleccioná "Agregar a inicio".'
      );
    }
  };

  async function handleGuardarSocio(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nombre) return;

    const { error } = await supabase.from('profiles').insert([
      {
        full_name: nombre,
        elo: parseInt(elo, 10) || 1200,
        role: 'socio',
      },
    ]);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setNombre('');
      setElo('1200');
      fetchSocios();
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white p-8 relative">
      {/* PANTALLA DE BLOQUEO DE INSTALACIÓN (PWA) */}
      {!isStandalone && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl max-w-md shadow-2xl space-y-6">
            <span className="text-6xl">♟️</span>
            <h2 className="text-2xl font-bold text-amber-400">Instalación Requerida</h2>
            <p className="text-slate-300 text-sm">
              Para utilizar la aplicación del Club de Ajedrez debés instalarla en la pantalla de inicio de tu celular.
            </p>
            <button
              onClick={handleInstallClick}
              className="w-full bg-amber-500 hover:bg-amber-600 font-bold text-slate-950 py-3 px-6 rounded-xl transition shadow-lg text-lg"
            >
              📲 Instalar Aplicación Ahora
            </button>
            <p className="text-xs text-slate-500">
              Sin la app instalada, la pantalla permanecerá bloqueada.
            </p>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="border-b border-slate-700 pb-4">
          <h1 className="text-3xl font-bold text-amber-400">♟️ Club de Ajedrez</h1>
          <p className="text-slate-400">Padrón oficial de socios y ranking ELO</p>
        </header>

        <section className="bg-slate-800 rounded-lg p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-4 text-slate-200">Cargar Nuevo Socio</h2>
          <form onSubmit={handleGuardarSocio} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Nombre y Apellido"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded p-2 text-white placeholder-slate-400 col-span-2"
              required
            />
            <input
              type="number"
              placeholder="ELO"
              value={elo}
              onChange={(e) => setElo(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded p-2 text-white"
              required
            />
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 font-bold text-slate-950 rounded p-2 transition"
            >
              + Agregar
            </button>
          </form>
        </section>

        <section className="bg-slate-800 rounded-lg p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-4 text-slate-200">Ranking de Jugadores</h2>

          {loading ? (
            <p className="text-slate-400">Cargando datos desde Supabase...</p>
          ) : socios.length === 0 ? (
            <p className="text-slate-400">Aún no hay socios registrados en la base de datos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="py-2">Nombre</th>
                    <th className="py-2">Rol</th>
                    <th className="py-2 text-right">ELO</th>
                  </tr>
                </thead>
                <tbody>
                  {socios.map((socio) => (
                    <tr key={socio.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 font-medium">{socio.full_name}</td>
                      <td className="py-3 capitalize text-slate-400">{socio.role}</td>
                      <td className="py-3 text-right font-bold text-amber-400">{socio.elo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}