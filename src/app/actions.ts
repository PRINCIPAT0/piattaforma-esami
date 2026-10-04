"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export async function verificaLogin(dati: { email: string, password: string }) {
  try {
    const emailInMinuscolo = dati.email.toLowerCase();

    const utente = await prisma.user.findUnique({
      where: { email: emailInMinuscolo }
    });

    if (!utente) {
      return { success: false, error: "Email o password errati." };
    }

    const passwordValida = await bcrypt.compare(dati.password, utente.password);
    
    if (!passwordValida) {
      return { success: false, error: "Email o password errati." };
    }

    const isMailDocente = emailInMinuscolo.endsWith("@docenti.uni.it");
    if (isMailDocente && utente.ruolo !== "DOCENTE") {
      return { 
        success: false, 
        error: "Accesso negato! Il tuo account docente è in attesa di approvazione da parte della Segreteria. Riprova più tardi." 
      };
    }

    const cookieStore = await cookies();
    cookieStore.set("utente_id", utente.id.toString());
    cookieStore.set("utente_ruolo", utente.ruolo);

    return { success: true, ruolo: utente.ruolo };

  } catch (error) {
    console.error("Errore di login:", error);
    return { success: false, error: "Errore del server durante il login." };
  }
}