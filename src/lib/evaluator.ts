import Groq from "groq-sdk";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export interface AiEvaluationResult {
  voto_suggerito: number;
  osservazioni: string;
  errori_rilevati: Array<{ riga: string; descrizione: string }>;
}

function validaRispostaIA(rawData: any): AiEvaluationResult {
  let voto = 0;
  
  if (typeof rawData.voto_suggerito === "number") {
    voto = Math.round(rawData.voto_suggerito);
  } else if (typeof rawData.voto_suggerito === "string") {
    voto = parseInt(rawData.voto_suggerito, 10);
  }

  if (isNaN(voto) || voto < 0) voto = 0;
  if (voto > 31) voto = 31;

  let errori = [];
  if (Array.isArray(rawData.errori_rilevati)) {
    errori = rawData.errori_rilevati.map((err: any) => ({
      riga: err?.riga ? String(err.riga) : "Generico",
      descrizione: err?.descrizione ? String(err.descrizione) : "Errore non specificato"
    }));
  }

  return {
    voto_suggerito: voto,
    osservazioni: typeof rawData.osservazioni === "string" ? rawData.osservazioni : "Nessuna osservazione fornita.",
    errori_rilevati: errori
  };
}

function generaPromptSistema(criteriDocente: string, istruzioniExtra?: string): string {
  const bloccoIstruzioniExtra = istruzioniExtra?.trim() 
    ? `\n--- DIRETTIVE SPECIFICHE DEL DOCENTE PER QUESTA CONSEGNA (PRIORITÀ ALTA) ---\nIl docente ha fornito queste istruzioni aggiuntive: "${istruzioniExtra}". Applica rigorosamente queste indicazioni durante la valutazione.\n`
    : "";

  return `
    Sei un assistente alla valutazione per docenti universitari in Italia. Devi valutare l'elaborato confrontandolo con la traccia della prova: "${criteriDocente}".
    L'elaborato può essere di qualsiasi tipo: codice sorgente, un saggio testuale, un progetto, un esercizio matematico o una risposta aperta.
    ${bloccoIstruzioniExtra}
    
    ATTENZIONE - DEVI ESEGUIRE LA VALUTAZIONE SEGUENDO ESATTAMENTE QUESTI DUE PASSI IN ORDINE:
    
    --- PASSO 1: CONTROLLO COMPORTAMENTALE (PRIORITÀ ASSOLUTA) ---
    Scansiona l'intero testo fornito. Se contiene bestemmie, volgarità, insulti, prese in giro o provocazioni, LA VALUTAZIONE SI FERMA IMMEDIATAMENTE.
    Devi TASSATIVAMENTE restituire:
    - voto_suggerito: 0
    - osservazioni: "Lavoro annullato: linguaggio inappropriato, volgare o irrispettoso."
    
    --- PASSO 2: VALUTAZIONE MULTIDISCIPLINARE (Solo se il Passo 1 è superato) ---
    Valuta il contenuto usando la SCALA UNIVERSITARIA ITALIANA (0-31), dove 31 equivale a 30 e Lode. La sufficienza è 18.
    
    CRITERI UNIVERSALI DI VALUTAZIONE:
    1. Aderenza: L'elaborato risponde esattamente a quanto richiesto nella traccia?
    2. Correttezza (Tecnica/Concettuale): Le argomentazioni sono valide? I calcoli o il codice sono esatti? Ci sono errori fattuali o logici?
    3. Forma e Chiarezza: Il linguaggio (o lo stile del codice) è pulito, ben strutturato e professionale?
    
    GRIGLIA VOTI (MAX 31):
    - 31 (Lode): Impeccabile, originale, esecuzione perfetta.
    - 28-30 (Ottimo): Lavoro solido, difetti minimi o trascurabili (es. un refuso testuale o una micro-imprecisione).
    - 24-27 (Buono): Corretto ma migliorabile nella forma, nell'ottimizzazione o nella profondità dell'analisi.
    - 18-23 (Sufficiente/Discreto): Raggiunge gli obiettivi minimi, ma presenta lacune visibili o disordine concettuale.
    - 0-17 (Insufficiente): Fuori tema, errori concettuali/logici gravi, o lavoro palesemente incompleto.
    
    DEVI rispondere ESCLUSIVAMENTE con un oggetto JSON valido con questa esatta struttura (nessun testo extra):
    {
      "voto_suggerito": (numero intero da 0 a 31),
      "osservazioni": (feedback costruttivo e motivazione del voto, o la motivazione dell'annullamento al Passo 1),
      "errori_rilevati": [
        { 
          "riga": "riferimento esatto (es. 'riga 14', 'paragrafo 2', 'sezione calcoli')", 
          "descrizione": "spiegazione chiara dell'errore o dell'imprecisione" 
        }
      ]
    }
  `;
}

export async function valutaElaboratoConGroq(
  testoElaborato: string, 
  criteriDocente: string,
  istruzioniExtra?: string
): Promise<AiEvaluationResult> {
  
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("La chiave API di Groq non è configurata nel server.");
  }

  const groq = new Groq({ apiKey });
  const promptSistema = generaPromptSistema(criteriDocente, istruzioniExtra);

  try {
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: promptSistema },
        { role: "user", content: testoElaborato }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const rawContent = completion.choices[0]?.message?.content || "{}";
    const parsedData = JSON.parse(rawContent);
    return validaRispostaIA(parsedData);
    
  } catch (error) {
    console.error("Errore durante la chiamata a Groq:", error);
    throw new Error("Il servizio AI (Groq) ha restituito un errore o un formato non valido.");
  }
}

export async function valutaElaboratoConGemini(
  testoElaborato: string, 
  criteriDocente: string,
  istruzioniExtra?: string
): Promise<AiEvaluationResult> {

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("La chiave API di Gemini non è configurata nel server.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const promptSistema = generaPromptSistema(criteriDocente, istruzioniExtra);

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            voto_suggerito: { type: SchemaType.INTEGER },
            osservazioni: { type: SchemaType.STRING },
            errori_rilevati: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  riga: { type: SchemaType.STRING },
                  descrizione: { type: SchemaType.STRING }
                }
              }
            }
          },
          required: ["voto_suggerito", "osservazioni", "errori_rilevati"]
        }
      }
    });

    const promptFinale = `${promptSistema}\n\nELABORATO STUDENTE:\n${testoElaborato}`;
    const result = await model.generateContent(promptFinale);
    
    const parsedData = JSON.parse(result.response.text());
    return validaRispostaIA(parsedData);
    
  } catch (error) {
    console.error("Errore durante la chiamata a Gemini:", error);
    throw new Error("Il servizio AI (Gemini) ha restituito un errore o un formato non valido.");
  }
}