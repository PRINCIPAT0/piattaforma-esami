import Groq from "groq-sdk";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface AiEvaluationResult {
  voto_suggerito: number;
  osservazioni: string;
  errori_rilevati: Array<{ riga: string; descrizione: string }>;
}

export async function valutaElaboratoConGroq(
  testoElaborato: string, 
  criteriDocente: string,
  istruzioniExtra?: string
): Promise<AiEvaluationResult> {
  
  const bloccoIstruzioniExtra = istruzioniExtra?.trim() 
    ? `\n--- DIRETTIVE SPECIFICHE DEL DOCENTE PER QUESTA CONSEGNA (PRIORITÀ ALTA) ---\nIl docente ha fornito queste istruzioni aggiuntive: "${istruzioniExtra}". Applica rigorosamente queste indicazioni durante la valutazione.\n`
    : "";

  const promptSistema = `
    Sei un assistente alla valutazione per docenti universitari in Italia. Devi valutare l'elaborato confrontandolo con la prova: "${criteriDocente}".
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
  return JSON.parse(rawContent) as AiEvaluationResult;
}

export async function valutaElaboratoConGemini(
  testoElaborato: string, 
  criteriDocente: string,
  istruzioniExtra?: string
): Promise<AiEvaluationResult> {

  const bloccoIstruzioniExtra = istruzioniExtra?.trim() 
    ? `\n--- DIRETTIVE SPECIFICHE DEL DOCENTE PER QUESTA CONSEGNA (PRIORITÀ ALTA) ---\nIl docente ha fornito queste istruzioni aggiuntive: "${istruzioniExtra}". Applica rigorosamente queste indicazioni durante la valutazione.\n`
    : "";

  const promptSistema = `
    Sei un assistente alla valutazione per docenti universitari in Italia. Devi valutare l'elaborato confrontandolo con la prova: "${criteriDocente}".
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
  
  return JSON.parse(result.response.text()) as AiEvaluationResult;
}