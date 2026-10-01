// URL_API arriva da config.js: lo script di Google risponde con la classifica (GET)
// e registra le attività (POST).

const NOMI_TIPO = {
    punti: "Punti",
    idv: "Incarico di Vendita",
    ida: "Incarico di Acquisto",
    ribassi: "Ribasso"
};

const elConsulente = document.getElementById("consulente");
const elPin = document.getElementById("pin");
const elRicorda = document.getElementById("ricorda");
const elMessaggio = document.getElementById("messaggio");
const elAnnulla = document.getElementById("annulla");

const elConferma = document.getElementById("conferma");
const elTitolo = document.getElementById("conferma-titolo");
const elCampoImporto = document.getElementById("campo-importo");
const elCliente = document.getElementById("cliente");
const elImporto = document.getElementById("importo");
const elCampoQuantita = document.getElementById("campo-quantita");
const elSi = document.getElementById("conferma-si");
const elNo = document.getElementById("conferma-no");

let tipoScelto = null;
let quantita = 1;
let invioInCorso = false;


function mostra(testo, classe) {
    elMessaggio.textContent = testo;
    elMessaggio.className = classe || "";
}

function leggi(chiave) {
    try { return localStorage.getItem(chiave) || ""; } catch (e) { return ""; }
}

function scrivi(chiave, valore) {
    try {
        if (valore) localStorage.setItem(chiave, valore);
        else localStorage.removeItem(chiave);
    } catch (e) { /* ignora: es. navigazione privata */ }
}


// ==============================
// ELENCO CONSULENTI
// ==============================

fetch(URL_API)
    .then(r => r.json())
    .then(dati => {

        const nomi = dati.map(c => c.consulente).filter(Boolean).sort((a, b) => a.localeCompare(b, "it"));

        elConsulente.innerHTML = '<option value="">— scegli il tuo nome —</option>';

        nomi.forEach(nome => {
            const o = document.createElement("option");
            o.value = nome;
            o.textContent = nome;
            elConsulente.appendChild(o);
        });

        elConsulente.value = leggi("consulente");
    })
    .catch(() => {
        elConsulente.innerHTML = '<option value="">Errore di caricamento</option>';
        mostra("Impossibile caricare l'elenco consulenti. Riprova.", "errore");
    });

elPin.value = leggi("pin");


// ==============================
// INVIO AL FOGLIO
// ==============================

function invia(payload) {

    // text/plain evita la richiesta di "preflight" che Google Apps Script non gestisce
    return fetch(URL_API, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    }).then(r => r.json());
}

function datiBase() {
    return { consulente: elConsulente.value, pin: elPin.value.trim() };
}

function controllaIdentita() {

    if (!elConsulente.value) {
        mostra("Scegli prima il tuo nome.", "errore");
        return false;
    }

    if (!elPin.value.trim()) {
        mostra("Inserisci il tuo PIN.", "errore");
        return false;
    }

    return true;
}

function ricordaIdentita() {
    scrivi("consulente", elRicorda.checked ? elConsulente.value : "");
    scrivi("pin", elRicorda.checked ? elPin.value.trim() : "");
}


// ==============================
// BOTTONI ATTIVITÀ
// ==============================

document.querySelectorAll(".tipo").forEach(b => {

    b.addEventListener("click", () => {

        mostra("");

        if (!controllaIdentita()) return;

        tipoScelto = b.dataset.tipo;
        quantita = 1;

        elTitolo.textContent = NOMI_TIPO[tipoScelto];

        const sonoPunti = tipoScelto === "punti";

        elCampoImporto.hidden = !sonoPunti;
        elCampoQuantita.hidden = sonoPunti;
        elImporto.value = "";
        elCliente.value = "";

        document.querySelectorAll("#campo-quantita button").forEach(q => {
            q.classList.toggle("attiva", q.dataset.q === "1");
        });

        elConferma.hidden = false;

        elCliente.focus();
    });
});

document.querySelectorAll("#campo-quantita button").forEach(q => {

    q.addEventListener("click", () => {

        quantita = Number(q.dataset.q);

        document.querySelectorAll("#campo-quantita button").forEach(x => {
            x.classList.toggle("attiva", x === q);
        });
    });
});

elNo.addEventListener("click", () => {
    elConferma.hidden = true;
});

elSi.addEventListener("click", () => {

    if (invioInCorso) return;

    const cliente = elCliente.value.trim();

    if (!cliente) {
        elCliente.focus();
        return;
    }

    let valore = quantita;

    if (tipoScelto === "punti") {

        valore = Number(String(elImporto.value).replace(",", "."));

        if (!(valore > 0)) {
            elImporto.focus();
            return;
        }
    }

    invioInCorso = true;
    elSi.disabled = true;
    elSi.textContent = "Invio…";

    invia({ azione: "segna", ...datiBase(), tipo: tipoScelto, valore, cliente })

        .then(r => {

            if (!r.ok) throw new Error(r.errore || "Errore sconosciuto");

            ricordaIdentita();

            mostra("✅ Registrato: " + NOMI_TIPO[tipoScelto] + (tipoScelto === "punti" ? " " + valore + " €" : "") + " – " + cliente, "ok");
            elAnnulla.hidden = false;
        })

        .catch(e => {
            mostra("❌ " + e.message, "errore");
        })

        .finally(() => {
            invioInCorso = false;
            elSi.disabled = false;
            elSi.textContent = "Conferma";
            elConferma.hidden = true;
        });
});


// ==============================
// ANNULLA ULTIMA
// ==============================

elAnnulla.addEventListener("click", () => {

    if (invioInCorso || !controllaIdentita()) return;

    if (!confirm("Annullare l'ultima segnalazione?")) return;

    invioInCorso = true;

    invia({ azione: "annulla", ...datiBase() })

        .then(r => {

            if (!r.ok) throw new Error(r.errore || "Errore sconosciuto");

            mostra("↩️ Annullata: " + r.annullata, "ok");
            elAnnulla.hidden = true;
        })

        .catch(e => {
            mostra("❌ " + e.message, "errore");
        })

        .finally(() => {
            invioInCorso = false;
        });
});
