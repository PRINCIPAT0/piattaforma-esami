"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ottieniDettaglioCorsoStudente, inviaConsegna, eliminaConsegna } from "../../actions";

export default function DettaglioCorsoStudente() {
  const params = useParams();
  const corsoId = parseInt(params.id as string);

  const [corso, setCorso] = useState<any>(null);
  
  const [testoConsegna, setTestoConsegna] = useState<{ [key: number]: string }>({});
  const [messaggio, setMessaggio] = useState<{ [key: number]: string }>({});
  
  const [fileConsegna, setFileConsegna] = useState<{ [key: number]: File | null }>({});
  const [erroreFile, setErroreFile] = useState<{ [key: number]: string }>({});

  const caricaCorso = async () => {
    const dati = await ottieniDettaglioCorsoStudente(corsoId);
    setCorso(dati);
  };

  useEffect(() => {
    if (corsoId) caricaCorso();
  }, [corsoId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, provaId: number) => {
    setErroreFile({ ...erroreFile, [provaId]: "" });
    const fileSelezionato = e.target.files?.[0];
    
    if (!fileSelezionato) {
      setFileConsegna({ ...fileConsegna, [provaId]: null });
      return;
    }

    const limiteMB = 1;
    if (fileSelezionato.size > limiteMB * 1024 * 1024) {
      setErroreFile({ ...erroreFile, [provaId]: `Il file è troppo grande. Massimo ${limiteMB}MB.` });
      e.target.value = ''; 
      return;
    }

    const estensioniAmmesse = ['.py', '.js', '.html', '.txt', '.cpp', '.java'];
    const nomeFileMinuscolo = fileSelezionato.name.toLowerCase();
    const estensioneValida = estensioniAmmesse.some(ext => nomeFileMinuscolo.endsWith(ext));

    if (!estensioneValida) {
      setErroreFile({ ...erroreFile, [provaId]: "Formato non supportato. Usa .py, .js, .html, ecc." });
      e.target.value = '';
      return;
    }

    setFileConsegna({ ...fileConsegna, [provaId]: fileSelezionato });
  };

  const handleConsegna = async (provaId: number) => {
    const testo = testoConsegna[provaId] || "";
    const file = fileConsegna[provaId];

    if (!testo && !file) {
      setMessaggio({ ...messaggio, [provaId]: "Inserisci un testo o carica un file sorgente." });
      return;
    }

    setMessaggio({ ...messaggio, [provaId]: "Lettura file e invio in corso..." });

    let testoFile = undefined;
    let nomeFile = undefined;

    if (file) {
      testoFile = await file.text();
      nomeFile = file.name;
    }

    const risultato = await inviaConsegna({ provaId, testo, nomeFile, testoFile });
    
    if (risultato.success) {
      setMessaggio({ ...messaggio, [provaId]: "" }); 
      setTestoConsegna({ ...testoConsegna, [provaId]: "" }); 
      setFileConsegna({ ...fileConsegna, [provaId]: null }); 
      caricaCorso();
    } else {
      setMessaggio({ ...messaggio, [provaId]: risultato.error || "Errore" });
    }
  };

  const handleElimina = async (consegnaId: number) => {
    if (confirm("Sei sicuro di voler ritirare questa consegna? Potrai effettuarne una nuova.")) {
      await eliminaConsegna(consegnaId);
      caricaCorso(); 
    }
  };

  if (!corso) return <div className="p-8 text-center text-gray-500">Caricamento corso...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        
        <div className="mb-8">
          <Link href="/dashboard-studente" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            &larr; Torna ai corsi
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{corso.nome}</h1>
          <p className="text-gray-600">Docente: {corso.docente.nome} {corso.docente.cognome}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-200 mb-8 flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-1 w-full">
            <h2 className="text-lg font-bold text-blue-900 mb-2">Il tuo rendimento</h2>
            <p className="text-sm text-gray-600 mb-4">
              Hai completato il <span className="font-bold text-gray-900">{corso.statistiche.pesoValutato}%</span> del corso.
            </p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-center flex-1">
              <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Voto Attuale</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">
                {corso.statistiche.votoAttuale >= 31 ? "30L" : corso.statistiche.votoAttuale}
                <span className="text-lg text-blue-600">/30</span>
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center flex-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Max Raggiungibile</p>
              <p className="text-3xl font-bold text-gray-700 mt-1">
                {corso.statistiche.votoMassimo >= 31 ? "30L" : corso.statistiche.votoMassimo}
                <span className="text-lg text-gray-400">/30</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Prove da completare</h2>
          
          {corso.prove.length === 0 ? (
            <p className="text-gray-500 text-sm">Nessuna prova configurata per questo corso.</p>
          ) : (
            <div className="space-y-6">
              {corso.prove.map((prova: any) => {
                const consegnaEffettuata = prova.consegne.length > 0 ? prova.consegne[0] : null;
                const dataScadenza = new Date(prova.scadenza);
                const isScaduta = new Date() > dataScadenza; 
                const inRitardo = consegnaEffettuata ? new Date(consegnaEffettuata.dataConsegna) > dataScadenza : false;

                return (
                  <div key={prova.id} className="p-5 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{prova.titolo} <span className="text-xs text-gray-500 uppercase">({prova.tipo.replace("_", " ")})</span></h3>
                        <p className="text-sm text-gray-600 mt-1">{prova.descrizione}</p>
                      </div>
                      <div className="text-right">
                        <span className="block text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded">Peso: {prova.peso}%</span>
                        <span className={`block text-xs mt-1 ${isScaduta && !consegnaEffettuata ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                          Scadenza: {dataScadenza.toLocaleString("it-IT", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {consegnaEffettuata ? (
                      <div className={`mt-4 p-4 border rounded-md ${inRitardo ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-200'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className={`text-sm font-medium ${inRitardo ? 'text-yellow-800' : 'text-green-800'}`}>
                              {inRitardo ? '⚠️ Consegnato in ritardo' : '✅ Hai già consegnato questa prova'}
                            </p>
                            <p className={`text-xs mt-1 ${inRitardo ? 'text-yellow-700' : 'text-green-700'}`}>
                              Data invio: {new Date(consegnaEffettuata.dataConsegna).toLocaleString("it-IT")}
                            </p>
                            {consegnaEffettuata.nomeFile && (
                              <p className="text-xs mt-1 text-gray-600 font-medium">
                                File allegato: {consegnaEffettuata.nomeFile}
                              </p>
                            )}
                          </div>
                          
                          {!consegnaEffettuata.valutazione && (
                            <button 
                              onClick={() => handleElimina(consegnaEffettuata.id)}
                              className="text-sm text-red-600 font-medium hover:underline bg-white px-3 py-1 rounded-md border border-red-200"
                            >
                              Ritira Consegna
                            </button>
                          )}
                        </div>
                        
                        {consegnaEffettuata.valutazione ? (
                          <div className={`mt-3 p-3 bg-white border rounded ${inRitardo ? 'border-yellow-300' : 'border-green-300'}`}>
                            <p className="text-sm font-bold text-gray-900">
                              Voto: {consegnaEffettuata.valutazione.voto === 31 ? "30L" : consegnaEffettuata.valutazione.voto} / 30
                            </p>
                            {consegnaEffettuata.valutazione.feedbackDocente && (
                              <p className="text-sm text-gray-700 mt-1">Feedback Docente: {consegnaEffettuata.valutazione.feedbackDocente}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 mt-3 italic">In attesa di valutazione da parte del docente.</p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200">
                        {isScaduta && (
                          <p className="text-xs font-medium text-red-600 mb-3">
                            ⚠️ Attenzione: la scadenza è superata. La tua consegna verrà registrata in ritardo.
                          </p>
                        )}
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Note / Elaborato testuale</label>
                            <textarea 
                              rows={2}
                              placeholder="Inserisci qui il testo o eventuali note..."
                              value={testoConsegna[prova.id] || ""}
                              onChange={(e) => setTestoConsegna({ ...testoConsegna, [prova.id]: e.target.value })}
                              className={`text-gray-900 placeholder-gray-400 w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-blue-500 ${isScaduta ? 'border-red-300' : 'border-gray-300'}`}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Carica file sorgente (opzionale)</label>
                            <input 
                              type="file" 
                              onChange={(e) => handleFileChange(e, prova.id)}
                              accept=".py,.js,.html,.txt,.cpp,.java" 
                              className={`w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border rounded-md p-1 ${isScaduta ? 'border-red-300' : 'border-gray-300'}`}
                            />
                            {erroreFile[prova.id] && <p className="text-red-500 text-xs mt-1">{erroreFile[prova.id]}</p>}
                          </div>
                        </div>

                        <div className="mt-4 flex items-center">
                          <button 
                            onClick={() => handleConsegna(prova.id)}
                            className={`text-white px-4 py-2 rounded-md text-sm font-medium transition-colors ${isScaduta ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                          >
                            Invia Consegna
                          </button>
                          {messaggio[prova.id] && <span className="ml-3 text-sm font-medium text-blue-600">{messaggio[prova.id]}</span>}
                        </div>
                      </div>
                    )}
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