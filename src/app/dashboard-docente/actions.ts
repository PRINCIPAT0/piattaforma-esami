"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function creaCorso(dati: { nome: string; annoAccad: string }) {
  try {
    const cookieStore = await cookies();
    const utenteId = cookieStore.get("utente_id")?.value;

    if (!utenteId) return { success: false, error: "Utente non trovato." };

    await prisma.corso.create({
      data: {
        nome: dati.nome,
        annoAccad: dati.annoAccad,
        docenteId: parseInt(utenteId),
      }
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Impossibile creare il corso." };
  }
}

export async function ottieniCorsiDocente() {
  try {
    const cookieStore = await cookies();
    const utenteId = cookieStore.get("utente_id")?.value;

    if (!utenteId) return [];

    return await prisma.corso.findMany({
      where: { docenteId: parseInt(utenteId) },
      orderBy: { id: 'desc' }
    });
  } catch (error) {
    return [];
  }
}

export async function ottieniDettaglioCorso(corsoId: number) {
  try {
    return await prisma.corso.findUnique({
      where: { id: corsoId },
      include: {
        prove: {
          orderBy: { scadenza: 'asc' }
        }
      }
    });
  } catch (error) {
    return null;
  }
}

export async function creaProva(dati: any) {
  try {
    const proveEsistenti = await prisma.prova.findMany({
      where: { corsoId: dati.corsoId },
      select: { peso: true }
    });
    
    const pesoTotaleAttuale = proveEsistenti.reduce((somma, prova) => somma + prova.peso, 0);
    const nuovoPeso = parseFloat(dati.peso);

    if (pesoTotaleAttuale + nuovoPeso > 100) {
      return { 
        success: false, 
        error: `Peso eccessivo! Hai a disposizione solo il ${100 - pesoTotaleAttuale}% residuo.` 
      };
    }

    await prisma.prova.create({
      data: {
        titolo: dati.titolo,
        descrizione: dati.descrizione,
        tipo: dati.tipo,
        scadenza: new Date(dati.scadenza),
        peso: nuovoPeso,
        corsoId: dati.corsoId,
      }
    });
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Errore durante la creazione della prova." };
  }
}

export async function eliminaCorso(corsoId: number) {
  try {
    await prisma.corso.delete({
      where: { id: corsoId }
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Errore durante l'eliminazione del corso." };
  }
}

export async function eliminaProva(provaId: number) {
  try {
    await prisma.prova.delete({
      where: { id: provaId }
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Errore durante l'eliminazione della prova." };
  }
}

export async function ottieniConsegneProva(provaId: number) {
  try {
    return await prisma.prova.findUnique({
      where: { id: provaId },
      include: {
        corso: { select: { nome: true, id: true } },
        consegne: {
          include: {
            studente: { select: { nome: true, cognome: true } },
            valutazione: true
          },
          orderBy: { dataConsegna: 'desc' }
        }
      }
    });
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function valutaConsegna(dati: { consegnaId: number; voto: number; feedback: string }) {
  try {
    if (dati.voto < 0 || dati.voto > 100) {
      return { success: false, error: "Il voto deve essere compreso tra 0 e 100." };
    }

    await prisma.valutazione.create({
      data: {
        consegnaId: dati.consegnaId,
        voto: dati.voto,
        feedbackDocente: dati.feedback
      }
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Errore durante il salvataggio del voto." };
  }
}

export async function eliminaValutazione(valutazioneId: number) {
  try {
    await prisma.valutazione.delete({
      where: { id: valutazioneId }
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Errore durante l'eliminazione della valutazione." };
  }
}

export async function ottieniRegistroClasse(corsoId: number) {
  try {
    const corso = await prisma.corso.findUnique({
      where: { id: corsoId },
      include: {
        iscrizioni: {
          include: {
            studente: {
              include: {
                consegne: {
                  where: { prova: { corsoId: corsoId } },
                  include: { valutazione: true, prova: true }
                }
              }
            }
          }
        }
      }
    });

    if (!corso) return null;

    const registro = corso.iscrizioni.map((iscrizione) => {
      let votoAttuale = 0;
      let pesoValutato = 0;

      iscrizione.studente.consegne.forEach((consegna) => {
        if (consegna.valutazione && consegna.prova) {
          votoAttuale += (consegna.valutazione.voto * consegna.prova.peso) / 100;
          pesoValutato += consegna.prova.peso;
        }
      });

      const pesoRimanente = 100 - pesoValutato;
      const votoMassimoPossibile = votoAttuale + pesoRimanente;

      return {
        idStudente: iscrizione.studente.id,
        nome: iscrizione.studente.nome,
        cognome: iscrizione.studente.cognome,
        matricola: iscrizione.studente.matricola,
        statistiche: {
          votoAttuale: parseFloat(votoAttuale.toFixed(1)),
          votoMassimo: parseFloat(votoMassimoPossibile.toFixed(1)),
          pesoValutato: parseFloat(pesoValutato.toFixed(1)),
          superato: votoAttuale >= 60 && pesoValutato === 100,
          bocciato: votoMassimoPossibile < 60 // Matematicamente impossibile arrivare a 60
        }
      };
    });

    return {
      corsoId: corso.id,
      nome: corso.nome,
      annoAccad: corso.annoAccad,
      studenti: registro
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function ottieniProfiloUtente() {
  try {
    const cookieStore = await cookies();
    const userIdCookie = cookieStore.get("utente_id");
    
    if (!userIdCookie) return null;

    return await prisma.user.findUnique({
      where: { id: parseInt(userIdCookie.value) },
      select: { nome: true, cognome: true, matricola: true, email: true }
    });
  } catch (error) {
    console.error("Errore recupero profilo:", error);
    return null;
  }
}

export async function eseguiLogout() {
  const cookieStore = await cookies();
  cookieStore.delete("utente_id");
  cookieStore.delete("utente_ruolo");
  return { success: true };
}