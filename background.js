import { TRIBUNAIS, executarPesquisaTribunal } from "./courts.js";

const MENU_ID = "procurar-jurisprudencia";
const SIGLAS = Object.keys(TRIBUNAIS);

function escaparXml(texto) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extrairTribunalETermo(entrada) {
  const limpo = entrada.trim();
  if (!limpo) return { sigla: null, termo: "" };

  const partes = limpo.match(/^(\S+)(?:\s+(.*))?$/);
  const primeiraPalavra = partes[1].toUpperCase();

  if (TRIBUNAIS[primeiraPalavra]) {
    return {
      sigla: primeiraPalavra,
      termo: (partes[2] || "").trim()
    };
  }

  return { sigla: null, termo: limpo };
}

function abrirPopupComTexto(termo, siglaOpcional = null) {
  const dados = {
    textoPendentePopup: termo,
    ultimoTermo: termo
  };
  if (siglaOpcional && TRIBUNAIS[siglaOpcional]) {
    dados.ultimoTribunal = siglaOpcional;
  }

  // Não aguarda await antes de openPopup() para preservar o gesto do usuário
  chrome.storage.local.set(dados);
  chrome.action.openPopup().catch(() => {
    // Fallback caso alguma janela sem barra de ferramentas impeça openPopup
    chrome.windows.create({
      url: chrome.runtime.getURL("popup.html"),
      type: "popup",
      width: 360,
      height: 290
    });
  });
}

// 1. Registro do Menu de Contexto
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Procurar jurisprudência: "%s"',
      contexts: ["selection"]
    });
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText) return;
  const selecionado = info.selectionText.trim();
  if (selecionado) {
    abrirPopupComTexto(selecionado);
  }
});

// 2. Sugestões da Omnibox enquanto o usuário digita
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const { sigla, termo } = extrairTribunalETermo(text);

  if (!termo && !sigla) return;

  if (sigla) {
    const config = TRIBUNAIS[sigla];
    const termoEscapado = escaparXml(termo || "...");
    chrome.omnibox.setDefaultSuggestion({
      description: `Pesquisar no <match>${sigla}</match> (${escaparXml(config.nome)}): <match>${termoEscapado}</match>`
    });
    return;
  }

  const termoEscapado = escaparXml(termo);
  chrome.omnibox.setDefaultSuggestion({
    description: `Abrir popup com o termo: <match>${termoEscapado}</match> (ou escolha um tribunal abaixo)`
  });

  const sugestoes = SIGLAS.map((codigo) => ({
    content: `${codigo} ${termo}`,
    description: `<match>${codigo}</match> — Pesquisar <match>${termoEscapado}</match> no ${escaparXml(TRIBUNAIS[codigo].nome)}`
  }));

  suggest(sugestoes);
});

// 3. Confirmação na Omnibox (Enter ou clique na sugestão)
chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  const { sigla, termo } = extrairTribunalETermo(text);

  if (sigla && termo) {
    await executarPesquisaTribunal(sigla, termo, disposition);
    return;
  }

  if (sigla && !termo) {
    abrirPopupComTexto("", sigla);
    return;
  }

  abrirPopupComTexto(termo);
});