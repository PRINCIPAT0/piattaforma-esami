"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ottieniDettaglioCorso, creaProva, eliminaProva } from "../../actions"; 

export default function DettaglioCorso() {
  const params = useParams();
  const corsoId = parseInt(params.id as string);

  const [corso, setCorso] = useState<any>(null);
  const [mostraForm, setMostraForm] = useState(false);
  const [messaggio, setMessaggio] = useState("");

  const [titolo, setTitolo] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [tipo, setTipo] = useState("HOMEWORK");
  const [scadenza, setScadenza] = useState("");
  const [peso, setPeso] = useState("");

  const caricaCorso = async () => {
    const dati = await ottieniDettaglioCorso(corsoId);
    setCorso(dati);
  };

  useEffect(() => {
    if (corsoId) caricaCorso();
  }, [corsoId]);

  const handleCreaProva = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessaggio("Salvataggio in corso...");
    
    const risultato = await creaProva({ 
      titolo, descrizione, tipo, scadenza, peso, corsoId 
    });

    if (risultato.success) {
      setMessaggio("");
      setMostraForm(false);
      setTitolo(""); setDescrizione(""); setScadenza(""); setPeso("");
      caricaCorso();
    } else {
      setMessaggio(risultato.error || "Errore di salvataggio");
    }
  };

  if (!corso) return <div className="p-8 text-center text-gray-500">Caricamento corso...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/dashboard-docente" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
              &larr; Torna ai corsi
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{corso.nome}</h1>
            <p className="text-gray-500">Anno Accademico: {corso.annoAccad}</p>
          </div>
          
          {/* -------------------- */}
          <div className="flex gap-3">
            <Link 
              href={`/dashboard-docente/corsi/${corso.id}/registro`}
              className="bg-white text-blue-700 border border-blue-200 px-4 py-2 rounded-md font-medium hover:bg-blue-50 transition-colors text-sm"
            >
              📊 Registro di Classe
            </Link>
            <button 
              onClick={() => setMostraForm(!mostraForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors text-sm"
            >
              {mostraForm ? "Annulla" : "+ Nuova Prova"}
            </button>
          </div>
        </div>

        {mostraForm && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-200 mb-8">
            <h2 className="text-lg font-semibold mb-4 text-blue-800">Crea una nuova componente di valutazione</h2>
            
            <form onSubmit={handleCreaProva} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Titolo</label>
                  <input type="text" required value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Es. Primo Homework" className="mt-1 w-full px-3 py-2 border rounded-md text-sm text-gray-900 outline-none focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipologia</label>
                  <select required value={tipo} onChange={(e) => setTipo(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md text-sm text-gray-900 outline-none focus:ring-blue-500">
                    <option value="HOMEWORK">Homework</option>
                    <option value="IN_ITINERE">Prova in Itinere</option>
                    <option value="PROGETTO">Progetto Pratico</option>
                    <option value="PROVA_FINALE">Esame Finale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Scadenza Consegna</label>
                  <input type="datetime-local" required value={scadenza} onChange={(e) => setScadenza(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md text-sm text-gray-900 outline-none focus:ring-blue-500" />
                </div>
                <div>
                  {/* ---------------------- */}
                  {(() => {
                    const pesoUsato = corso.prove.reduce((acc: number, p: any) => acc + p.peso, 0);
                    const pesoRimanente = 100 - pesoUsato;
                    
                    return (
                      <>
                        <label className="block text-sm font-medium text-gray-700">
                          Peso % <span className="text-blue-600">(Max {pesoRimanente}%)</span>
                        </label>
                        <input 
                          type="number" step="0.1" required min="1" max={pesoRimanente} 
                          value={peso} onChange={(e) => setPeso(e.target.value)} 
                          placeholder={`Es. ${pesoRimanente}`} 
                          disabled={pesoRimanente <= 0}
                          className="mt-1 w-full px-3 py-2 border rounded-md text-sm text-gray-900 outline-none focus:ring-blue-500 disabled:bg-gray-200" 
                        />
                      </>
                    )
                  })()}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Descrizione (Opzionale)</label>
                <textarea value={descrizione} onChange={(e) => setDescrizione(e.target.value)} rows={2} placeholder="Regole, argomenti trattati, formato file..." className="mt-1 w-full px-3 py-2 border rounded-md text-sm text-gray-900 outline-none focus:ring-blue-500"></textarea>
              </div>
              <button type="submit" disabled={(() => {
                const pesoUsato = corso.prove.reduce((acc: number, p: any) => acc + p.peso, 0);
                return (100 - pesoUsato) <= 0;
              })()} className="bg-green-600 text-white px-6 py-2 rounded-md font-medium hover:bg-green-700 text-sm transition-colors disabled:bg-gray-400">
                Salva Prova
              </button>
              {messaggio && <span className="ml-4 text-sm font-semibold text-red-600">{messaggio}</span>}
            </form>
          </div>
        )}

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Elenco Prove</h2>
          {corso.prove.length === 0 ? (
            <p className="text-gray-500 text-sm">Nessuna prova configurata per questo corso.</p>
          ) : (
            <div className="space-y-4">
              {corso.prove.map((prova: any) => (
                <div key={prova.id} className="p-4 border border-gray-200 rounded-lg flex justify-between items-center bg-gray-50 hover:bg-white transition-colors">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      {prova.titolo} <span className="text-xs font-normal text-gray-500 ml-2 uppercase tracking-wide">({prova.tipo.replace("_", " ")})</span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{prova.descrizione}</p>
                    <div className="flex gap-3 mt-3 text-xs font-medium">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Peso: {prova.peso}%</span>
                      <span className="bg-gray-200 text-gray-800 px-2 py-1 rounded">
                        Scadenza: {new Date(prova.scadenza).toLocaleString("it-IT", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 items-end">
                    <Link 
                      href={`/dashboard-docente/prove/${prova.id}`} 
                      className="text-sm text-center text-blue-600 font-medium hover:underline bg-blue-50 px-3 py-2 rounded-md border border-blue-100 block"
                    >
                      Vedi Consegne
                    </Link>
                    <button 
                      onClick={async () => {
                        if(confirm("Vuoi davvero eliminare questa prova? Le eventuali consegne andranno perse.")) {
                          await eliminaProva(prova.id);
                          caricaCorso(); 
                        }
                      }}
                      className="text-sm text-red-600 font-medium hover:underline px-3 py-1"
                    >
                      Elimina Prova
                    </button>
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