"use server";

import { prisma } from "@/lib/prisma";
import { ottieniUtenteAutenticato, distruggiSessione } from "@/lib/auth"; 
import { calcolaStatisticheStudente } from "@/lib/math";

export async function ottieniCorsiConIscrizione() {
  try {
    const utente = await ottieniUtenteAutenticato();
    if (!utente || utente.ruolo !== "STUDENTE") return [];

    const studenteId = utente.id;

    const corsi = await prisma.corso.findMany({
      include: {
        docente: { select: { nome: true, cognome: true } },
        iscrizioni: { where: { studenteId, attiva: true } }
      },
      orderBy: { id: 'desc' }
    });

    return corsi.map(corso => ({
      ...corso,
      iscritto: corso.iscrizioni.length > 0
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function iscrivitiCorso(corsoId: number) {
  try {
    const utente = await ottieniUtenteAutenticato();
    if (!utente || utente.ruolo !== "STUDENTE") return { success: false, error: "Non autorizzato" };

    const studenteId = utente.id;

    const iscrizioneEsistente = await prisma.iscrizione.findFirst({
      where: { studenteId: studenteId, corsoId: corsoId }
    });

    if (iscrizioneEsistente) {
      if (iscrizioneEsistente.attiva) {
        return { success: false, error: "Sei già iscritto a questo corso." };
      } else {
        await prisma.iscrizione.update({
          where: { studenteId_corsoId: { studenteId, corsoId } },
          data: { attiva: true }
        });
        return { success: true };
      }
    }

    await prisma.iscrizione.create({
      data: {
        studenteId: studenteId,
        corsoId: corsoId
      }
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Errore durante l'iscrizione." };
  }
}

export async function ottieniDettaglioCorsoStudente(corsoId: number) {
  try {
    const utente = await ottieniUtenteAutenticato();
    if (!utente || utente.ruolo !== "STUDENTE") return null;

    const studenteId = utente.id;

    const iscrizione = await prisma.iscrizione.findFirst({
      where: { studenteId, corsoId, attiva: true }
    });
    if (!iscrizione) return null;

    const corso = await prisma.corso.findUnique({
      where: { id: corsoId },
      include: {
        docente: { select: { nome: true, cognome: true } },
        prove: {
          orderBy: { scadenza: 'asc' },
          include: {
            consegne: {
              where: { studenteId },
              include: { valutazione: true }
            }
          }
        }
      }
    });

    if (!corso) return null;

    const consegneFormattate = corso.prove.map(prova => {
      const consegna = prova.consegne[0];
      return {
        provaId: prova.id,
        valutazione: consegna ? consegna.valutazione : null
      };
    });

    const stats = calcolaStatisticheStudente(corso.prove, consegneFormattate);

    return {
      ...corso,
      statistiche: {
        votoAttuale: stats.votoAttuale,
        votoFormattato: stats.votoFormattato,
        votoMassimo: stats.votoMassimoPossibile,
        pesoValutato: stats.pesoValutato,
        superato: stats.esameSuperato,
        bocciato: stats.bocciatoMatematicamente
      }
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function inviaConsegna(dati: { 
  provaId: number; 
  testo?: string; 
  nomeFile?: string; 
  testoFile?: string 
}) {
  try {
    const utente = await ottieniUtenteAutenticato();
    if (!utente || utente.ruolo !== "STUDENTE") return { success: false, error: "Non autorizzato" };

    const studenteId = utente.id;

    const prova = await prisma.prova.findUnique({
      where: { id: dati.provaId },
      include: { 
        corso: { 
          include: { 
            iscrizioni: { where: { studenteId, attiva: true } } 
          } 
        } 
      }
    });

    if (!prova || prova.corso.iscrizioni.length === 0) {
      return { success: false, error: "Non sei iscritto al corso relativo a questa prova o l'iscrizione è inattiva." };
    }

    await prisma.consegna.create({
      data: {
        provaId: dati.provaId,
        studenteId: studenteId,
        testo: dati.testo || null, 
        nomeFile: dati.nomeFile || null,
        testoFile: dati.testoFile || null
      }
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("Errore invio consegna:", error);
    if (error.code === 'P2002') {
      return { success: false, error: "Hai già un elaborato attivo per questa prova. Ritiralo prima di inviarne uno nuovo." };
    }
    return { success: false, error: "Errore durante l'invio della consegna." };
  }
}

export async function eliminaConsegna(consegnaId: number) {
  try {
    const utente = await ottieniUtenteAutenticato();
    if (!utente || utente.ruolo !== "STUDENTE") return { success: false, error: "Non autorizzato" };

    const studenteId = utente.id;

    return await prisma.$transaction(async (tx) => {
      const consegna = await tx.consegna.findUnique({
        where: { id: consegnaId, studenteId: studenteId },
        include: { valutazione: true }
      });

      if (!consegna) return { success: false, error: "Consegna non trovata o accesso negato." };
      if (consegna.valutazione) return { success: false, error: "Non puoi ritirare una consegna già valutata dal docente." };

      await tx.consegna.delete({
        where: { id: consegnaId }
      });
      
      return { success: true };
    });
  } catch (error) {
    console.error("Errore elimina consegna:", error);
    return { success: false, error: "Errore durante l'eliminazione della consegna." };
  }
}

export async function disiscrivitiCorso(corsoId: number) {
  try {
    const utente = await ottieniUtenteAutenticato();
    if (!utente || utente.ruolo !== "STUDENTE") return { success: false, error: "Non autorizzato" };

    const studenteId = utente.id;

    await prisma.iscrizione.update({
      where: {
        studenteId_corsoId: { studenteId, corsoId }
      },
      data: { attiva: false }
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: "Errore durante la disiscrizione." };
  }
}

export async function ottieniProfiloStudente() {
  try {
    const utente = await ottieniUtenteAutenticato();
    if (!utente || utente.ruolo !== "STUDENTE") return null;

    return await prisma.user.findUnique({
      where: { id: utente.id },
      select: { nome: true, cognome: true, matricola: true, email: true }
    });
  } catch (error) {
    console.error("Errore recupero profilo:", error);
    return null;
  }
}

export async function eseguiLogout() {
  await distruggiSessione();
  return { success: true };
}