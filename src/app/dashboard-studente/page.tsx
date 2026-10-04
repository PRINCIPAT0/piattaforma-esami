"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; 
import { ottieniCorsiConIscrizione, iscrivitiCorso, disiscrivitiCorso, ottieniProfiloStudente, eseguiLogout } from "./actions"; 

export default function DashboardStudente() {
  const router = useRouter();
  const [corsi, setCorsi] = useState<any[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  
  const [profilo, setProfilo] = useState<{nome: string, cognome: string, matricola: string | null, email: string} | null>(null);

  const caricaDati = async () => {
    try {
      const datiCorsi = await ottieniCorsiConIscrizione();
      const datiProfilo = await ottieniProfiloStudente();
      
      setCorsi(datiCorsi || []);
      setProfilo(datiProfilo);
    } catch (error) {
      console.error("Errore nel caricamento dei dati:", error);
    } finally {
      setCaricamento(false);
    }
  };

  useEffect(() => {
    caricaDati();
  }, []);

  const handleIscrizione = async (corsoId: number) => {
    const risultato = await iscrivitiCorso(corsoId);
    if (risultato.success) {
      caricaDati();
    } else {
      alert("Si è verificato un errore durante l'iscrizione.");
    }
  };

  const handleDisiscrizione = async (corsoId: number) => {
    if (confirm("Sei sicuro di volerti disiscrivere da questo corso? Non vedrai più le prove e le consegne.")) {
      const risultato = await disiscrivitiCorso(corsoId);
      if (risultato.success) {
        caricaDati();
      } else {
        alert("Errore durante la disiscrizione.");
      }
    }
  };

  const handleLogout = async () => {
    await eseguiLogout();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        
        {}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Area Studente</h1>
            {profilo && (
              <p className="text-gray-500 mt-1">
                Bentornato, <span className="font-medium text-gray-800">{profilo.nome} {profilo.cognome}</span>
              </p>
            )}
          </div>
          
          {profilo && (
            <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              
              <div className="text-sm">
                <p className="text-gray-900 font-medium">Matricola: <span className="text-blue-600 font-semibold">{profilo.matricola || "N/A"}</span></p>
                <p className="text-gray-500 text-xs mt-0.5">{profilo.email}</p>
              </div>
              
              {/* --------------------------- */}
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
        {/* ----------------------------------- */}

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Corsi Disponibili</h2>
          
          {caricamento ? (
            <p className="text-gray-500 text-sm">Caricamento in corso...</p>
          ) : corsi.length === 0 ? (
            <p className="text-gray-500 text-sm">Non ci sono corsi disponibili al momento.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {corsi.map((corso) => (
                <div key={corso.id} className="border border-gray-200 p-5 rounded-lg flex flex-col justify-between hover:shadow-md transition-shadow bg-gray-50">
                  <div>
                    <h3 className="font-bold text-lg text-blue-900">{corso.nome}</h3>
                    <p className="text-sm text-gray-600 mt-1">A.A. {corso.annoAccad}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Docente: {corso.docente.nome} {corso.docente.cognome}
                    </p>
                  </div>
                  
                  <div className="mt-5">
                    {corso.iscritto ? (
                      <div className="flex gap-2">
                        <Link 
                          href={`/dashboard-studente/corsi/${corso.id}`}
                          className="flex-1 text-center bg-blue-100 text-blue-700 py-2 rounded-md font-medium hover:bg-blue-200 transition-colors text-sm"
                        >
                          Vai al Corso &rarr;
                        </Link>
                        <button 
                          onClick={() => handleDisiscrizione(corso.id)}
                          className="px-3 bg-white text-red-600 border border-red-200 py-2 rounded-md font-medium hover:bg-red-50 transition-colors text-sm"
                          title="Annulla Iscrizione"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleIscrizione(corso.id)}
                        className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 transition-colors text-sm"
                      >
                        Iscriviti
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}