"use strict";

let questoes = [];

function init() {
    bindEvents();
}

function bindEvents() {
    document.getElementById("inputArquivos").addEventListener("change", onSelecionarArquivos);
    document.getElementById("btnCopiar").addEventListener("click", copiarQuestoes);
    document.getElementById("btnBaixar").addEventListener("click", baixarTxt);
    document.getElementById("btnLimpar").addEventListener("click", limpar);
}

async function onSelecionarArquivos(evento) {
    const arquivos = Array.from(evento.target.files || []);
    if (arquivos.length === 0) return;
    await processarArquivos(arquivos);
}

async function processarArquivos(arquivos) {
    const resultados = await Promise.all(arquivos.map(processarArquivo));
    const novasQuestoes = resultados.flat();

    questoes = questoes.concat(novasQuestoes);

    renderizarQuestoes(questoes);
    atualizarEstatisticas(arquivos.length, novasQuestoes.length);
}

async function processarArquivo(arquivo) {
    try {
        const texto = await arquivo.text();
        const json = JSON.parse(texto);
        const identificadorArquivo = arquivo.name.replace(/\.[^.]+$/, "");

        if (Array.isArray(json)) {
            return json
                .map((item, indice) => extrairQuestaoEstruturada(item, identificadorArquivo, indice))
                .filter((questao) => questao.enunciado);
        }

        if (json && typeof json.html === "string") {
            const doc = parseHTML(json.html);
            return [criarObjetoQuestao(doc, identificadorArquivo)];
        }

        if (json && typeof json.enunciado === "string") {
            return [extrairQuestaoEstruturada(json, identificadorArquivo, 0)];
        }

        return [];
    } catch (erro) {
        console.error(`Falha ao processar "${arquivo.name}":`, erro);
        return [];
    }
}

function extrairQuestaoEstruturada(item, identificadorArquivo, indice) {
    if (!item) return { identificador: "", enunciado: "", alternativas: [], gabarito: "" };

    const identificador = item.codigo || item.id || `${identificadorArquivo}-${indice + 1}`;

    const alternativas = ["A", "B", "C", "D", "E"]
        .map((letra) => {
            const html = item[`alternativa${letra}`];
            return typeof html === "string" && html.trim() ? { letra, html: html.trim() } : null;
        })
        .filter(Boolean);

    return {
        identificador,
        enunciado: typeof item.enunciado === "string" ? item.enunciado.trim() : "",
        alternativas,
        gabarito: typeof item.correta === "string" ? item.correta.trim().toUpperCase() : ""
    };
}

function parseHTML(html) {
    const parser = new DOMParser();
    return parser.parseFromString(html, "text/html");
}

function criarObjetoQuestao(doc, identificador) {
    return {
        identificador,
        enunciado: extrairEnunciado(doc),
        alternativas: extrairAlternativas(doc),
        gabarito: detectarGabarito(doc)
    };
}

function extrairEnunciado(doc) {
    const blocoAlternativas = doc.querySelector(".pl-6");
    const previews = Array.from(doc.querySelectorAll(".preview-content"));

    const enunciadoEl = previews.find(
        (el) => !blocoAlternativas || !blocoAlternativas.contains(el)
    );

    return enunciadoEl ? enunciadoEl.innerHTML.trim() : "";
}

function obterItensAlternativas(doc) {
    const blocoAlternativas = doc.querySelector(".pl-6");
    return blocoAlternativas ? Array.from(blocoAlternativas.children) : [];
}

function obterLetraDoItem(item) {
    const spanLetra = Array.from(item.children)
        .flatMap((filho) => (filho.matches("span") ? [filho] : Array.from(filho.querySelectorAll(":scope > span"))))
        .find((span) => /^[a-e]\)$/i.test(span.textContent.trim()));

    return spanLetra ? spanLetra.textContent.trim().replace(")", "").toUpperCase() : null;
}

function extrairAlternativas(doc) {
    const itens = obterItensAlternativas(doc);
    const alternativas = [];

    itens.forEach((item) => {
        const letra = obterLetraDoItem(item);
        const conteudo = item.querySelector(":scope > div.preview-content");

        if (!letra || !conteudo) return;

        alternativas.push({
            letra,
            html: conteudo.innerHTML.trim()
        });
    });

    return alternativas;
}

