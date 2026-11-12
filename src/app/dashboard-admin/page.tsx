"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ottieniTuttiGliUtenti, 
  cambiaStatoUtente, 
  creaAccountPersonale, 
  eseguiLogoutAdmin,
  ottieniCorsiSegreteria,
  ottieniDocentiPerAssegnazione,
  riassegnaCorso
} from "./actions";

export default function DashboardAdmin() {
  const router = useRouter();
  const [utenti, setUtenti] = useState<any[]>([]);
  const [corsi, setCorsi] = useState<any[]>([]);
  const [listaDocenti, setListaDocenti] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [mostraForm, setMostraForm] = useState(false);
  const [formData, setFormData] = useState({ nome: "", cognome: "", email: "", passwordRaw: "", ruolo: "DOCENTE"});
  const [messaggioForm, setMessaggioForm] = useState("");

  const [corsoInModifica, setCorsoInModifica] = useState<number | null>(null);
  const [nuovoDocenteId, setNuovoDocenteId] = useState<string>("");

  const caricaDati = async () => {
    setLoading(true);
    const [utentiDati, corsiDati, docentiDati] = await Promise.all([
      ottieniTuttiGliUtenti(),
      ottieniCorsiSegreteria(),
      ottieniDocentiPerAssegnazione()
    ]);
    setUtenti(utentiDati);
    setCorsi(corsiDati);
    setListaDocenti(docentiDati);
    setLoading(false);
  };

  useEffect(() => {
    caricaDati();
  }, []);

  const handleLogout = async () => {
    await eseguiLogoutAdmin();
    router.push("/");
  };

  const handleCambiaStato = async (id: number, statoAttuale: boolean) => {
    const nuovoStato = !statoAttuale;
    const azione = nuovoStato ? "abilitare" : "disabilitare";
    if (confirm(`Sei sicuro di voler ${azione} questo utente?`)) {
      const risultato = await cambiaStatoUtente(id, nuovoStato);
      if (risultato.success) {
        caricaDati();
      } else {
        alert(risultato.error);
      }
    }
  };

  const handleCreaPersonale = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessaggioForm("Creazione in corso...");
    const risultato = await creaAccountPersonale(formData);
    if (risultato.success) {
      setMessaggioForm("");
      setMostraForm(false);
      setFormData({ nome: "", cognome: "", email: "", passwordRaw: "", ruolo: "DOCENTE" });
      caricaDati();
    } else {
      setMessaggioForm(risultato.error || "Errore durante la creazione.");
    }
  };

  const handleSalvaAssegnazione = async (corsoId: number) => {
    if (!nuovoDocenteId) return;
    const risultato = await riassegnaCorso(corsoId, parseInt(nuovoDocenteId));
    if (risultato.success) {
      setCorsoInModifica(null);
      setNuovoDocenteId("");
      caricaDati();
    } else {
      alert(risultato.error);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Caricamento pannello segreteria...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Segreteria</h1>
            <p className="text-gray-500">Pannello di amministrazione globale</p>
          </div>
          <button onClick={handleLogout} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors">
            Esci (Logout)
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Gestione Personale Ateneo</h2>
            <button onClick={() => setMostraForm(!mostraForm)} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
              {mostraForm ? "Annulla" : "+ Nuovo Utente Personale"}
            </button>
          </div>

          {mostraForm && (
            <form onSubmit={handleCreaPersonale} className="mt-4 border-t border-gray-100 pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div className="md:col-span-3 border-b pb-4 mb-2">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Tipo di account da creare:</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="ruolo" value="DOCENTE" checked={formData.ruolo === "DOCENTE"} onChange={(e) => setFormData({...formData, ruolo: e.target.value, email: ""})} className="text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-gray-700">Docente</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="ruolo" value="SUPERADMIN" checked={formData.ruolo === "SUPERADMIN"} onChange={(e) => setFormData({...formData, ruolo: e.target.value, email: ""})} className="text-purple-600 focus:ring-purple-500" />
                      <span className="text-sm font-medium text-gray-700">Amministratore (Segreteria)</span>
                    </label>
                  </div>
                </div>

                <div><label className="block text-xs font-medium text-gray-700">Nome</label><input type="text" required value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900" /></div>
                <div><label className="block text-xs font-medium text-gray-700">Cognome</label><input type="text" required value={formData.cognome} onChange={(e) => setFormData({...formData, cognome: e.target.value})} className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900" /></div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Email istituzionale ({formData.ruolo === "DOCENTE" ? "@docenti.uni.it" : "@admin.uni.it"})
                  </label>
                  <input 
                    type="email" 
                    required 
                    pattern={formData.ruolo === "DOCENTE" ? ".*@docenti\\.uni\\.it$" : ".*@admin\\.uni\\.it$"} 
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900" 
                  />
                </div>
                
                <div><label className="block text-xs font-medium text-gray-700">Password</label><input type="text" required value={formData.passwordRaw} onChange={(e) => setFormData({...formData, passwordRaw: e.target.value})} className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900" /></div>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-green-700">
                  Crea Account {formData.ruolo === "DOCENTE" ? "Docente" : "Admin"}
                </button>
                {messaggioForm && <span className="text-sm font-medium text-red-600">{messaggioForm}</span>}
              </div>
            </form>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800">Corsi, Iscrizioni e Registri</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Nome Corso</th>
                  <th className="px-6 py-4">Docente Assegnato</th>
                  <th className="px-6 py-4 text-center">Studenti Iscritti</th>
                  <th className="px-6 py-4 text-center">Prove a Registro</th>
                  <th className="px-6 py-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {corsi.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Nessun corso presente a sistema.</td></tr>
                ) : (
                  corsi.map((corso) => (
                    <tr key={corso.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold text-gray-900">{corso.nome}</td>
                      <td className="px-6 py-4">
                        {corsoInModifica === corso.id ? (
                          <div className="flex items-center gap-2">
                            <select 
                              className="border border-gray-300 rounded-md text-sm py-1 px-2 outline-none"
                              value={nuovoDocenteId}
                              onChange={(e) => setNuovoDocenteId(e.target.value)}
                            >
                              <option value="" disabled>Seleziona un docente...</option>
                              {listaDocenti.map(doc => (
                                <option key={doc.id} value={doc.id}>{doc.cognome} {doc.nome}</option>
                              ))}
                            </select>
                            <button onClick={() => handleSalvaAssegnazione(corso.id)} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold hover:bg-green-200">Salva</button>
                            <button onClick={() => setCorsoInModifica(null)} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-200">Annulla</button>
                          </div>
                        ) : (
                          <span>{corso.docente.cognome} {corso.docente.nome}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-mono bg-blue-50/30">{corso._count.iscrizioni}</td>
                      <td className="px-6 py-4 text-center font-mono bg-purple-50/30">{corso._count.prove}</td>
                      <td className="px-6 py-4 text-right">
                        {corsoInModifica !== corso.id && (
                          <button
                            onClick={() => { setCorsoInModifica(corso.id); setNuovoDocenteId(corso.docenteId.toString()); }}
                            className="px-3 py-1.5 rounded-md text-xs font-medium border text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100"
                          >
                            Riassegna Docente
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800">Elenco Utenti a Sistema</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Matricola / ID</th>
                  <th className="px-6 py-4">Utente</th>
                  <th className="px-6 py-4">Ruolo</th>
                  <th className="px-6 py-4">Stato</th>
                  <th className="px-6 py-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {utenti.map((utente) => (
                  <tr key={utente.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-gray-500">{utente.matricola || `#${utente.id}`}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{utente.cognome} {utente.nome}</p>
                      <p className="text-xs text-gray-500">{utente.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        utente.ruolo === 'SUPERADMIN' ? 'bg-purple-100 text-purple-800' :
                        utente.ruolo === 'DOCENTE' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {utente.ruolo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {utente.attivo ? (
                        <span className="text-green-600 font-semibold flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div> Attivo
                        </span>
                      ) : (
                        <span className="text-red-600 font-semibold flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div> Disabilitato
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {utente.ruolo !== "SUPERADMIN" && (
                        <button
                          onClick={() => handleCambiaStato(utente.id, utente.attivo)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium border ${
                            utente.attivo 
                              ? 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100' 
                              : 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100'
                          }`}
                        >
                          {utente.attivo ? "Disabilita Accesso" : "Riabilita Accesso"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}