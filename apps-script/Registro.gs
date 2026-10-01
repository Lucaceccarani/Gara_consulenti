/**
 * GARA CONSULENTI - REGISTRO UNICO
 *
 * Da incollare in un NUOVO progetto Apps Script (Estensioni → Apps Script) di un NUOVO Google Foglio.
 * Sostituisce i due script/fogli separati (mensile e annuale): c'è un solo registro, e la classifica
 * mensile e quella annuale si calcolano da lì in base alla data.
 *
 * Fogli (si creano da soli lanciando setupRegistro()):
 *   - "Registro": una riga per segnalazione → Data | Consulente | Tipo | Valore | Cliente | Stato
 *   - "PIN":      un PIN personale per consulente → Consulente | PIN
 *
 * Tipo   = punti | idv | ida | ribassi
 * Valore = importo in € per "punti"; quantità per gli altri (1 oppure 0,5)
 * Stato  = vuoto (vale) oppure ANNULLATA (non viene conteggiata)
 *
 * Calcolo (identico a quello attuale):
 *   punti  = somma degli importi / 1000
 *   caselle = punti + idv + ida + ribassi
 *
 * GET  ...exec?periodo=mese  → classifica del mese corrente (predefinito)
 * GET  ...exec?periodo=anno  → classifica dell'anno corrente
 * POST ...exec               → { azione: "segna" | "annulla", consulente, pin, ... }
 *
 * Il nome del cliente resta solo nel foglio: la classifica pubblica non lo mostra.
 */

const FOGLIO_REGISTRO = "Registro";
const FOGLIO_PIN = "PIN";
const TIPI_VALIDI = ["punti", "idv", "ida", "ribassi"];
const EURO_PER_PUNTO = 1000;
const MAX_IMPORTO = 1000000;
const MAX_CLIENTE = 100;

// Usati solo da importaRiporto(), una tantum
const URL_VECCHIO_MENSILE = "https://script.google.com/macros/s/AKfycbx5cbOO1ZX-KA2lzsLkwskMQgSnMAEL82IVKmOi9R-5BLzUjZL6nNwMBy2oo7V_KoJs6w/exec";
const URL_VECCHIO_ANNUALE = "https://script.google.com/macros/s/AKfycbyJSe7-dKwfgLvjHC6OD05pstGI1bnSahPAzWj87D-BV9mQP0-g5IHcu_X5ybniLOLymA/exec";

// A quale mese (1-12, dell'anno in corso) si riferiscono i dati del vecchio foglio MENSILE
// che NON sono ancora stati sommati a mano nel vecchio foglio ANNUALE.
// Esempio: oggi è ottobre, l'annuale arriva a fine agosto e il mensile mostra settembre → 9.
// 0 → non importare il mensile (già contenuto nell'annuale, oppure da ripartire da zero).
const MESE_DEL_MENSILE = 9;


// ==============================
// PREPARAZIONE (da lanciare una volta a mano)
// ==============================

function setupRegistro() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (!ss.getSheetByName(FOGLIO_REGISTRO)) {
    const s = ss.insertSheet(FOGLIO_REGISTRO);
    s.appendRow(["Data", "Consulente", "Tipo", "Valore", "Cliente", "Stato"]);
    s.setFrozenRows(1);
    s.getRange("A:A").setNumberFormat("dd/MM/yyyy HH:mm");
  }

  if (!ss.getSheetByName(FOGLIO_PIN)) {
    const s = ss.insertSheet(FOGLIO_PIN);
    s.appendRow(["Consulente", "PIN"]);
    s.setFrozenRows(1);
    // formato testo, così un PIN come 0123 non perde lo zero iniziale
    s.getRange("B:B").setNumberFormat("@");
  }
}


