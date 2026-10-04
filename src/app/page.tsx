"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { verificaLogin } from "./actions";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrore("");
    
    const risultato = await verificaLogin({ email, password });

    if (risultato.success) {

      if (risultato.ruolo === "STUDENTE") {
        router.push("/dashboard-studente");
      } else if (risultato.ruolo === "DOCENTE") {
        router.push("/dashboard-docente");
      }
    } else {
      setErrore(risultato.error || "Si è verificato un errore durante l'accesso.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Piattaforma Esami</h1>
          <p className="text-gray-500 mt-2">Accedi al tuo account universitario</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {}
          {errore && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm text-center">
              {errore}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 placeholder-gray-200"
              placeholder="mario.rossi@studenti.uni.it"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 placeholder-gray-200"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Accedi
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Non hai un account?{" "}
            <Link href="/registrati" className="font-medium text-blue-600 hover:text-blue-500">
              Registrati qui
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}