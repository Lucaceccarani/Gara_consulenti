const URL_DATI = "https://script.google.com/macros/s/AKfycbyJSe7-dKwfgLvjHC6OD05pstGI1bnSahPAzWj87D-BV9mQP0-g5IHcu_X5ybniLOLymA/exec";



function aggiornaOrologio(){

let ora=new Date();

document.getElementById("clock").innerHTML =
ora.toLocaleTimeString("it-IT");

}

function aggiornaData(){

let oggi=new Date();

document.getElementById("date").innerHTML =
oggi.toLocaleDateString('it-IT');

}

setInterval(aggiornaOrologio,1000);
setInterval(aggiornaData,1000);




fetch(URL_DATI)

.then(r=>r.json())

.then(dati=>{


let podio=document.getElementById("podium");
let tabella=document.getElementById("tabella");



dati.slice(0,3).forEach((c,i)=>{


let classe=["primo","secondo","terzo"][i];

let medaglie=["🥇","🥈","🥉"];


podio.innerHTML+=`

<div class="card ${classe}">

<div class="medaglia">
${medaglie[i]}
</div>


<div class="nome">
${c.consulente}
</div>


<div class="punti">
${c.caselle}
</div>


</div>

`;


});




let massimo=dati[0].caselle;



dati.forEach((c,i)=>{


let massimo = 150;

let verde = ((c.punti || 0) / massimo) * 100;

let arancio = ((c.idv || 0) / massimo) * 100;

let giallo = ((c.ida || 0) / massimo) * 100;

let azzurro = ((c.ribassi || 0) / massimo) * 100;

let grigio = (((massimo - (c.caselle || 0))) / massimo) * 100;



let attivita = "";

attivita += `
<span class="badge verde">
🟩 ${c.punti}x
</span>
`;

attivita += `
<span class="badge arancio">
🟧 ${c.idv}x
</span>
`;

attivita += `
<span class="badge giallo">
🟨 ${c.ida}x
</span>
`;

attivita += `
<span class="badge blu">
🟦 ${c.ribassi}x
</span>
`;




tabella.innerHTML+=`

<tr>

<td>${i+1}</td>

<td>${c.consulente}</td>

<td>${c.caselle}</td>

<td class="attivita">${attivita}</td>

<td>

<div class="segment-bar">


<div class="segment seg-verde"
style="width:${verde}%">
</div>


<div class="segment seg-arancio"
style="width:${arancio}%">
</div>


<div class="segment seg-giallo"
style="width:${giallo}%">
</div>


<div class="segment seg-azzurro"
style="width:${azzurro}%">
</div>

<div class="segment seg-grigio"
style="width:${grigio}%">
</div>

</div>

</td>


</tr>

`;


});


});