"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ottieniRegistroClasse } from "../../../actions";

export default function RegistroClasse() {
  const params = useParams();
  const corsoId = parseInt(params.id as string);

  const [dati, setDati] = useState<any>(null);

  useEffect(() => {
    async function carica() {
      const risultato = await ottieniRegistroClasse(corsoId);
      setDati(risultato);
    }
    if (corsoId) carica();
  }, [corsoId]);

  if (!dati) return <div className="p-8 text-center text-gray-500">Caricamento registro...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="mb-8">
          <Link href={`/dashboard-docente/corsi/${dati.corsoId}`} className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            &larr; Torna alle prove
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Registro: {dati.nome}</h1>
          <p className="text-gray-500">Monitoraggio andamento studenti (A.A. {dati.annoAccad})</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-100 text-gray-600 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Studente</th>
                  {/* NUOVA COLONNA INTESTAZIONE */}
                  <th className="px-6 py-4">Matricola</th>
                  <th className="px-6 py-4">% Valutata</th>
                  <th className="px-6 py-4">Voto Attuale</th>
                  <th className="px-6 py-4">Max Possibile</th>
                  <th className="px-6 py-4 text-center">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dati.studenti.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Nessuno studente iscritto a questo corso.
                    </td>
                  </tr>
                ) : (
                  dati.studenti.map((stud: any) => (
                    <tr key={stud.idStudente} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {stud.cognome} {stud.nome}
                      </td>
                      {/* -------------------- */}
                      <td className="px-6 py-4 text-gray-600 font-mono text-sm">
                        {stud.matricola || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${stud.statistiche.pesoValutato}%` }}></div>
                          </div>
                          <span className="text-xs text-gray-500">{stud.statistiche.pesoValutato}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-blue-700 text-base">
                        {stud.statistiche.votoAttuale}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {stud.statistiche.votoMassimo}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {stud.statistiche.superato ? (
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                            Superato
                          </span>
                        ) : stud.statistiche.bocciato ? (
                          <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                            Bocciato
                          </span>
                        ) : (
                          <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">
                            In corso
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}