let cacheQuestoes = null;
let cacheTimestamp = 0;

async function getQuestoes() {
  const agora = Date.now();
  if (!cacheQuestoes || (agora - cacheTimestamp) > 30000) { // cache de 30s
    const res = await fetch('/api/questoes?', { credentials: 'include' });
    cacheQuestoes = await res.json();
    cacheTimestamp = agora;
  }
  return cacheQuestoes;
}

function badgeDaQuestao(id) {
  return 'CMRB' + id.slice(-4).toUpperCase();
}

function comBadge(codigo, questao) {
  // Garante que o campo "codigo" (badge) fique sempre associado à questão exportada
  return { codigo, ...questao };
}

function baixarJson(nomeArquivo, dado) {
  const blob = new Blob([JSON.stringify(dado, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

async function baixarQuestaoPorBadge(codigoBadge, btn) {
  const original = btn.textContent;
  btn.textContent = '...';
  try {
    const questoes = await getQuestoes();
    const questao = questoes.find(q => badgeDaQuestao(q.id) === codigoBadge);
    if (!questao) {
      alert('Questão não encontrada: ' + codigoBadge);
      return;
    }
    baixarJson(`${codigoBadge}.json`, comBadge(codigoBadge, questao));
  } finally {
    btn.textContent = original;
  }
}

function pegarBadgesVisiveis() {
  const codigos = [];
  document.querySelectorAll('.bg-white.rounded-xl.border.border-gray-200.shadow-sm').forEach(card => {
    const header = card.querySelector('.flex.justify-between.items-center.mb-4');
    const span = header ? header.querySelector('span') : null;
    const codigo = span ? span.textContent.trim().replace('#', '') : null;
    if (codigo) codigos.push(codigo);
  });
  return codigos;
}

async function baixarTodasVisiveis(btn) {
  const original = btn.textContent;
  btn.textContent = 'Baixando...';
  btn.disabled = true;
  try {
    const badges = pegarBadgesVisiveis();
    if (badges.length === 0) {
      alert('Nenhuma questão visível na página.');
      return;
    }
    const questoes = await getQuestoes();
    const selecionadas = badges
      .map(codigo => {
        const q = questoes.find(q => badgeDaQuestao(q.id) === codigo);
        return q ? comBadge(codigo, q) : null;
      })
      .filter(Boolean);

    if (selecionadas.length === 0) {
      alert('Não foi possível localizar os dados das questões exibidas.');
      return;
    }

    baixarJson(`questoes_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`, selecionadas);
  } finally {
    btn.textContent = original;
    btn.disabled = false;
  }
}

function criarBotaoNoBadge(card) {
  const header = card.querySelector('.flex.justify-between.items-center.mb-4');
  if (!header || header.querySelector('.export-questao-badge-btn')) return;

  const span = header.querySelector('span');
  const codigo = span ? span.textContent.trim().replace('#', '') : null;
  if (!codigo) return;

  const btn = document.createElement('button');
  btn.textContent = '⬇';
  btn.title = 'Baixar Questão';
  btn.className = 'export-questao-badge-btn';
  btn.style.cssText = 'margin-left:8px;padding:1px 7px;background:#1e293b;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px;line-height:1.6;';
  btn.onclick = (e) => {
    e.stopPropagation();
    baixarQuestaoPorBadge(codigo, btn);
  };
  span.insertAdjacentElement('afterend', btn);
}

function criarBotaoBaixarTodas() {
  if (document.querySelector('.export-todas-btn')) return;

  const btn = document.createElement('button');
  btn.textContent = 'Baixar Todas Exibidas';
  btn.className = 'export-todas-btn';
  btn.style.cssText = 'position:fixed;top:12px;right:250px;z-index:9999;padding:8px 14px;background:#0f766e;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;';
  btn.onclick = () => baixarTodasVisiveis(btn);

  document.body.appendChild(btn);
}

function processarCards() {
  document.querySelectorAll('.bg-white.rounded-xl.border.border-gray-200.shadow-sm').forEach(criarBotaoNoBadge);
  criarBotaoBaixarTodas();
}

const observer = new MutationObserver(() => processarCards());
observer.observe(document.body, { childList: true, subtree: true });
processarCards();
