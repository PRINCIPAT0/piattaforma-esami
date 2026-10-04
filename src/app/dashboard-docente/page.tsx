"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { creaCorso, ottieniCorsiDocente, eliminaCorso, ottieniProfiloUtente, eseguiLogout } from "./actions";

export default function DashboardDocente() {
  const router = useRouter();
  const [nomeCorso, setNomeCorso] = useState("");
  const [annoAccad, setAnnoAccad] = useState("");
  const [messaggio, setMessaggio] = useState("");
  const [corsi, setCorsi] = useState<any[]>([]);
  const [profilo, setProfilo] = useState<{nome: string, cognome: string, matricola: string | null, email: string} | null>(null);

  const caricaDati = async () => {
    try {
      const [datiCorsi, datiProfilo] = await Promise.all([
        ottieniCorsiDocente(),
        ottieniProfiloUtente()
      ]);
      setCorsi(datiCorsi || []);
      setProfilo(datiProfilo);
    } catch (error) {
      console.error("Errore nel caricamento dati:", error);
    }
  };

  useEffect(() => {
    caricaDati();
  }, []);

  const handleCreaCorso = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessaggio("Creazione in corso...");
    const risultato = await creaCorso({ nome: nomeCorso, annoAccad });

    if (risultato.success) {
      setMessaggio("Corso creato!");
      setNomeCorso("");
      setAnnoAccad("");
      caricaDati();
    } else {
      setMessaggio(risultato.error || "Errore");
    }
  };

  const handleLogout = async () => {
    await eseguiLogout();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* ------------------- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Area Docente</h1>
            {profilo && (
              <p className="text-gray-500 mt-1">
                Benvenuto, <span className="font-medium text-gray-800">{profilo.nome} {profilo.cognome}</span>
              </p>
            )}
          </div>
          
          {profilo && (
            <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="bg-blue-600 text-white rounded-full h-12 w-12 flex items-center justify-center font-bold text-lg shadow-inner">
                {profilo.nome.charAt(0).toUpperCase()}{profilo.cognome.charAt(0).toUpperCase()}
              </div>
              <div className="text-sm">
                <p className="text-gray-900 font-medium">Matricola: <span className="text-blue-600 font-semibold">{profilo.matricola || "N/A"}</span></p>
                <p className="text-gray-500 text-xs mt-0.5">{profilo.email}</p>
              </div>
              
              {/* ---------------------- */}
              <div className="ml-2 pl-4 border-l border-gray-200">
                <button 
                  onClick={handleLogout}
                  className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
                >
                  Esci
                </button>
              </div>
              {/* --------------------------- */}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">I Miei Corsi</h2>
            {corsi.length === 0 ? (
              <p className="text-gray-500 text-sm">Nessun corso creato al momento.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {corsi.map((corso) => (
                  <div key={corso.id} className="border border-gray-200 p-4 rounded-lg hover:shadow-md transition-shadow">
                    <h3 className="font-semibold text-lg text-blue-700">{corso.nome}</h3>
                    <p className="text-sm text-gray-500 mb-3">Anno: {corso.annoAccad}</p>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                      <Link href={`/dashboard-docente/corsi/${corso.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                        Gestisci Prove
                      </Link>
                      <button 
                        onClick={async () => {
                          if(confirm("Vuoi davvero eliminare questo corso? Tutte le prove associate andranno perse.")) {
                            await eliminaCorso(corso.id);
                            caricaDati(); 
                          }
                        }} className="text-sm text-red-500 font-medium hover:text-red-700 hover:underline"
                      >
                        Elimina
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Nuovo Corso</h2>
            <form onSubmit={handleCreaCorso} className="space-y-4">
              <input type="text" required value={nomeCorso} onChange={(e) => setNomeCorso(e.target.value)} placeholder="Nome Corso (es. Informatica)" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900" />
              <input type="text" required value={annoAccad} onChange={(e) => setAnnoAccad(e.target.value)} placeholder="Anno (es. 2024/2025)" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900" />
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md font-medium text-sm hover:bg-blue-700 transition-colors">Aggiungi Corso</button>
              {messaggio && <p className="text-sm text-center mt-2 text-gray-600">{messaggio}</p>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}