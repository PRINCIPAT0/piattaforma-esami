"use server";

import { prisma } from "@/lib/prisma";
import { valutaElaboratoConGroq, valutaElaboratoConGemini } from "@/lib/evaluator"; 
import { ottieniUtenteAutenticato, distruggiSessione } from "@/lib/auth";
import { calcolaStatisticheStudente, superaCento, raggiungeCento } from "@/lib/math";

export async function creaCorso(dati: { nome: string; annoAccad: string }) {
  try {
    const utente = await ottieniUtenteAutenticato();
    if (!utente || utente.ruolo !== "DOCENTE") return { success: false, error: "Utente non trovato o non autorizzato." };

    await prisma.corso.create({
      data: {
        nome: dati.nome,
        annoAccad: dati.annoAccad,
        docenteId: utente.id,
      }
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Impossibile creare il corso." };
  }
}

export async function ottieniCorsiDocente() {
  try {
    const utente = await ottieniUtenteAutenticato();
    if (!utente || utente.ruolo !== "DOCENTE") return [];

    return await prisma.corso.findMany({
      where: { docenteId: utente.id },
      orderBy: { id: 'desc' }
    });
  } catch (error) {
    return [];
  }
}

export async function ottieniDettaglioCorso(corsoId: number) {
  try {
    const utente = await ottieniUtenteAutenticato();
    if (!utente || utente.ruolo !== "DOCENTE") return null;

    return await prisma.corso.findUnique({
      where: { 
        id: corsoId,
        docenteId: utente.id 
      },
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
    const utente = await ottieniUtenteAutenticato();
    if (!utente || utente.ruolo !== "DOCENTE") return { success: false, error: "Non autorizzato." };

    if (!dati.descrizione || dati.descrizione.trim() === "") {
      return { 
        success: false, 
        error: "La traccia (descrizione) è obbligatoria per permettere all'IA di valutare correttamente." 
      };
    }

    const corso = await prisma.corso.findUnique({
      where: { id: dati.corsoId, docenteId: utente.id }
    });
    if (!corso) return { success: false, error: "Accesso negato: non sei il proprietario di questo corso." };

    const proveEsistenti = await prisma.prova.findMany({
      where: { corsoId: dati.corsoId },
      select: { peso: true }
    });
    
    const pesoTotaleAttuale = proveEsistenti.reduce((somma, prova) => somma + prova.peso, 0);
    const nuovoPeso = parseFloat(dati.peso);

    if (superaCento(pesoTotaleAttuale, nuovoPeso)) {
      const residuo = parseFloat((100 - pesoTotaleAttuale).toFixed(2));
      return { 
        success: false, 
        error: `Peso eccessivo! Hai a disposizione solo il ${residuo}% residuo.` 
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
    const utente = await ottieniUtenteAutenticato();
    if (!utente || utente.ruolo !== "DOCENTE") return { success: false, error: "Non autorizzato." };

    const corso = await prisma.corso.findUnique({ 
      where: { id: corsoId, docenteId: utente.id },
      include: { 
        prove: { include: { consegne: { include: { valutazione: true } } } } 
      }
    });
    
    if (!corso) return { success: false, error: "Accesso negato." };

    const haValutazioni = corso.prove.some(prova => 
      prova.consegne.some(consegna => consegna.valutazione !== null)
    );

    if (haValutazioni) {
      return { success: false, error: "Impossibile eliminare il corso: contiene valutazioni già registrate nello storico." };
    }

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
    const utente = await ottieniUtenteAutenticato();
    if (!utente || utente.ruolo !== "DOCENTE") return { success: false, error: "Non autorizzato." };

    const prova = await prisma.prova.findUnique({ 
      where: { id: provaId }, 
      include: { 
        corso: true,
        consegne: { include: { valutazione: true } }
      } 
    });
    
    if (!prova || prova.corso.docenteId !== utente.id) {
      return { success: false, error: "Accesso negato." };
    }

    const haValutazioni = prova.consegne.some(consegna => consegna.valutazione !== null);
    if (haValutazioni) {
      return { success: false, error: "Impossibile eliminare la prova: contiene valutazioni già registrate nello storico." };
    }

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
    const utente = await ottieniUtenteAutenticato();
    if (!utente || utente.ruolo !== "DOCENTE") return null;

    const prova = await prisma.prova.findUnique({
      where: { id: provaId },
      include: {
        corso: { select: { nome: true, id: true, docenteId: true } },
        consegne: {
          include: {
            studente: { select: { nome: true, cognome: true } },
            valutazione: true
          },
          orderBy: { dataConsegna: 'desc' }
        }
      }
    });

    if (!prova || prova.corso.docenteId !== utente.id) return null;

    return prova;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function valutaConsegna(dati: { consegnaId: number; voto: number; feedback: string }) {
  try {
    const utente = await ottieniUtenteAutenticato();
    if (!utente || utente.ruolo !== "DOCENTE") return { success: false, error: "Non autorizzato." };

    const consegna = await prisma.consegna.findUnique({
      where: { id: dati.consegnaId },
      include: { 
        studente: true,
        prova: { include: { corso: true } } 
      }
    });

    if (!consegna || consegna.prova.corso.docenteId !== utente.id) {
      return { success: false, error: "Non hai i permessi per valutare questa consegna." };
    }

    if (dati.voto < 0 || dati.voto > 31) {
      return { success: false, error: "Il voto deve essere compreso tra 0 e 31." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.valutazione.create({
        data: {
          consegnaId: dati.consegnaId,
          voto: dati.voto,
          feedbackDocente: dati.feedback
        }
      });

      const tutteLeProve = await tx.prova.findMany({
        where: { corsoId: consegna.prova.corsoId }
      });

      const tutteLeConsegneValutate = await tx.consegna.findMany({
        where: { 
          studenteId: consegna.studenteId,
          provaId: { in: tutteLeProve.map(p => p.id) }
        },
        include: { valutazione: true }
      });

      const stats = calcolaStatisticheStudente(tutteLeProve, tutteLeConsegneValutate);

      if (stats.esameSuperato) {
        await tx.esitoFinale.upsert({
          where: {
            studenteId_corsoId: {
              studenteId: consegna.studenteId,
              corsoId: consegna.prova.corsoId
            }
          },
          update: {
            votoFinale: stats.votoNumericoInterno,
            lode: stats.lode,
            data: new Date()
          },
          create: {
            studenteId: consegna.studenteId,
            corsoId: consegna.prova.corsoId,
            votoFinale: stats.votoNumericoInterno,
            lode: stats.lode
          }
        });
      }
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: "Errore durante il salvataggio del voto." };
  }
}

export async function eliminaValutazione(valutazioneId: number) {
  try {
    const utente = await ottieniUtenteAutenticato();
    if (!utente || utente.ruolo !== "DOCENTE") return { success: false, error: "Non autorizzato." };

    const val = await prisma.valutazione.findUnique({
      where: { id: valutazioneId },
      include: { consegna: { include: { prova: { include: { corso: true } } } } }
    });

    if (!val || val.consegna.prova.corso.docenteId !== utente.id) {
      return { success: false, error: "Accesso negato." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.valutazione.delete({
        where: { id: valutazioneId }
      });

      await tx.esitoFinale.deleteMany({
        where: {
          studenteId: val.consegna.studenteId,
          corsoId: val.consegna.prova.corsoId
        }
      });
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: "Errore durante l'eliminazione della valutazione." };
  }
}

export async function ottieniRegistroClasse(corsoId: number) {
  try {
    const utente = await ottieniUtenteAutenticato();
    if (!utente || utente.ruolo !== "DOCENTE") return null;

    const corso = await prisma.corso.findUnique({
      where: { id: corsoId, docenteId: utente.id },
      include: {
        prove: true,
        iscrizioni: {
          include: {
            studente: {
              include: {
                consegne: {
                  where: { prova: { corsoId: corsoId } },
                  include: { valutazione: true }
                }
              }
            }
          }
        }
      }
    });

    if (!corso) return null;

    const registro = corso.iscrizioni.map((iscrizione) => {
      const statistiche = calcolaStatisticheStudente(corso.prove, iscrizione.studente.consegne);

      return {
        idStudente: iscrizione.studente.id,
        nome: iscrizione.studente.nome,
        cognome: iscrizione.studente.cognome,
        matricola: iscrizione.studente.matricola,
        statistiche
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
    const utente = await ottieniUtenteAutenticato();
    if (!utente || utente.ruolo !== "DOCENTE") return null;

    return await prisma.user.findUnique({
      where: { id: utente.id },
      select: { nome: true, cognome: true, matricola: true, email: true }
    });
  } catch (error) {
    console.error("Errore recupero profilo:", error);
    return null;
  }
}

export async function chiediSupportoIA(
  consegnaId: number, 
  provider: "groq" | "gemini" = "groq",
  istruzioniExtra: string = ""
) {
  try {
    const utente = await ottieniUtenteAutenticato();
    if (!utente || utente.ruolo !== "DOCENTE") return { success: false, error: "Non autorizzato." };

    const consegna = await prisma.consegna.findUnique({
      where: { id: consegnaId },
      include: { prova: { include: { corso: true } } }
    });

    if (!consegna) {
      return { success: false, error: "Consegna non trovata nel database." };
    }
    
    if (consegna.prova.corso.docenteId !== utente.id) {
      return { success: false, error: "Accesso negato. Non sei il docente di questo corso." };
    }

    const contenutoStudente = `
      ECCO L'ELABORATO DELLO STUDENTE DA VALUTARE:

      --- NOTE TESTUALI DELLO STUDENTE ---
      ${consegna.testo || 'Nessuna nota testuale aggiunta.'}
      
      --- CODICE/FILE ALLEGATO (${consegna.nomeFile || 'Senza nome'}) ---
      \`\`\`
      ${consegna.testoFile || 'Nessun codice o file caricato.'}
      \`\`\`
    `;

    const criteriProva = `
      TITOLO PROVA: ${consegna.prova.titolo}
      DESCRIZIONE/TRACCIA PROVA: ${consegna.prova.descrizione}
    `;

    let bozzaValutazione;
    if (provider === "gemini") {
      bozzaValutazione = await valutaElaboratoConGemini(contenutoStudente, criteriProva, istruzioniExtra);
    } else {
      bozzaValutazione = await valutaElaboratoConGroq(contenutoStudente, criteriProva, istruzioniExtra);
    }

    return { success: true, data: bozzaValutazione };
  } catch (error: any) {
    console.error(`Errore IA (${provider}):`, error);
    return { success: false, error: error.message || "Errore durante l'elaborazione IA." };
  }
}

export async function eseguiLogout() {
  await distruggiSessione();
  return { success: true };
}