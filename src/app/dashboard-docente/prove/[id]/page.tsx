"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ottieniConsegneProva, valutaConsegna, eliminaValutazione } from "../../actions";

export default function ValutazioneProva() {
  const params = useParams();
  const provaId = parseInt(params.id as string);

  const [prova, setProva] = useState<any>(null);
  const [voti, setVoti] = useState<{ [key: number]: string }>({});
  const [feedbacks, setFeedbacks] = useState<{ [key: number]: string }>({});
  const [messaggio, setMessaggio] = useState<{ [key: number]: string }>({});

  const caricaProva = async () => {
    const dati = await ottieniConsegneProva(provaId);
    setProva(dati);
  };

  useEffect(() => {
    if (provaId) caricaProva();
  }, [provaId]);

  const handleValuta = async (consegnaId: number) => {
    const votoFormattato = parseFloat(voti[consegnaId]);
    const feedback = feedbacks[consegnaId] || "";

    if (isNaN(votoFormattato) || votoFormattato < 0 || votoFormattato > 100) {
      setMessaggio({ ...messaggio, [consegnaId]: "Inserisci un voto valido tra 0 e 100." });
      return;
    }

    setMessaggio({ ...messaggio, [consegnaId]: "Salvataggio..." });
    const risultato = await valutaConsegna({ consegnaId, voto: votoFormattato, feedback });

    if (risultato.success) {
      setMessaggio({ ...messaggio, [consegnaId]: "Voto salvato!" });
      setVoti({ ...voti, [consegnaId]: "" });
      setFeedbacks({ ...feedbacks, [consegnaId]: "" });
      caricaProva();
    } else {
      setMessaggio({ ...messaggio, [consegnaId]: risultato.error || "Errore" });
    }
  };

  const handleEliminaValutazione = async (valutazioneId: number) => {
    if (confirm("Sei sicuro di voler annullare questo voto? Lo studente non lo vedrà più.")) {
      const risultato = await eliminaValutazione(valutazioneId);
      if (risultato.success) {
        caricaProva();
      } else {
        alert("Errore durante l'eliminazione della valutazione.");
      }
    }
  };

  if (!prova) return <div className="p-8 text-center text-gray-500">Caricamento...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        
        <div className="mb-8">
          <Link href={`/dashboard-docente/corsi/${prova.corso.id}`} className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            &larr; Torna al corso
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{prova.titolo}</h1>
          <p className="text-gray-500">Gestione consegne per il corso di {prova.corso.nome}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Elenco Elaborati</h2>
          
          {prova.consegne.length === 0 ? (
            <p className="text-gray-500 text-sm">Nessuno studente ha ancora consegnato questa prova.</p>
          ) : (
            <div className="space-y-6">
              {prova.consegne.map((consegna: any) => {
                const dataScadenza = new Date(prova.scadenza);
                const dataConsegna = new Date(consegna.dataConsegna);
                const inRitardo = dataConsegna > dataScadenza;

                return (
                  <div key={consegna.id} className="p-5 border border-gray-200 rounded-lg bg-gray-50 flex flex-col md:flex-row gap-6">
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {consegna.studente.nome} {consegna.studente.cognome}
                        </h3>
                        {inRitardo && (
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-medium">
                            Consegnato in ritardo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-4">
                        Data invio: {dataConsegna.toLocaleString("it-IT")}
                      </p>
                      <div className="bg-white p-4 border border-gray-200 rounded-md text-sm text-gray-700 whitespace-pre-wrap">
                        {consegna.testo}
                      </div>
                    </div>

                    <div className="w-full md:w-72 bg-white p-4 border border-blue-100 rounded-md shadow-sm">
                      {consegna.valutazione ? (
                        <div className="flex flex-col h-full justify-between">
                          <div>
                            <p className="text-sm font-semibold text-green-700 mb-2">✅ Valutazione completata</p>
                            <p className="text-3xl font-bold text-gray-900 mb-2">{consegna.valutazione.voto}</p>
                            <p className="text-sm text-gray-600 mb-4">
                              <span className="font-medium">Feedback:</span> {consegna.valutazione.feedbackDocente || "Nessun feedback."}
                            </p>
                          </div>
                          
                          <button 
                            onClick={() => handleEliminaValutazione(consegna.valutazione.id)}
                            className="w-full mt-2 text-sm text-red-600 font-medium hover:bg-red-50 border border-red-200 py-1.5 rounded-md transition-colors"
                          >
                            Annulla Voto
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-blue-900">Assegna un voto</p>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Voto (es. 28, 30, 100)</label>
                            <input 
                              type="number" 
                              step="0.5"
                              min="0"
                              max="100"
                              value={voti[consegna.id] || ""}
                              onChange={(e) => setVoti({ ...voti, [consegna.id]: e.target.value })}
                              className="w-full px-3 py-1.5 border rounded-md text-sm text-gray-900 bg-white outline-none focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Feedback (opzionale)</label>
                            <textarea 
                              rows={2}
                              value={feedbacks[consegna.id] || ""}
                              onChange={(e) => setFeedbacks({ ...feedbacks, [consegna.id]: e.target.value })}
                              className="w-full px-3 py-1.5 border rounded-md text-sm text-gray-900 bg-white outline-none focus:ring-blue-500"
                            ></textarea>
                          </div>
                          <button 
                            onClick={() => handleValuta(consegna.id)}
                            className="w-full bg-blue-600 text-white py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                          >
                            Salva Valutazione
                          </button>
                          {messaggio[consegna.id] && (
                            <p className="text-xs text-center text-red-600 font-semibold mt-1">{messaggio[consegna.id]}</p>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}