// Travasa i totali dei vecchi fogli nel nuovo registro (righe con cliente "Riporto").
// Da lanciare UNA SOLA VOLTA, dopo setupRegistro(), prima di mettere online il nuovo sistema.
function importaRiporto() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const registro = ss.getSheetByName(FOGLIO_REGISTRO);
  const pin = ss.getSheetByName(FOGLIO_PIN);

  const gia = registro.getDataRange().getValues().some(r => r[4] === "Riporto");
  if (gia) throw new Error("Il riporto è già stato importato: non lanciarlo due volte.");

  const leggi = url => JSON.parse(UrlFetchApp.fetch(url).getContentText());

  const annuale = leggi(URL_VECCHIO_ANNUALE);
  const mensile = MESE_DEL_MENSILE ? leggi(URL_VECCHIO_MENSILE) : [];

  const anno = new Date().getFullYear();
  const inizioAnno = new Date(anno, 0, 1);
  const inizioMese = new Date(anno, MESE_DEL_MENSILE - 1, 1);

  const righe = [];

  const aggiungi = (data, nome, tipo, valore) => {
    if (valore > 0.0000001) righe.push([data, nome, tipo, valore, "Riporto", ""]);
  };

  const num = v => Number(v) || 0;

  // totali del vecchio annuale (valgono fino all'ultimo aggiornamento manuale)
  annuale.forEach(a => {
    aggiungi(inizioAnno, a.consulente, "punti", Math.round(num(a.punti) * EURO_PER_PUNTO));
    aggiungi(inizioAnno, a.consulente, "idv", num(a.idv));
    aggiungi(inizioAnno, a.consulente, "ida", num(a.ida));
    aggiungi(inizioAnno, a.consulente, "ribassi", num(a.ribassi));
  });

  // mese del vecchio mensile, non ancora sommato all'annuale
  mensile.forEach(m => {
    aggiungi(inizioMese, m.consulente, "punti", Math.round(num(m.punti) * EURO_PER_PUNTO));
    aggiungi(inizioMese, m.consulente, "idv", num(m.idv));
    aggiungi(inizioMese, m.consulente, "ida", num(m.ida));
    aggiungi(inizioMese, m.consulente, "ribassi", num(m.ribassi));
  });

  if (righe.length) {
    registro.getRange(registro.getLastRow() + 1, 1, righe.length, 6).setValues(righe);
  }

  // inserisce nel foglio PIN i consulenti che mancano (PIN da compilare a mano)
  const presenti = pin.getDataRange().getValues().map(r => String(r[0]).trim());
  annuale.concat(mensile).forEach(a => {
    if (presenti.indexOf(a.consulente) < 0) {
      presenti.push(a.consulente);
      pin.appendRow([a.consulente, ""]);
    }
  });
}


// ==============================
// CLASSIFICA (GET)
// ==============================

function doGet(e) {

  const periodo = e && e.parameter && e.parameter.periodo === "anno" ? "anno" : "mese";

  return risposta(classifica(periodo, new Date()));
}


// Legge la data di una riga: accetta sia una vera data del foglio sia un testo "gg/mm/aaaa [hh:mm]".
// (non si usa "instanceof Date": le date che arrivano dal foglio possono non essere riconosciute così)
function leggiData(v) {

  if (v && typeof v.getTime === "function") return isNaN(v.getTime()) ? null : v;

  const m = String(v).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);

  return m ? new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)) : null;
}


