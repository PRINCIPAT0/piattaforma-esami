"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ottieniConsegneProva, valutaConsegna, eliminaValutazione, chiediSupportoIA } from "../../actions";

export default function ValutazioneProva() {
  const params = useParams();
  const provaId = parseInt(params.id as string);

  const [prova, setProva] = useState<any>(null);
  
  const [voti, setVoti] = useState<{ [key: number]: string }>({});
  const [feedbacks, setFeedbacks] = useState<{ [key: number]: string }>({});
  const [istruzioniIa, setIstruzioniIa] = useState<{ [key: number]: string }>({});
  const [messaggio, setMessaggio] = useState<{ [key: number]: string }>({});
  const [loadingAi, setLoadingAi] = useState<{ [key: number]: boolean }>({});
  
  const [providerDisabilitati, setProviderDisabilitati] = useState<{ groq: boolean, gemini: boolean }>({ groq: false, gemini: false });

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

    if (isNaN(votoFormattato) || votoFormattato < 0 || votoFormattato > 31) {
      setMessaggio(prev => ({ ...prev, [consegnaId]: "Inserisci un voto valido tra 0 e 31 (usa 31 per la lode)." }));
      return;
    }

    setMessaggio(prev => ({ ...prev, [consegnaId]: "Salvataggio..." }));
    const risultato = await valutaConsegna({ consegnaId, voto: votoFormattato, feedback });

    if (risultato.success) {
      setMessaggio(prev => ({ ...prev, [consegnaId]: "Voto salvato!" }));
      setVoti(prev => ({ ...prev, [consegnaId]: "" }));
      setFeedbacks(prev => ({ ...prev, [consegnaId]: "" }));
      caricaProva();
    } else {
      setMessaggio(prev => ({ ...prev, [consegnaId]: risultato.error || "Errore" }));
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

  const handleGeneraIA = async (consegnaId: number, provider: "groq" | "gemini") => {
    setLoadingAi(prev => ({ ...prev, [consegnaId]: true }));
    
    const nomeProvider = provider === "groq" ? "Groq (OpenAI)" : "Google Gemini";
    setMessaggio(prev => ({ ...prev, [consegnaId]: `Generazione in corso con ${nomeProvider}...` }));
    
    try {
      const promptDocente = istruzioniIa[consegnaId] || "";
      const risultato = await chiediSupportoIA(consegnaId, provider, promptDocente);
      
      if (risultato.success && risultato.data) {
        setVoti(prev => ({ ...prev, [consegnaId]: risultato.data.voto_suggerito.toString() }));
        
        let testoFeedback = risultato.data.osservazioni + "\n";
        if (risultato.data.errori_rilevati && risultato.data.errori_rilevati.length > 0) {
          testoFeedback += "\nDettaglio errori:\n" + risultato.data.errori_rilevati.map(
            (e: any) => `- [${e.riga}]: ${e.descrizione}`
          ).join("\n");
        }
        
        setFeedbacks(prev => ({ ...prev, [consegnaId]: testoFeedback.trim() }));
        setMessaggio(prev => ({ ...prev, [consegnaId]: `✨ Bozza generata da ${nomeProvider}! Rivedi e salva.` }));
      
      } else {
        setMessaggio(prev => ({ ...prev, [consegnaId]: risultato.error || "Errore IA" }));
        if (risultato.error?.includes("non è configurata")) {
          setProviderDisabilitati(prev => ({ ...prev, [provider]: true }));
        }
      }
    } catch (error) {
      console.error(error);
      setMessaggio(prev => ({ ...prev, [consegnaId]: "Errore di connessione." }));
    } finally {
      setLoadingAi(prev => ({ ...prev, [consegnaId]: false }));
    }
  };

  if (!prova) return <div className="p-8 text-center text-gray-500">Caricamento...</div>;

  const iaGlobalmenteDisabilitata = providerDisabilitati.groq && providerDisabilitati.gemini;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        
        <div className="mb-8">
          <Link href={`/dashboard-docente/corsi/${prova.corso.id}`} className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            ← Torna al corso
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{prova.titolo}</h1>
          <p className="text-gray-500">Gestione consegne per il corso di {prova.corso.nome}</p>
        </div>

        {iaGlobalmenteDisabilitata && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-sm flex items-center gap-3">
            <span>⚠️</span> Le chiavi API per il supporto IA non sono configurate sul server. È comunque possibile valutare manualmente le consegne.
          </div>
        )}

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
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {consegna.studente.nome} {consegna.studente.cognome}
                        </h3>
                        {inRitardo && (
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-medium shrink-0">
                            Consegnato in ritardo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-4">
                        Data invio: {dataConsegna.toLocaleString("it-IT")}
                      </p>
                      
                      {consegna.testo && (
                        <div className="mb-4">
                           <span className="text-xs font-semibold text-gray-500 uppercase">Note dello studente</span>
                           <div className="bg-white p-3 mt-1 border border-gray-200 rounded-md text-sm text-gray-700 whitespace-pre-wrap break-words">
                             {consegna.testo}
                           </div>
                        </div>
                      )}

                      {consegna.testoFile && (
                        <div className="mb-4 w-full">
                          <span className="text-xs font-semibold text-gray-500 uppercase flex items-center flex-wrap gap-2 mb-1">
                            File Allegato: <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded normal-case font-mono break-all">{consegna.nomeFile}</span>
                          </span>
                          <div className="relative w-full">
                            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96 text-sm font-mono shadow-inner border border-gray-800 w-full max-w-full whitespace-pre">
                              <code>{consegna.testoFile}</code>
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="w-full md:w-80 shrink-0 bg-white p-4 border border-blue-100 rounded-md shadow-sm">
                      {consegna.valutazione ? (
                        <div className="flex flex-col h-full justify-between">
                          <div>
                            <p className="text-sm font-semibold text-green-700 mb-2">✅ Valutazione completata</p>
                            <p className="text-3xl font-bold text-gray-900 mb-2">
                              {consegna.valutazione.voto === 31 ? "30L" : consegna.valutazione.voto}
                              <span className="text-lg text-gray-400 font-normal">/30</span>
                            </p>
                            <p className="text-sm text-gray-600 mb-4 break-words">
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

                          {!iaGlobalmenteDisabilitata && (
                            <div className="bg-purple-50/50 p-2.5 rounded-md border border-purple-100">
                              <label className="block text-xs font-medium text-purple-900 mb-1">
                                💡 Indicazioni per l'IA (opzionale)
                              </label>
                              <textarea
                                rows={2}
                                placeholder="Es: Togli 2 punti perché in ritardo..."
                                value={istruzioniIa[consegna.id] || ""}
                                onChange={(e) => setIstruzioniIa(prev => ({ ...prev, [consegna.id]: e.target.value }))}
                                className="w-full px-2.5 py-1.5 border border-purple-200 rounded text-xs text-gray-800 bg-white outline-none focus:ring-1 focus:ring-purple-400"
                              />
                              
                              <div className="flex gap-2 mt-2">
                                <button 
                                  onClick={() => handleGeneraIA(consegna.id, "groq")}
                                  disabled={loadingAi[consegna.id] || providerDisabilitati.groq}
                                  className="flex-1 bg-purple-100 text-purple-700 border border-purple-300 py-1.5 rounded text-xs font-semibold hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {loadingAi[consegna.id] ? "..." : "🤖 Groq"}
                                </button>
                                <button 
                                  onClick={() => handleGeneraIA(consegna.id, "gemini")}
                                  disabled={loadingAi[consegna.id] || providerDisabilitati.gemini}
                                  className="flex-1 bg-blue-100 text-blue-700 border border-blue-300 py-1.5 rounded text-xs font-semibold hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {loadingAi[consegna.id] ? "..." : "✨ Gemini"}
                                </button>
                              </div>
                            </div>
                          )}

                          <hr className="border-gray-100" />

                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Voto (0 - 30, usa 31 per Lode)</label>
                            <input 
                              type="number" 
                              step="0.5" min="0" max="31"
                              value={voti[consegna.id] || ""}
                              onChange={(e) => setVoti(prev => ({ ...prev, [consegna.id]: e.target.value }))}
                              className="w-full px-3 py-1.5 border rounded-md text-sm text-gray-900 bg-white outline-none focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Feedback per lo studente</label>
                            <textarea 
                              rows={4}
                              value={feedbacks[consegna.id] || ""}
                              onChange={(e) => setFeedbacks(prev => ({ ...prev, [consegna.id]: e.target.value }))}
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
                            <p className={`text-xs text-center font-semibold mt-1 ${messaggio[consegna.id].includes('Errore') || messaggio[consegna.id].includes('non è configurata') ? 'text-red-600' : 'text-green-600'}`}>
                              {messaggio[consegna.id]}
                            </p>
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