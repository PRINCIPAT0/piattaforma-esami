"use server";

import { prisma } from "@/lib/prisma";
import { ottieniUtenteAutenticato, distruggiSessione } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function ottieniTuttiGliUtenti() {
  try {
    const admin = await ottieniUtenteAutenticato();
    if (!admin || admin.ruolo !== "SUPERADMIN") return [];

    return await prisma.user.findMany({
      orderBy: { id: 'desc' },
      select: {
        id: true,
        nome: true,
        cognome: true,
        email: true,
        matricola: true,
        ruolo: true,
        attivo: true,
      }
    });
  } catch (error) {
    console.error("Errore recupero utenti:", error);
    return [];
  }
}

export async function cambiaStatoUtente(utenteId: number, nuovoStato: boolean) {
  try {
    const admin = await ottieniUtenteAutenticato();
    if (!admin || admin.ruolo !== "SUPERADMIN") {
      return { success: false, error: "Accesso negato." };
    }

    if (admin.id === utenteId) {
      return { success: false, error: "Non puoi disabilitare il tuo stesso account!" };
    }

    await prisma.user.update({
      where: { id: utenteId },
      data: { attivo: nuovoStato }
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: "Errore durante l'aggiornamento dello stato." };
  }
}

export async function creaAccountPersonale(dati: { nome: string; cognome: string; email: string; passwordRaw: string; ruolo: string }) {
  try {
    const admin = await ottieniUtenteAutenticato();
    if (!admin || admin.ruolo !== "SUPERADMIN") {
      return { success: false, error: "Accesso negato." };
    }

    const emailInMinuscolo = dati.email.toLowerCase();
    
    if (dati.ruolo === "DOCENTE" && !emailInMinuscolo.endsWith("@docenti.uni.it")) {
      return { success: false, error: "L'email del docente deve terminare con @docenti.uni.it" };
    }
    
    if (dati.ruolo === "SUPERADMIN" && !emailInMinuscolo.endsWith("@admin.uni.it")) {
      return { success: false, error: "L'email dell'amministratore deve terminare con @admin.uni.it" };
    }

    const regexPassword = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,}$/;
    if (!regexPassword.test(dati.passwordRaw)) {
      return { 
        success: false, 
        error: "La password deve avere almeno 8 caratteri, una maiuscola, un numero e un carattere speciale." 
      };
    }

    const passwordCriptata = await bcrypt.hash(dati.passwordRaw, 10);

    const ultimoUtente = await prisma.user.findFirst({
      orderBy: { id: 'desc' }
    });
    const prossimoId = ultimoUtente !== null ? ultimoUtente.id + 1 : 1;
    
    const baseMatricola = dati.ruolo === "DOCENTE" ? 900000 : 800000;
    const matricolaGenerata = (baseMatricola + prossimoId).toString(); 

    await prisma.user.create({
      data: {
        nome: dati.nome,
        cognome: dati.cognome,
        email: emailInMinuscolo,
        password: passwordCriptata,
        matricola: matricolaGenerata,
        ruolo: dati.ruolo as any,
        attivo: true
      }
    });

    return { success: true };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: "Email già presente a sistema." };
    }
    return { success: false, error: "Errore durante la creazione dell'account." };
  }
}

export async function ottieniCorsiSegreteria() {
  try {
    const admin = await ottieniUtenteAutenticato();
    if (!admin || admin.ruolo !== "SUPERADMIN") return [];

    return await prisma.corso.findMany({
      include: {
        docente: {
          select: { id: true, nome: true, cognome: true }
        },
        _count: {
          select: { iscrizioni: true, prove: true }
        }
      },
      orderBy: { id: 'desc' }
    });
  } catch (error) {
    console.error("Errore recupero corsi:", error);
    return [];
  }
}

export async function ottieniDocentiPerAssegnazione() {
  try {
    const admin = await ottieniUtenteAutenticato();
    if (!admin || admin.ruolo !== "SUPERADMIN") return [];

    return await prisma.user.findMany({
      where: { ruolo: "DOCENTE", attivo: true },
      select: { id: true, nome: true, cognome: true },
      orderBy: { cognome: 'asc' }
    });
  } catch (error) {
    return [];
  }
}

export async function riassegnaCorso(corsoId: number, nuovoDocenteId: number) {
  try {
    const admin = await ottieniUtenteAutenticato();
    if (!admin || admin.ruolo !== "SUPERADMIN") {
      return { success: false, error: "Accesso negato." };
    }

    await prisma.corso.update({
      where: { id: corsoId },
      data: { docenteId: nuovoDocenteId }
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: "Errore durante la riassegnazione del corso." };
  }
}

export async function eseguiLogoutAdmin() {
  await distruggiSessione();
  return { success: true };
}