function classifica(periodo, adesso) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const anno = adesso.getFullYear();
  const mese = adesso.getMonth();

  const inizio = periodo === "anno" ? new Date(anno, 0, 1) : new Date(anno, mese, 1);
  const fine = periodo === "anno" ? new Date(anno + 1, 0, 1) : new Date(anno, mese + 1, 1);

  const tot = {};

  const nuovo = () => ({ euro: 0, idv: 0, ida: 0, ribassi: 0 });

  // chi è nel foglio PIN compare sempre in classifica, anche a zero
  ss.getSheetByName(FOGLIO_PIN).getDataRange().getValues().slice(1).forEach(r => {
    const nome = String(r[0]).trim();
    if (nome) tot[nome] = nuovo();
  });

  ss.getSheetByName(FOGLIO_REGISTRO).getDataRange().getValues().slice(1).forEach(r => {

    const data = leggiData(r[0]);

    if (!data || data < inizio || data >= fine) return;
    if (r[5] !== "") return; // annullata

    const nome = String(r[1]).trim();
    const valore = Number(r[3]) || 0;

    if (!tot[nome]) tot[nome] = nuovo();

    if (r[2] === "punti") tot[nome].euro += valore;
    else if (r[2] === "idv" || r[2] === "ida" || r[2] === "ribassi") tot[nome][r[2]] += valore;
  });

  const tre = n => Math.round(n * 1000) / 1000;

  return Object.keys(tot)
    .map(nome => {
      const t = tot[nome];
      const punti = tre(t.euro / EURO_PER_PUNTO);
      return {
        posizione: "",
        consulente: nome,
        caselle: tre(punti + t.idv + t.ida + t.ribassi),
        punti: punti,
        idv: tre(t.idv),
        ida: tre(t.ida),
        ribassi: tre(t.ribassi)
      };
    })
    .sort((a, b) => b.caselle - a.caselle || a.consulente.localeCompare(b.consulente))
    .map((c, i) => {
      c.posizione = ["🥇", "🥈", "🥉"][i] || "";
      return c;
    });
}


// ==============================
// SEGNALAZIONI (POST)
// ==============================

function doPost(e) {

  const lock = LockService.getScriptLock();

  try {

    lock.waitLock(10000);

    const r = JSON.parse(e.postData.contents);

    verificaPin(r.consulente, r.pin);

    if (r.azione === "segna") return risposta(segna(r));
    if (r.azione === "annulla") return risposta(annulla(r));

    throw new Error("Azione non valida");

  } catch (err) {

    return risposta({ ok: false, errore: err.message });

  } finally {

    lock.releaseLock();
  }
}


function verificaPin(consulente, pin) {

  const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FOGLIO_PIN);

  if (!s) throw new Error("Foglio PIN mancante");

  const righe = s.getDataRange().getDisplayValues();

  for (let i = 1; i < righe.length; i++) {
    if (righe[i][0].trim() === String(consulente).trim()) {
      if (righe[i][1].trim() !== "" && righe[i][1].trim() === String(pin).trim()) return;
      throw new Error("PIN non corretto");
    }
  }

  throw new Error("Consulente non abilitato");
}


function segna(r) {

  if (TIPI_VALIDI.indexOf(r.tipo) < 0) throw new Error("Tipo di attività non valido");

  const valore = Number(r.valore);

  if (!(valore > 0)) throw new Error("Valore non valido");

  if (r.tipo === "punti") {
    if (valore > MAX_IMPORTO) throw new Error("Importo troppo alto");
  } else if (valore !== 1 && valore !== 0.5) {
    throw new Error("Quantità non valida");
  }

  let cliente = String(r.cliente || "").trim().slice(0, MAX_CLIENTE);

  if (!cliente) throw new Error("Inserisci il nome del cliente");

  // evita che il testo venga interpretato come formula dal foglio
  if (/^[=+\-@]/.test(cliente)) cliente = "'" + cliente;

  SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(FOGLIO_REGISTRO)
    .appendRow([new Date(), String(r.consulente).trim(), r.tipo, valore, cliente, ""]);

  return { ok: true };
}


// Annulla l'ultima segnalazione ancora valida di quel consulente
function annulla(r) {

  const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FOGLIO_REGISTRO);
  const righe = s.getDataRange().getValues();

  for (let i = righe.length - 1; i >= 1; i--) {

    if (String(righe[i][1]).trim() === String(r.consulente).trim() && righe[i][5] === "" && righe[i][4] !== "Riporto") {

      s.getRange(i + 1, 6).setValue("ANNULLATA");

      return { ok: true, annullata: righe[i][2] + " " + righe[i][3] + " (" + righe[i][4] + ")" };
    }
  }

  throw new Error("Nessuna segnalazione da annullare");
}


function risposta(oggetto) {
  return ContentService
    .createTextOutput(JSON.stringify(oggetto))
    .setMimeType(ContentService.MimeType.JSON);
}
