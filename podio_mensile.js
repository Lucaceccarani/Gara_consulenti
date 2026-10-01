const URL_DATI = URL_API + "?periodo=mese"; // URL_API è in config.js

// Arrotonda a max 2 decimali (evita numeri tipo 16.700000000000003)
function fmt(n){
    return (Math.round((Number(n) || 0) * 100) / 100).toLocaleString("it-IT", {maximumFractionDigits: 2});
}

// ==============================
// OROLOGIO
// ==============================

function aggiornaOrologio() {

const ora = new Date();

document.getElementById("clock").innerHTML =
    ora.toLocaleTimeString("it-IT");


}

// ==============================
// DATA
// ==============================

function aggiornaData() {

const oggi = new Date();

document.getElementById("date").innerHTML =
    oggi.toLocaleDateString("it-IT");


}

// Avvio immediato
aggiornaOrologio();
aggiornaData();

// Aggiornamento ogni secondo
setInterval(aggiornaOrologio, 1000);
setInterval(aggiornaData, 1000);

// ==============================
// CARICAMENTO CLASSIFICA
// ==============================

fetch(URL_DATI)


.then(response => {

    if (!response.ok) {
        throw new Error("Errore nel caricamento dei dati");
    }

    return response.json();

})

.then(dati => {

    // Controllo che ci siano dati
    if (!dati || dati.length === 0) {

        console.warn("Nessun dato ricevuto da Google Fogli");

        return;
    }


    // ==============================
    // PRIMI 3 CONSULENTI
    // ==============================

    const primiTre = dati.slice(0, 3);


    // ==============================
    // 1° POSTO
    // ==============================

    if (primiTre[0]) {

        document.getElementById("first-name").textContent =
            primiTre[0].consulente;

        document.getElementById("first-points").textContent =
            fmt(primiTre[0].caselle);
    }


    // ==============================
    // 2° POSTO
    // ==============================

    if (primiTre[1]) {

        document.getElementById("second-name").textContent =
            primiTre[1].consulente;

        document.getElementById("second-points").textContent =
            fmt(primiTre[1].caselle);
    }


    // ==============================
    // 3° POSTO
    // ==============================

    if (primiTre[2]) {

        document.getElementById("third-name").textContent =
            primiTre[2].consulente;

        document.getElementById("third-points").textContent =
            fmt(primiTre[2].caselle);
    }


    // ==============================
    // LOG DATI
    // ==============================

    console.log("Classifica aggiornata:", primiTre);

})

.catch(errore => {

    console.error(
        "Errore durante il caricamento della classifica:",
        errore
    );

});

