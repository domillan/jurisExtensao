function encodeISO88591(texto) {
  const normalizado = texto
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, "-");

  let resultado = "";
  for (const char of normalizado) {
    const code = char.codePointAt(0);

    if (
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a) ||
      (code >= 0x30 && code <= 0x39) ||
      char === "-" ||
      char === "_" ||
      char === "." ||
      char === "~"
    ) {
      resultado += char;
    } else if (char === " ") {
      resultado += "+";
    } else if (code <= 0xff) {
      resultado += "%" + code.toString(16).toUpperCase().padStart(2, "0");
    } else {
      resultado += encodeURIComponent(char);
    }
  }
  return resultado;
}

export const TRIBUNAIS = {
  TJRS: {
    sigla: "TJRS",
    nome: "Tribunal de Justiça do Rio Grande do Sul",
    dica: "Portal Solr do TJRS (pesquisa direta na ementa completa).",
    construirUrl(termo) {
      const url = new URL("https://www.tjrs.jus.br/novo/buscas-solr/");
      url.searchParams.set("aba", "jurisprudencia");
      url.searchParams.set("q", termo);
      url.searchParams.set("conteudo_busca", "ementa_completa");
      return url.toString();
    }
  },

  TRF4: {
    sigla: "TRF4",
    nome: "Tribunal Regional Federal da 4ª Região",
    dica: "Portal eproc do TRF4 (abre a sessão e envia POST para listar_resultados).",
    construirUrl() {
      return "https://jurisprudencia.trf4.jus.br/eproc2trf4/externo_controlador.php?acao=jurisprudencia@jurisprudencia/pesquisar";
    }
  },

  STJ: {
    sigla: "STJ",
    nome: "Superior Tribunal de Justiça",
    dica: "Sistema SCON/BRS do STJ (base de acórdãos, pesquisa livre).",
    construirUrl(termo) {
      const livreCodificado = encodeISO88591(termo);
      return `https://scon.stj.jus.br/SCON/pesquisar.jsp?acao=pesquisar&novaConsulta=true&b=ACOR&livre=${livreCodificado}&O=JT`;
    }
  },

  STF: {
    sigla: "STF",
    nome: "Supremo Tribunal Federal",
    dica: "Portal de Jurisprudência do STF (acórdãos, com sinônimos e plurais).",
    construirUrl(termo) {
      const url = new URL("https://jurisprudencia.stf.jus.br/pages/search");
      url.searchParams.set("base", "acordaos");
      url.searchParams.set("pesquisa_inteiro_teor", "false");
      url.searchParams.set("sinonimo", "true");
      url.searchParams.set("plural", "true");
      url.searchParams.set("radicais", "false");
      url.searchParams.set("buscaExata", "true");
      url.searchParams.set("page", "1");
      url.searchParams.set("pageSize", "10");
      url.searchParams.set("queryString", termo);
      url.searchParams.set("sort", "_score");
      url.searchParams.set("sortBy", "desc");
      return url.toString();
    }
  }
};

export async function executarPesquisaTribunal(sigla, termo, disposition = "newForegroundTab") {
  const config = TRIBUNAIS[sigla];
  if (!config || !termo) return;

  const dados = {
    ultimoTribunal: sigla,
    ultimoTermo: termo
  };

  if (sigla === "TRF4") {
    dados.trf4BuscaPendente = {
      termo,
      criadoEm: Date.now()
    };
  }

  await chrome.storage.local.set(dados);
  const url = config.construirUrl(termo);

  if (disposition === "currentTab") {
    const [abaAtiva] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (abaAtiva?.id) {
      await chrome.tabs.update(abaAtiva.id, { url });
      return;
    }
  }

  await chrome.tabs.create({
    url,
    active: disposition !== "newBackgroundTab"
  });
}