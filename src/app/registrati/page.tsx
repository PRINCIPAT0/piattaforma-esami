"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registraUtente } from "./actions";

export default function Registrazione() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    nome: "",
    cognome: "",
    email: "",
    password: "",
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const risultato = await registraUtente(formData);

    if (risultato.success) {
      alert("Registrazione completata con successo!");
      router.push("/");
    } else {
      alert(risultato.error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Registrazione</h1>
          <p className="text-gray-500 mt-2">Crea il tuo account universitario</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome</label>
              <input type="text" name="nome" required onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cognome</label>
              <input type="text" name="cognome" required onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email istituzionale</label>
            <input 
              type="email" 
              name="email" 
              required 
              onChange={handleChange} 
              placeholder="nome.cognome@...uni.it"
              pattern="^[a-zA-Z0-9_'-]+\.[a-zA-Z0-9_'-]+@(studenti|docenti)\.uni\.it$"
              title="Inserisci nome.cognome@studenti.uni.it oppure @docenti.uni.it"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 placeholder-gray-200" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input 
              type="password" 
              name="password" 
              required 
              onChange={handleChange} 
              placeholder="••••••••"
              pattern="^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,}$"
              title="Deve contenere almeno 8 caratteri, una lettera maiuscola, un numero e un carattere speciale (@$!%*?&._-)"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 placeholder-gray-200" 
            />
            
          </div>

          <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors mt-6">
            Registrati
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Hai già un account?{" "}
            <Link href="/" className="font-medium text-blue-600 hover:text-blue-500">
              Torna al Login
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}