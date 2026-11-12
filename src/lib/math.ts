const EPSILON = 0.01;

export interface StatisticheCorso {
  votoAttuale: number;
  votoFormattato: string;
  votoNumericoInterno: number;
  lode: boolean;
  pesoValutato: number;
  pesoTotaleConfigurato: number;
  corsoCompletamenteConfigurato: boolean;
  esameSuperato: boolean;
  bocciatoMatematicamente: boolean;
  votoMassimoPossibile: number | null;
}

export function calcolaStatisticheStudente(
  proveDelCorso: { id: number; peso: number }[],
  consegneValutate: { provaId: number; valutazione: { voto: number } | null }[]
): StatisticheCorso {
  let votoAttuale = 0;
  let pesoValutato = 0;
  let pesoTotaleConfigurato = 0;

  proveDelCorso.forEach(p => {
    pesoTotaleConfigurato += p.peso;
  });

  consegneValutate.forEach(consegna => {
    if (consegna.valutazione) {
      const prova = proveDelCorso.find(p => p.id === consegna.provaId);
      if (prova) {
        votoAttuale += (consegna.valutazione.voto * prova.peso) / 100;
        pesoValutato += prova.peso;
      }
    }
  });

  const corsoCompletamenteConfigurato = Math.abs(pesoTotaleConfigurato - 100) < EPSILON;
  const completatoAlCento = Math.abs(pesoValutato - 100) < EPSILON;

  const sufficienza = votoAttuale >= 18;
  const esameSuperato = completatoAlCento && sufficienza;

  const haLode = votoAttuale >= 30.5;

  let votoNumericoInterno = 0;
  let votoFormattato = "Non valutato";

  if (pesoValutato > 0) {
    if (haLode) {
      votoNumericoInterno = 30;
      votoFormattato = "30 e lode";
    } else {
      votoNumericoInterno = Math.min(30, Math.max(0, Math.round(votoAttuale)));
      votoFormattato = `${votoNumericoInterno}/30`;
    }
  }

  let votoMassimoPossibile = null;
  let bocciatoMatematicamente = false;

  if (corsoCompletamenteConfigurato) {
    const pesoRimanente = 100 - pesoValutato;
    const potenzialeFuturo = (31 * pesoRimanente) / 100;
    votoMassimoPossibile = votoAttuale + potenzialeFuturo;
    bocciatoMatematicamente = completatoAlCento && !esameSuperato;
  }

  return {
    votoAttuale: parseFloat(votoAttuale.toFixed(2)),
    votoFormattato,
    votoNumericoInterno,
    lode: haLode,
    pesoValutato: parseFloat(pesoValutato.toFixed(2)),
    pesoTotaleConfigurato: parseFloat(pesoTotaleConfigurato.toFixed(2)),
    corsoCompletamenteConfigurato,
    esameSuperato,
    votoMassimoPossibile: votoMassimoPossibile !== null ? parseFloat(votoMassimoPossibile.toFixed(2)) : null,
    bocciatoMatematicamente
  };
}

export function superaCento(pesoAttuale: number, nuovoPeso: number): boolean {
  return (pesoAttuale + nuovoPeso) > (100 + EPSILON);
}

export function raggiungeCento(pesoTotale: number): boolean {
  return Math.abs(pesoTotale - 100) < EPSILON;
}