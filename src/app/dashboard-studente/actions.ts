"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function ottieniCorsiConIscrizione() {
  try {
    const cookieStore = await cookies();
    const utenteId = cookieStore.get("utente_id")?.value;
    if (!utenteId) return [];

    const studenteId = parseInt(utenteId);

    const corsi = await prisma.corso.findMany({
      include: {
        docente: { select: { nome: true, cognome: true } },
        iscrizioni: { where: { studenteId } }
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
    const cookieStore = await cookies();
    const utenteId = parseInt(cookieStore.get("utente_id")?.value || "0");
    if (!utenteId) return { success: false, error: "Non autorizzato" };

    const iscrizioneEsistente = await prisma.iscrizione.findFirst({
      where: { studenteId: utenteId, corsoId: corsoId }
    });
    if (iscrizioneEsistente) return { success: false, error: "Sei già iscritto a questo corso." };

    await prisma.iscrizione.create({
      data: {
        studenteId: utenteId,
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
    const cookieStore = await cookies();
    const studenteId = parseInt(cookieStore.get("utente_id")?.value || "0");
    if (!studenteId) return null;

    const iscrizione = await prisma.iscrizione.findFirst({
      where: { studenteId, corsoId }
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

    let votoAttuale = 0;
    let pesoValutato = 0; 

    corso.prove.forEach((prova) => {
      const consegna = prova.consegne[0];
      if (consegna && consegna.valutazione) {
        votoAttuale += (consegna.valutazione.voto * prova.peso) / 100;
        pesoValutato += prova.peso;
      }
    });

    const pesoRimanente = 100 - pesoValutato;
    
    const potenzialeFuturo = (31 * pesoRimanente) / 100;
    const votoMassimoPossibile = votoAttuale + potenzialeFuturo; 

    return {
      ...corso,
      statistiche: {
        votoAttuale: parseFloat(votoAttuale.toFixed(1)),
        votoMassimo: parseFloat(votoMassimoPossibile.toFixed(1)),
        pesoValutato: parseFloat(pesoValutato.toFixed(1)),
        superato: votoAttuale >= 18 && pesoValutato === 100
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
    const cookieStore = await cookies();
    const studenteId = parseInt(cookieStore.get("utente_id")?.value || "0");
    if (!studenteId) return { success: false, error: "Non autorizzato" };

    const prova = await prisma.prova.findUnique({
      where: { id: dati.provaId },
      include: { 
        corso: { 
          include: { 
            iscrizioni: { where: { studenteId } } 
          } 
        } 
      }
    });

    if (!prova || prova.corso.iscrizioni.length === 0) {
      return { success: false, error: "Non sei iscritto al corso relativo a questa prova." };
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
  } catch (error) {
    console.error("Errore invio consegna:", error);
    return { success: false, error: "Errore durante l'invio della consegna." };
  }
}

export async function eliminaConsegna(consegnaId: number) {
  try {
    const cookieStore = await cookies();
    const studenteId = parseInt(cookieStore.get("utente_id")?.value || "0");

    const consegna = await prisma.consegna.findUnique({
      where: { id: consegnaId, studenteId: studenteId },
      include: { valutazione: true }
    });

    if (!consegna) return { success: false, error: "Consegna non trovata o accesso negato." };
    if (consegna.valutazione) return { success: false, error: "Non puoi ritirare una consegna già valutata dal docente." };

    await prisma.consegna.delete({
      where: { id: consegnaId }
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Errore durante l'eliminazione della consegna." };
  }
}

export async function disiscrivitiCorso(corsoId: number) {
  try {
    const cookieStore = await cookies();
    const studenteId = parseInt(cookieStore.get("utente_id")?.value || "0");
    if (!studenteId) return { success: false, error: "Non autorizzato" };

    const proveDelCorso = await prisma.prova.findMany({
      where: { corsoId: corsoId },
      select: { id: true }
    });
    
    const idProve = proveDelCorso.map((p) => p.id);

    if (idProve.length > 0) {
      await prisma.consegna.deleteMany({
        where: {
          studenteId: studenteId,
          provaId: { in: idProve } 
        }
      });
    }

    await prisma.iscrizione.deleteMany({
      where: {
        studenteId: studenteId,
        corsoId: corsoId
      }
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: "Errore durante la disiscrizione." };
  }
}

export async function ottieniProfiloStudente() {
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