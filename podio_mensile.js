const URL_DATI = "https://script.google.com/macros/s/AKfycbx5cbOO1ZX-KA2lzsLkwskMQgSnMAEL82IVKmOi9R-5BLzUjZL6nNwMBy2oo7V_KoJs6w/exec";

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
            primiTre[0].caselle ?? 0;
    }


    // ==============================
    // 2° POSTO
    // ==============================

    if (primiTre[1]) {

        document.getElementById("second-name").textContent =
            primiTre[1].consulente;

        document.getElementById("second-points").textContent =
            primiTre[1].caselle ?? 0;
    }


    // ==============================
    // 3° POSTO
    // ==============================

    if (primiTre[2]) {

        document.getElementById("third-name").textContent =
            primiTre[2].consulente;

        document.getElementById("third-points").textContent =
            primiTre[2].caselle ?? 0;
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

