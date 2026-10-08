/* Configuração do Site 2 (mapa). Edite e publique de novo.
   QUIZ_URL: endereço publicado do Site 1 (quiz), absoluto ou relativo ao mapa ("../").
   PLACES_URL: arquivo de locais (padrão: places.json ao lado do mapa).
   TILE_URL / TILE_ATTRIBUTION: servidor do mapa de fundo. O padrão usa os tiles do OpenStreetMap,
     adequados a um experimento. Para veiculação com muito tráfego, troque por um provedor de tiles
     (ex.: MapTiler, Stadia, Carto) e mantenha a atribuição exigida por ele.
   LECARD_NETWORK_URL: deixe null até a LeCard fornecer a rede credenciada (formato no README).
   IDLE_SECONDS: no modo totem (?totem=1), segundos sem toque antes de voltar ao quiz. */
window.LECARD_MAP_CONFIG = {
  QUIZ_URL: "./",
  PLACES_URL: "places.json",
  TILE_URL: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  TILE_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">colaboradores do OpenStreetMap</a>',
  LECARD_NETWORK_URL: null,
  IDLE_SECONDS: 90
};
