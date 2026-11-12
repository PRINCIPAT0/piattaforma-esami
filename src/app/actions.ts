"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { creaSessione } from "@/lib/auth"; 

export async function verificaLogin(dati: { email: string, password: string }) {
  try {
    const emailInMinuscolo = dati.email.toLowerCase();

    const utente = await prisma.user.findUnique({
      where: { email: emailInMinuscolo }
    });

    if (!utente) {
      return { success: false, error: "Email o password errati." };
    }

    if (!utente.attivo) {
      return { 
        success: false, 
        error: "Il tuo account è stato disabilitato. Contatta la segreteria per assistenza." 
      };
    }

    const passwordValida = await bcrypt.compare(dati.password, utente.password);
    
    if (!passwordValida) {
      return { success: false, error: "Email o password errati." };
    }

    const isMailDocente = emailInMinuscolo.endsWith("@docenti.uni.it");
    if (isMailDocente && utente.ruolo !== "DOCENTE" && utente.ruolo !== "SUPERADMIN") {
      return { 
        success: false, 
        error: "Accesso negato! Il tuo account è in attesa di approvazione da parte della Segreteria." 
      };
    }

    const isMailAdmin = emailInMinuscolo.endsWith("@admin.uni.it");
    if (isMailAdmin && utente.ruolo !== "SUPERADMIN") {
      return { 
        success: false, 
        error: "Accesso negato! Account amministrativo in attesa di configurazione da database." 
      };
    }

    await creaSessione(utente.id);

    return { success: true, ruolo: utente.ruolo };

  } catch (error) {
    console.error("Errore di login:", error);
    return { success: false, error: "Errore del server durante il login." };
  }
}