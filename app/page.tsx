'use client';

// Deshabilita la generación estática durante 'next build'
export const dynamic = 'force-dynamic';

import { useEffect, useState, FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';

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

  useEffect(() => {
    // La conexión se realiza ÚNICAMENTE cuando el cliente abre la página en el navegador
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ghzbphqkbdhbstpefney.supabase.co';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy';
    const supabase = createClient(url, key);

    async function fetchSocios() {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('elo', { ascending: false });

      if (data) setSocios(data as Socio[]);
      setLoading(false);
    }

    fetchSocios();
  }, []);

  async function handleGuardarSocio(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nombre) return;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ghzbphqkbdhbstpefney.supabase.co';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy';
    const supabase = createClient(url, key);

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
      window.location.reload();
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white p-8">
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