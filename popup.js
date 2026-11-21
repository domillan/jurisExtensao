import { TRIBUNAIS, executarPesquisaTribunal } from "./courts.js";

const form = document.getElementById("search-form");
const inputTermo = document.getElementById("termo");
const dicaPortal = document.getElementById("dica-portal");
const erroMsg = document.getElementById("erro-msg");
const radios = document.querySelectorAll('input[name="tribunal"]');

function obterTribunalSelecionado() {
  const selecionado = document.querySelector('input[name="tribunal"]:checked');
  return selecionado ? selecionado.value : "TJRS";
}

function atualizarDica() {
  const sigla = obterTribunalSelecionado();
  const config = TRIBUNAIS[sigla];
  if (config) {
    dicaPortal.textContent = config.dica;
  }
}

function focarESelecionar() {
  inputTermo.focus();
  inputTermo.select();
}

function focarNoFinal() {
  inputTermo.focus();
  const fim = inputTermo.value.length;
  inputTermo.setSelectionRange(fim, fim);
}

async function obterSelecaoPaginaAtiva() {
  try {
    const [aba] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!aba?.id || !aba.url) return "";

    // Ignora páginas internas do navegador onde scripts não podem ser injetados
    if (/^(chrome|edge|about|chrome-extension):/i.test(aba.url)) {
      return "";
    }

    const resultados = await chrome.scripting.executeScript({
      target: { tabId: aba.id, allFrames: true },
      func: () => (window.getSelection ? window.getSelection().toString() : "")
    });

    for (const item of resultados || []) {
      const texto = (item.result || "").replace(/\s+/g, " ").trim();
      if (texto) return texto;
    }
  } catch {
    // Em páginas restritas (ex.: Chrome Web Store ou PDF nativo), retorna vazio e usa o cache
  }
  return "";
}

async function inicializarPopup() {
  focarESelecionar();

  const res = await chrome.storage.local.get([
    "ultimoTribunal",
    "ultimoTermo",
    "textoPendentePopup"
  ]);

  if (res.ultimoTribunal && TRIBUNAIS[res.ultimoTribunal]) {
    const radio = document.querySelector(
      `input[name="tribunal"][value="${res.ultimoTribunal}"]`
    );
    if (radio) {
      radio.checked = true;
      atualizarDica();
    }
  }

  if (typeof res.textoPendentePopup === "string") {
    inputTermo.value = res.textoPendentePopup;
    await chrome.storage.local.remove("textoPendentePopup");
  } else {
    const textoSelecionado = await obterSelecaoPaginaAtiva();
    if (textoSelecionado) {
      inputTermo.value = textoSelecionado;
      await chrome.storage.local.set({ ultimoTermo: textoSelecionado });
    } else if (typeof res.ultimoTermo === "string") {
      inputTermo.value = res.ultimoTermo;
    }
  }

  focarESelecionar();
}

window.addEventListener("DOMContentLoaded", inicializarPopup);

inputTermo.addEventListener("input", () => {
  chrome.storage.local.set({ ultimoTermo: inputTermo.value });
});

radios.forEach((radio) => {
  radio.addEventListener("change", () => {
    atualizarDica();
    chrome.storage.local.set({ ultimoTribunal: radio.value });
    focarNoFinal();
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  erroMsg.hidden = true;

  const termo = inputTermo.value.trim();
  const tribunal = obterTribunalSelecionado();

  if (!termo) {
    erroMsg.textContent = "Digite um termo ou expressão para pesquisar.";
    erroMsg.hidden = false;
    focarESelecionar();
    return;
  }

  await executarPesquisaTribunal(tribunal, termo);
  window.close();
});