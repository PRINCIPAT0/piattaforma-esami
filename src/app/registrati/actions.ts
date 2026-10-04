"use server";

import { prisma } from "../../lib/prisma";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export async function registraUtente(dati: any) {

  const regexEmail = /^[a-zA-Z0-9_'-]+\.[a-zA-Z0-9_'-]+@(studenti|docenti)\.uni\.it$/i;
  if (!regexEmail.test(dati.email)) {
    return { success: false, error: "Devi usare nome.cognome@studenti.uni.it oppure nome.cognome@docenti.uni.it" };
  }

  const nomePulito = dati.nome.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cognomePulito = dati.cognome.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const prefissoEmail = dati.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

  if (!prefissoEmail.includes(nomePulito) || !prefissoEmail.includes(cognomePulito)) {
    return { 
      success: false, 
      error: "Attenzione: l'email istituzionale non corrisponde al nome e cognome inseriti." 
    };
  }

  const regexPassword = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,}$/;
  if (!regexPassword.test(dati.password)) {
    return { 
      success: false, 
      error: "La password deve avere almeno 8 caratteri, una lettera maiuscola, un numero e un carattere speciale." 
    };
  }

  try {
    
    const ultimoUtente = await prisma.user.findFirst({
      orderBy: { id: 'desc' }
    });
    
    let prossimoId;

    if (ultimoUtente !== null) {
      prossimoId = ultimoUtente.id + 1;
    } else {
      prossimoId = 1;
    }

    const matricolaGenerata = (100000 + prossimoId).toString();

    const passwordCriptata = await bcrypt.hash(dati.password, 10);

    await prisma.user.create({
      data: {
        nome: dati.nome,
        cognome: dati.cognome,
        matricola: matricolaGenerata, 
        email: dati.email.toLowerCase(),
        password: passwordCriptata,
        ruolo: "STUDENTE" 
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error("Errore database:", error);
    return { success: false, error: "Impossibile registrare l'utente. L'email è già in uso?" };
  }
}
