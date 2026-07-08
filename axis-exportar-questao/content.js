let ultimoIdQuestao = 'questao';

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const rotulo = btn.getAttribute('title') || btn.textContent.trim();
  if (rotulo !== 'Visualizar') return;

  let el = btn;
  for (let i = 0; i < 8 && el; i++, el = el.parentElement) {
    const spans = el.querySelectorAll('span');
    for (const s of spans) {
      const m = s.textContent.trim().match(/^#([A-Z0-9]{6,})$/);
      if (m) {
        ultimoIdQuestao = m[1];
        return;
      }
    }
  }
}, true);

function criarBotao(modal) {
  if (modal.querySelector('.export-questao-btn')) return;

  const btn = document.createElement('button');
  btn.textContent = 'Baixar Questão';
  btn.className = 'export-questao-btn';
  btn.style.cssText = 'position:absolute;top:12px;right:60px;z-index:9999;padding:6px 12px;background:#1e293b;color:#fff;border-radius:6px;cursor:pointer;';

  btn.onclick = () => {
    const printArea = modal.querySelector('.print\\:p-0') || modal;
    const payload = {
      id: ultimoIdQuestao,
      exportadoEm: new Date().toISOString(),
      html: printArea.outerHTML,
      texto: printArea.innerText
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ultimoIdQuestao}.json`; // ex: CMRBEJ7E.json
    a.click();
    URL.revokeObjectURL(url);
  };

  modal.appendChild(btn);
}

const observer = new MutationObserver(() => {
  const modal = document.querySelector('.fixed.inset-0.z-50.flex.items-center.justify-center');
  if (modal) criarBotao(modal);
});

observer.observe(document.body, { childList: true, subtree: true });