const SITE_KEY = 'henrikbergfjord-site';

function markActiveNav() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-nav]').forEach(link => {
    const href = link.getAttribute('href');
    if (href === path) link.classList.add('active');
  });
}

async function setupVisitorCounter() {
  const target = document.querySelector('[data-visitor-count]');
  if (!target) return;
  try {
    const namespace = encodeURIComponent(SITE_KEY);
    const key = encodeURIComponent('frontpage');
    const response = await fetch(`https://api.countapi.xyz/hit/${namespace}/${key}`);
    const data = await response.json();
    if (typeof data.value === 'number') {
      target.textContent = data.value.toLocaleString('no-NO');
      return;
    }
    throw new Error('No count value');
  } catch {
    const storageKey = 'local-frontpage-counter';
    const hasCountedKey = 'local-frontpage-counted-session';
    const sessionKey = new Date().toISOString().slice(0, 13);
    const current = Number(localStorage.getItem(storageKey) || '0');
    const counted = sessionStorage.getItem(hasCountedKey);
    const updated = counted === sessionKey ? current : current + 1;
    if (counted !== sessionKey) {
      localStorage.setItem(storageKey, String(updated));
      sessionStorage.setItem(hasCountedKey, sessionKey);
    }
    target.textContent = `${updated.toLocaleString('no-NO')}*`;
    const note = document.querySelector('[data-visitor-note]');
    if (note) note.textContent = '* Lokal teller i nettleseren (fallback).';
  }
}

async function loadNrkNews() {
  const list = document.querySelector('[data-news-list]');
  const status = document.querySelector('[data-news-status]');
  if (!list) return;

  const feeds = [
    'https://psapi.nrk.no/smartspeaker/news/rss/nrk-hordaland.rss',
    'https://psapi.nrk.no/smartspeaker/news/rss/nrk-oslo-og-akershus.rss'
  ];

  const fallbackItems = [
    { title: 'NRK-feed kan ikke leses akkurat nå', desc: 'Legg gjerne inn Azure Function eller annen proxy senere for enda mer stabil feed.', meta: 'Fallback' },
    { title: 'DNS-siden er klar for A, AAAA, MX, TXT, CNAME og NS', desc: 'Bruker DNS over HTTPS for enkel sjekk direkte i nettleser.', meta: 'Nytt' },
    { title: 'Strøm-siden har fått ny teknisk graf og mørk visuell profil', desc: 'Bakgrunn og komponenter er laget for å se litt mer moderne og tekniske ut.', meta: 'Oppdatert' }
  ];

  function renderItems(items) {
    list.innerHTML = '';
    items.forEach(item => {
      const article = document.createElement('article');
      article.className = 'news-item';
      article.innerHTML = `<strong>${item.title}</strong><div class="muted">${item.desc || ''}</div><small>${item.meta || ''}</small>`;
      list.appendChild(article);
    });
  }

  try {
    for (const feedUrl of feeds) {
      try {
        const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
        const response = await fetch(proxy, { cache: 'no-store' });
        const xmlText = await response.text();
        if (!xmlText || !xmlText.includes('<item>')) throw new Error('Empty feed');
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');
        const items = [...xml.querySelectorAll('item')].slice(0, 5).map(item => ({
          title: item.querySelector('title')?.textContent?.trim() || 'Uten tittel',
          desc: (item.querySelector('description')?.textContent || '').replace(/<[^>]*>/g, '').trim(),
          meta: item.querySelector('pubDate')?.textContent || 'NRK'
        }));
        if (items.length) {
          renderItems(items);
          if (status) status.textContent = 'NRK-nyheter lastet inn';
          return;
        }
      } catch {
        // try next feed
      }
    }
    renderItems(fallbackItems);
    if (status) status.textContent = 'Fallback brukes akkurat nå';
  } catch {
    renderItems(fallbackItems);
    if (status) status.textContent = 'Fallback brukes akkurat nå';
  }
}

