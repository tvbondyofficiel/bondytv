/* Rubriques du site (les mêmes que le magazine N°2). Les anciens noms restent reconnus. */
(function () {
  var S = [
    { t: "Balades et culture", r: ["Balades et culture", "Culture et balades", "Culture"] },
    { t: "Vie locale", r: ["Vie locale", "Solidarité et associations", "Histoire et fierté", "Témoignage", "Vie de la ville"] },
    { t: "Dossier", r: ["Dossier"] },
    { t: "Commerce", r: ["Commerce", "À l'honneur", "La bonne adresse"] },
    { t: "Portrait", r: ["Portrait", "Les bons acteurs de Bondy"] },
    { t: "Actu", r: ["Actu", "Actualité", "Ville"] },
    { t: "Sport", r: ["Sport"] },
    { t: "Pratique", r: ["Pratique"] },
    { t: "Bondy en image", r: ["Bondy en image"] },
    { t: "Moment fort", r: ["Moment fort"] },
    { t: "Publicité", r: ["Publicité"] },
    { t: "Vie politique", r: ["Vie politique", "Politique", "Tribune citoyenne"] }
  ];
  window.BTV_SECTIONS = S;
  window.btvSec = function (r) { for (var i = 0; i < S.length; i++) if (S[i].r.indexOf(r) > -1) return S[i].t; return r || ""; };
})();
