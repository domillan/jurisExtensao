(async function executarPesquisaTRF4() {
  // Só atua na página inicial de pesquisa do eproc
  if (!window.location.href.includes("jurisprudencia@jurisprudencia/pesquisar")) {
    return;
  }

  const { trf4BuscaPendente } = await chrome.storage.local.get(["trf4BuscaPendente"]);
  if (!trf4BuscaPendente || !trf4BuscaPendente.termo) {
    return;
  }

  // Limpa imediatamente para não interferir em navegações manuais futuras
  await chrome.storage.local.remove("trf4BuscaPendente");

  // Ignora se a solicitação tiver mais de 30 segundos
  if (Date.now() - trf4BuscaPendente.criadoEm > 30000) {
    return;
  }

  const termo = trf4BuscaPendente.termo;
  const urlDestino =
    "https://jurisprudencia.trf4.jus.br/eproc2trf4/externo_controlador.php?acao=jurisprudencia@jurisprudencia/listar_resultados";

  const formOficial = document.getElementById("frmJurisprudenciaPesquisa");
  const campoPesquisa = document.getElementById("txtPesquisa");

  if (formOficial && campoPesquisa) {
    campoPesquisa.value = termo;
    formOficial.action = urlDestino;
    formOficial.method = "POST";
    HTMLFormElement.prototype.submit.call(formOficial);
    return;
  }

  // Fallback caso o formulário não esteja no DOM esperado
  const form = document.createElement("form");
  form.method = "POST";
  form.action = urlDestino;
  form.style.display = "none";

  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "txtPesquisa";
  input.value = termo;

  form.appendChild(input);
  document.body.appendChild(form);
  HTMLFormElement.prototype.submit.call(form);
})();