function detectarGabarito(doc) {
    const itens = obterItensAlternativas(doc);

    for (const item of itens) {
        const marcado =
            item.querySelector('[title="Gabarito"]') ||
            item.querySelector(".bg-emerald-50, [class*='bg-emerald']") ||
            item.querySelector(".border-emerald-200, [class*='border-emerald']");

        if (!marcado) continue;

        const letra = obterLetraDoItem(item);
        if (letra) return letra;
    }

    return "";
}

function renderizarQuestoes(listaQuestoes) {
    const resultado = document.getElementById("resultado");
    resultado.innerHTML = "";

    if (listaQuestoes.length === 0) {
        const vazio = document.createElement("div");
        vazio.className = "vazio";
        vazio.textContent = "Nenhuma questão carregada.";
        resultado.appendChild(vazio);
        return;
    }

    const fragmento = document.createDocumentFragment();
    listaQuestoes.forEach((questao, indice) => {
        fragmento.appendChild(renderizarQuestao(questao, indice + 1));
    });
    resultado.appendChild(fragmento);
}

function renderizarQuestao(questao, numero) {
    const container = document.createElement("div");
    container.className = "questao";

    const numeroEl = document.createElement("div");
    numeroEl.className = "numero";
    numeroEl.textContent = `Questão ${numero}`;
    container.appendChild(numeroEl);

    const enunciadoEl = document.createElement("div");
    enunciadoEl.className = "enunciado preview-content";
    enunciadoEl.innerHTML = questao.enunciado;
    container.appendChild(enunciadoEl);

    questao.alternativas.forEach((alternativa) => {
        const altEl = document.createElement("div");
        altEl.className = "alternativa";

        const letraEl = document.createElement("strong");
        letraEl.textContent = `${alternativa.letra})`;
        altEl.appendChild(letraEl);

        const conteudoEl = document.createElement("span");
        conteudoEl.className = "preview-content";
        conteudoEl.innerHTML = alternativa.html;
        altEl.appendChild(conteudoEl);

        container.appendChild(altEl);
    });

    const infoEl = document.createElement("div");
    infoEl.className = "info";
    infoEl.innerHTML = `<b>Identificador:</b> ${questao.identificador}<br><b>Gabarito:</b> ${questao.gabarito}`;
    container.appendChild(infoEl);

    return container;
}

function questaoParaTexto(questao, numero) {
    const linhas = [];

    linhas.push(`${numero}. ${htmlParaTexto(questao.enunciado)}`);
    linhas.push("");

    questao.alternativas.forEach((alternativa) => {
        linhas.push(`${alternativa.letra.toLowerCase()}) ${htmlParaTexto(alternativa.html)}`);
    });

    linhas.push("");
    linhas.push(`Identificador: ${questao.identificador}`);
    linhas.push(`Gabarito: ${questao.gabarito}`);

    return linhas.join("\n");
}

function htmlParaTexto(html) {
    const doc = parseHTML(html);
    return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

function montarTextoCompleto() {
    return questoes
        .map((questao, indice) => questaoParaTexto(questao, indice + 1))
        .join("\n\n========================================\n\n");
}

async function copiarQuestoes() {
    if (questoes.length === 0) return;

    try {
        await navigator.clipboard.writeText(montarTextoCompleto());
    } catch (erro) {
        console.error("Falha ao copiar questões:", erro);
    }
}

function baixarTxt() {
    if (questoes.length === 0) return;

    const blob = new Blob([montarTextoCompleto()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "questoes.txt";
    link.click();

    URL.revokeObjectURL(url);
}

function limpar() {
    questoes = [];
    document.getElementById("inputArquivos").value = "";
    renderizarQuestoes(questoes);
    atualizarEstatisticas(0, 0, true);
}

function atualizarEstatisticas(novosArquivos, novasQuestoes, resetar = false) {
    const totalArquivosEl = document.getElementById("totalArquivos");
    const totalQuestoesEl = document.getElementById("totalQuestoes");

    if (resetar) {
        totalArquivosEl.textContent = "0";
        totalQuestoesEl.textContent = "0";
        return;
    }

    totalArquivosEl.textContent = String(Number(totalArquivosEl.textContent) + novosArquivos);
    totalQuestoesEl.textContent = String(Number(totalQuestoesEl.textContent) + novasQuestoes);
}

document.addEventListener("DOMContentLoaded", init);