function drawEnergyChart() {
  const canvas = document.querySelector('[data-energy-chart]');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 1000;
  const height = 360;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
  const consumption = [2420, 2260, 1990, 1620, 1280, 990, 910, 960, 1220, 1680, 2140, 2380];
  const price = [1.42, 1.37, 1.18, 0.99, 0.86, 0.78, 0.73, 0.80, 0.93, 1.12, 1.26, 1.39];

  const pad = { top: 28, right: 56, bottom: 38, left: 54 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const maxKwh = Math.max(...consumption) * 1.15;
  const maxPrice = Math.max(...price) * 1.25;

  ctx.clearRect(0, 0, width, height);

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, 'rgba(255,255,255,0.03)');
  bg.addColorStop(1, 'rgba(255,255,255,0.01)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255,255,255,0.09)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + (plotH / 5) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(234,242,255,0.6)';
  ctx.font = '12px Inter, sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const value = Math.round(maxKwh - (maxKwh / 5) * i);
    const y = pad.top + (plotH / 5) * i + 4;
    ctx.fillText(`${value} kWh`, pad.left - 10, y);
  }

  ctx.textAlign = 'left';
  for (let i = 0; i <= 4; i++) {
    const value = (maxPrice - (maxPrice / 4) * i).toFixed(2);
    const y = pad.top + (plotH / 4) * i + 4;
    ctx.fillText(`${value} kr`, width - pad.right + 10, y);
  }

  const getX = i => pad.left + (plotW / (labels.length - 1)) * i;
  const getYKwh = v => pad.top + plotH - (v / maxKwh) * plotH;
  const getYPrice = v => pad.top + plotH - (v / maxPrice) * plotH;

  ctx.strokeStyle = '#46b3ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  consumption.forEach((value, i) => {
    const x = getX(i), y = getYKwh(value);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  const fill1 = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom);
  fill1.addColorStop(0, 'rgba(70,179,255,0.25)');
  fill1.addColorStop(1, 'rgba(70,179,255,0.01)');
  ctx.beginPath();
  consumption.forEach((value, i) => {
    const x = getX(i), y = getYKwh(value);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.lineTo(getX(labels.length - 1), height - pad.bottom);
  ctx.lineTo(getX(0), height - pad.bottom);
  ctx.closePath();
  ctx.fillStyle = fill1;
  ctx.fill();

  ctx.strokeStyle = '#6dffcc';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  price.forEach((value, i) => {
    const x = getX(i), y = getYPrice(value);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  labels.forEach((label, i) => {
    const x = getX(i);
    ctx.fillStyle = 'rgba(234,242,255,0.72)';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, height - 12);

    const y1 = getYKwh(consumption[i]);
    const y2 = getYPrice(price[i]);
    ctx.fillStyle = '#46b3ff';
    ctx.beginPath(); ctx.arc(x, y1, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6dffcc';
    ctx.beginPath(); ctx.arc(x, y2, 4, 0, Math.PI * 2); ctx.fill();
  });
}

async function initDnsTool() {
  const form = document.querySelector('[data-dns-form]');
  if (!form) return;
  const domainInput = form.querySelector('[name="domain"]');
  const typeInput = form.querySelector('[name="type"]');
  const output = document.querySelector('[data-dns-results]');
  const summary = document.querySelector('[data-dns-summary]');

  async function lookup(domain, type) {
    output.innerHTML = '<div class="card result-card"><div class="status">Sjekker DNS …</div></div>';
    try {
      const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`;
      const response = await fetch(url, { headers: { accept: 'application/dns-json' } });
      const data = await response.json();
      renderDns(data, domain, type);
    } catch (error) {
      summary.innerHTML = '<span class="status error">Oppslag feilet</span>';
      output.innerHTML = `<div class="card result-card"><strong>Kunne ikke hente svar.</strong><div class="muted">${error.message}</div></div>`;
    }
  }

  function renderDns(data, domain, type) {
    const statusMap = {
      0: ['Gyldig svar', 'status'],
      2: ['Serverfeil', 'warn'],
      3: ['Fant ikke domenet (NXDOMAIN)', 'error']
    };
    const [statusText, cssClass] = statusMap[data.Status] || [`DNS-status ${data.Status}`, 'warn'];
    summary.innerHTML = `<span class="status ${cssClass === 'status' ? '' : cssClass}">${statusText}</span>`;

    const answerRows = (data.Answer || []).map(answer => `
      <tr>
        <td>${answer.name || domain}</td>
        <td>${answer.type}</td>
        <td>${answer.TTL}</td>
        <td><code>${String(answer.data).replace(/</g, '&lt;')}</code></td>
      </tr>
    `).join('');

    output.innerHTML = `
      <div class="card result-card">
        <h3>${domain} · ${type}</h3>
        <div class="grid-3">
          <div><div class="muted">DNSSEC</div><strong>${data.AD ? 'Validert' : 'Ikke validert'}</strong></div>
          <div><div class="muted">CD flag</div><strong>${data.CD ? 'På' : 'Av'}</strong></div>
          <div><div class="muted">Kommentar</div><strong>${statusText}</strong></div>
        </div>
      </div>
      <div class="card result-card">
        <h3>Svarposter</h3>
        ${answerRows ? `<table class="table"><thead><tr><th>Navn</th><th>Type</th><th>TTL</th><th>Data</th></tr></thead><tbody>${answerRows}</tbody></table>` : '<div class="muted">Ingen poster returnert for denne typen.</div>'}
      </div>
      <div class="card result-card">
        <h3>Rå JSON</h3>
        <div class="code-block">${JSON.stringify(data, null, 2).replace(/</g, '&lt;')}</div>
      </div>
    `;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const domain = domainInput.value.trim();
    const type = typeInput.value;
    if (!domain) return;
    lookup(domain, type);
  });

  lookup(domainInput.value.trim(), typeInput.value);
}

function updateYear() {
  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
}

window.addEventListener('resize', drawEnergyChart);
document.addEventListener('DOMContentLoaded', () => {
  markActiveNav();
  setupVisitorCounter();
  loadNrkNews();
  drawEnergyChart();
  initDnsTool();
  updateYear();
});
