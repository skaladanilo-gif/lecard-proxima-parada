/* Configuração do Site 1 (quiz). Edite e publique de novo — não precisa mexer no resto do código.
   MAP_URL: endereço PUBLICADO do Site 2 (mapa). É dele que nasce o QR code.
            Pode ser absoluto ("https://meu-mapa.exemplo.com/") ou relativo ao quiz ("mapa/").
   TOTEM_MODE: true faz o painel do ponto sempre voltar ao início após inatividade.
               Também dá para ativar só no painel, abrindo o quiz com ?totem=1.
   IDLE_SECONDS: segundos sem toque antes do aviso de retorno ao início (mínimo 20). */
window.LECARD_CONFIG = {
  MAP_URL: "mapa.html",
  TOTEM_MODE: false,
  IDLE_SECONDS: 75
};
