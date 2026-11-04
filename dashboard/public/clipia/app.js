/* ClipsIA Mobile 0.1 - OpenShorts core backend client.
 * License: MIT, original ClipsIA interface. No bundled secrets.
 * Targets self-hosted OpenShorts with BILLING_ENABLED disabled.
 */
const $ = (id) => document.getElementById(id);
const state = { mode: 'url', jobId: null, busy: false, timer: null, polling: false, config: null, retry: null };
const els = {
  form: $('clip-form'), url: $('video-url'), file: $('video-file'), submit: $('submit'),
  error: $('form-error'), connection: $('connection'), work: $('work-section'),
  status: $('job-state'), message: $('status-message'), log: $('latest-log'),
  quality: $('confirm-quality'), results: $('results-section'), list: $('clip-list')
};
const SESSION_KEY = 'clipsia_job_v1';
// GitHub Pages can serve the interface only; never POST videos to github.io.
const IS_GITHUB_PAGES = window.location.hostname.toLowerCase().endsWith('.github.io');

function showError(message) { els.error.textContent = message; els.error.hidden = !message; }
function humanError(value) {
  let msg = String(value || 'Não foi possível concluir esta operação.');
  try { const parsed = JSON.parse(msg); msg = parsed.detail?.message || parsed.detail || parsed.message || msg; } catch (_) { /* plain text */ }
  return String(msg).slice(0, 340);
}
function videoUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const url = new URL(raw, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.href;
  } catch (_) { return null; }
}
function sourceLinkValid(value) {
  try { const url = new URL(value.trim()); return /^https?:$/.test(url.protocol); } catch (_) { return false; }
}
function switchMode(mode) {
  state.mode = mode;
  ['url', 'file'].forEach((key) => {
    const active = mode === key;
    $(`tab-${key === 'url' ? 'link' : 'file'}`).classList.toggle('active', active);
    $(`tab-${key === 'url' ? 'link' : 'file'}`).setAttribute('aria-selected', String(active));
    $(`panel-${key === 'url' ? 'link' : 'file'}`).hidden = !active;
  });
  showError('');
  updateSubmit();
}
function updateSubmit() {
  const hasSource = state.mode === 'url' ? sourceLinkValid(els.url.value) : Boolean(els.file.files?.[0]);
  els.submit.disabled = Boolean(state.busy || state.config?.billingEnabled || state.config === null || !hasSource || !$('acknowledged').checked);
}
function setWorking(message, badge) {
  els.work.hidden = false;
  els.status.textContent = badge;
  els.message.textContent = message;
  els.work.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function setBusy(value) {
  state.busy = value;
  els.submit.innerHTML = value ? '<span>◌</span> Enviando para a IA...' : '<span class="btn-sparkle">✦</span> Gerar meus cortes <span aria-hidden="true">→</span>';
  updateSubmit();
}
async function request(path, options = {}) {
  const response = await fetch(path, { cache: 'no-store', ...options });
  if (!response.ok) throw new Error(humanError(await response.text()));
  return response.json();
}
async function checkBackend() {
  if (IS_GITHUB_PAGES) {
    state.config = null;
    els.connection.textContent = '● Prévia online — IA pendente';
    els.connection.className = 'connection';
    showError('A interface já está publicada, mas o GitHub Pages não executa vídeos com IA. Para gerar cortes, precisamos de um servidor privado com HTTPS. Consulte o guia de implantação no GitHub.');
    updateSubmit();
    return;
  }
  try {
    const cfg = await request('/api/config');
    state.config = cfg;
    if (cfg.billingEnabled) {
      els.connection.textContent = '● Precisa modo self-host';
      els.connection.className = 'connection bad';
      showError('Este painel funciona com o OpenShorts instalado em seu próprio servidor, com BILLING_ENABLED desativado.');
    } else {
      const groqConfigured = cfg.localLlm?.baseUrl?.startsWith('https://api.groq.com/openai/v1');
      els.connection.textContent = groqConfigured ? '● Servidor ativo · Groq configurado' : '● Servidor conectado';
      els.connection.className = 'connection ok';
    }
  } catch (_) {
    state.config = null;
    els.connection.textContent = '● Servidor indisponível';
    els.connection.className = 'connection bad';
    showError('O servidor OpenShorts não respondeu. Inicie os serviços Docker e abra esta página pela URL do frontend.');
  }
  updateSubmit();
}
function buildPayload(forceLowQuality = false) {
  const advanced = {
    acknowledged: true,
    output_format: $('format').value,
    target_clips: $('clip-count').value,
    auto_hook: $('auto-hook').checked ? '1' : '0',
    captions: $('captions').checked ? 'true' : 'false',
    force_low_quality: forceLowQuality
  };
  if (state.mode === 'url') return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...advanced, url: els.url.value.trim() }) };
  const formData = new FormData();
  formData.append('file', els.file.files[0]);
  Object.entries(advanced).forEach(([key, value]) => formData.append(key, String(value)));
  return { headers: {}, body: formData };
}
function startPoll(jobId) {
  if (state.timer) clearInterval(state.timer);
  state.jobId = jobId;
  state.polling = false;
  state.timer = setInterval(() => pollJob(jobId), 3500);
  pollJob(jobId);
}
function stopPoll() { if (state.timer) clearInterval(state.timer); state.timer = null; }
async function submitJob(forceLowQuality = false) {
  if (state.busy) return;
  showError('');
  els.quality.hidden = true;
  setBusy(true);
  setWorking('Enviando vídeo e iniciando processamento...', 'Enviando');
  els.results.hidden = true;
  els.list.replaceChildren();
  try {
    const payload = buildPayload(forceLowQuality);
    const key = $('gemini-key').value.trim();
    if (key) payload.headers['X-Gemini-Key'] = key;
    const data = await request('/api/process', { method: 'POST', headers: payload.headers, body: payload.body });
    if (data.needs_confirmation) {
      els.quality.hidden = false;
      setWorking('A qualidade do vídeo precisa de confirmação.', 'Atenção');
      state.retry = () => submitJob(true);
      return;
    }
    if (!data.job_id) throw new Error('O servidor não enviou o identificador do processamento.');
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: data.job_id, at: Date.now() }));
    setWorking('A IA está encontrando os melhores momentos do seu vídeo...', 'Processando');
    startPoll(data.job_id);
  } catch (error) {
    els.work.hidden = true;
    showError(humanError(error.message));
  } finally {
    setBusy(false);
  }
}
async function pollJob(jobId) {
  if (state.polling || jobId !== state.jobId) return;
  state.polling = true;
  try {
    const data = await request(`/api/status/${encodeURIComponent(jobId)}`);
    if (jobId !== state.jobId) return;
    const stage = data.status;
    const logs = Array.isArray(data.logs) ? data.logs : [];
    if (logs.length) els.log.textContent = logs[logs.length - 1];
    if (stage === 'queued') {
      const ahead = Number(data.queue?.ahead);
      els.status.textContent = 'Na fila';
      els.message.textContent = Number.isFinite(ahead) ? `${ahead} processamento(s) à frente.` : 'Aguardando a vez para processar.';
    } else if (stage === 'processing') {
      els.status.textContent = 'Processando';
      els.message.textContent = 'Transcrevendo, escolhendo e renderizando os melhores cortes...';
    } else if (stage === 'completed') {
      stopPoll();
      els.work.hidden = true;
      if (data.result?.clips?.length) showResults(data.result.clips, jobId);
      else showError('O processo terminou, mas não retornou cortes. Consulte os logs do servidor.');
    } else if (stage === 'failed') {
      stopPoll();
      els.work.hidden = true;
      showError(humanError(data.error || logs.at(-1) || 'O processamento falhou.'));
    }
  } catch (error) {
    // A transient network error should not discard a long-running job.
    els.status.textContent = 'Reconectando';
    els.message.textContent = `Conexão interrompida. Tentaremos novamente. (${humanError(error.message)})`;
  } finally {
    state.polling = false;
  }
}
function showResults(clips, jobId) {
  const ranked = clips.map((clip, index) => ({ clip, index })).sort((a, b) => (Number(b.clip.predicted_score) || 0) - (Number(a.clip.predicted_score) || 0) || a.index - b.index);
  const fragment = document.createDocumentFragment();
  ranked.forEach(({ clip, index }, rank) => {
    const card = document.createElement('article'); card.className = 'clip';
    const top = document.createElement('div'); top.className = 'clip-top';
    const number = document.createElement('span'); number.className = 'clip-number'; number.textContent = `CORTE ${String(rank + 1).padStart(2, '0')}`;
    top.append(number);
    const score = Number(clip.predicted_score);
    if (Number.isFinite(score)) { const badge = document.createElement('span'); badge.className = 'clip-score'; badge.textContent = `✦ ${Math.round(score)}/100`; top.append(badge); }
    card.append(top);
    const src = videoUrl(clip.download_url || clip.video_url);
    if (src) {
      const player = document.createElement('video'); player.src = src; player.controls = true; player.playsInline = true; player.preload = 'metadata'; player.setAttribute('aria-label', `Prévia do corte ${rank+1}`); card.append(player);
    }
    const title = document.createElement('h3'); title.textContent = clip.title || clip.hook || `Momento ${rank+1}`; card.append(title);
    if (clip.why) { const why = document.createElement('p'); why.className = 'why'; why.textContent = clip.why; card.append(why); }
    if (src) { const download = document.createElement('a'); download.href = src; download.download = `clipia-${jobId.slice(0,8)}-${index+1}.mp4`; download.className = 'download-link'; download.textContent = '↓ Baixar vídeo MP4'; download.rel = 'noopener noreferrer'; card.append(download); }
    fragment.append(card);
  });
  els.list.replaceChildren(fragment);
  els.results.hidden = false;
  const all = $('download-all');
  all.href = `/api/jobs/${encodeURIComponent(jobId)}/download-all`;
  all.hidden = false;
  els.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function resetProject() {
  stopPoll(); state.jobId = null; state.retry = null; localStorage.removeItem(SESSION_KEY);
  els.work.hidden = true; els.results.hidden = true; els.quality.hidden = true;
  els.list.replaceChildren(); els.url.value = ''; els.file.value = ''; $('upload-label').textContent = 'Escolher vídeo do celular';
  showError(''); updateSubmit(); window.scrollTo({ top: 0, behavior: 'smooth' });
}
async function resumeSavedJob() {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (!saved?.id || Date.now() - saved.at > 24*60*60*1000) return;
    setWorking('Recuperando o processamento anterior...', 'Reconectando');
    startPoll(saved.id);
  } catch (_) { /* no saved job */ }
}

document.querySelectorAll('[data-mode]').forEach((tab) => tab.addEventListener('click', () => switchMode(tab.dataset.mode)));
els.url.addEventListener('input', updateSubmit);
els.file.addEventListener('change', () => { $('upload-label').textContent = els.file.files?.[0]?.name || 'Escolher vídeo do celular'; updateSubmit(); });
$('acknowledged').addEventListener('change', updateSubmit);
els.form.addEventListener('submit', (event) => { event.preventDefault(); if (!els.submit.disabled) submitJob(); });
$('force-quality').addEventListener('click', () => { if (state.retry) state.retry(); });
$('new-project').addEventListener('click', resetProject);
checkBackend().then(resumeSavedJob);
