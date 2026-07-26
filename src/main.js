import './styles.css'

const app = document.querySelector('#app')
const kinds = ['writing', 'music', 'photography', 'games', 'journal']
const kindNames = {
  writing: 'Writing',
  music: 'Music',
  photography: 'Photography',
  games: 'Games',
  journal: 'Journal'
}

const state = {
  data: null,
  route: parseRoute(),
  query: '',
  filter: 'all'
}

window.addEventListener('hashchange', () => {
  state.route = parseRoute()
  render()
  window.scrollTo({ top: 0, behavior: 'instant' })
})

window.addEventListener('keydown', (event) => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
    event.preventDefault()
    document.querySelector('[data-search]')?.focus()
  }
})

boot()

async function boot() {
  try {
    const response = await fetch(`content/index.json?stamp=${Date.now()}`, { cache: 'no-store' })
    if (!response.ok) throw new Error('Archive unavailable')
    state.data = await response.json()
    render()
  } catch (error) {
    app.innerHTML = `<main class="fatal"><span>Signal lost</span><h1>The archive could not be loaded.</h1><button onclick="location.reload()">Retry</button></main>`
  }
}

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, '')
  if (!raw) return { view: 'home' }
  if (raw.startsWith('entry/')) return { view: 'entry', id: decodeURIComponent(raw.slice(6)) }
  if (kinds.includes(raw)) return { view: 'archive', kind: raw }
  if (raw === 'archive') return { view: 'archive', kind: 'all' }
  if (raw === 'about') return { view: 'about' }
  return { view: 'home' }
}

function render() {
  if (!state.data) return
  const { site, entries = [] } = state.data
  const published = entries
    .filter((entry) => entry.published !== false)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))

  document.title = state.route.view === 'entry'
    ? `${published.find((entry) => entry.id === state.route.id)?.title || site.name} — ${site.name}`
    : site.name

  app.innerHTML = `
    <div class="site-shell">
      ${header(site)}
      ${view(site, published)}
      ${footer(site)}
    </div>
  `
  bindUI()
}

function header(site) {
  return `
    <header class="masthead">
      <a class="wordmark" href="#" aria-label="${escapeHTML(site.name)} home">
        <span class="wordmark-mark">J</span>
        <span>${escapeHTML(site.name)}</span>
      </a>
      <nav class="primary-nav" aria-label="Primary navigation">
        <a href="#writing">Writing</a>
        <a href="#music">Music</a>
        <a href="#photography">Photos</a>
        <a href="#games">Games</a>
        <a href="#journal">Journal</a>
      </nav>
      <a class="index-link" href="#archive">Index <span>↗</span></a>
    </header>
  `
}

function view(site, entries) {
  if (state.route.view === 'entry') return entryView(site, entries)
  if (state.route.view === 'archive') return archiveView(site, entries, state.route.kind)
  if (state.route.view === 'about') return aboutView(site, entries)
  return homeView(site, entries)
}

function homeView(site, entries) {
  const featured = entries.filter((entry) => entry.featured).slice(0, 3)
  const latest = entries.slice(0, 6)
  const display = featured.length ? featured : latest.slice(0, 3)

  return `
    <main>
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Independent archive · ${escapeHTML(site.location || 'Node 01')}</p>
          <h1>${escapeHTML(site.tagline)}</h1>
          <p class="hero-intro">${escapeHTML(site.intro)}</p>
          <div class="hero-actions">
            <a class="button button-dark" href="#archive">Enter the archive</a>
            <a class="text-link" href="#about">About Jane Co. <span>↗</span></a>
          </div>
        </div>
        <div class="instrument" aria-hidden="true">
          <div class="instrument-grid"></div>
          <div class="orbit orbit-one"><i></i></div>
          <div class="orbit orbit-two"><i></i></div>
          <div class="instrument-core">JC</div>
          <div class="instrument-readout">
            <span>FIELD / FICTION / SOUND / SYSTEMS</span>
            <span>${String(entries.length).padStart(3, '0')} OBJECTS</span>
          </div>
        </div>
      </section>

      <section class="discipline-strip" aria-label="Archive sections">
        ${kinds.map((kind, index) => `
          <a href="#${kind}" class="discipline">
            <span>0${index + 1}</span>
            <strong>${kindNames[kind]}</strong>
            <i>↗</i>
          </a>
        `).join('')}
      </section>

      <section class="section latest-section">
        <div class="section-heading">
          <div><p class="eyebrow">Recent transmissions</p><h2>Latest work</h2></div>
          <a href="#archive">Full index <span>↗</span></a>
        </div>
        ${display.length ? `<div class="feature-grid">${display.map(featureCard).join('')}</div>` : emptyArchive()}
      </section>

      <section class="section manifesto">
        <div class="manifesto-number">∞</div>
        <p>One place for finished work, unfinished investigations, technical experiments, and whatever refuses to fit neatly into a single discipline.</p>
      </section>
    </main>
  `
}

function archiveView(site, entries, kind = 'all') {
  state.filter = kind
  const title = kind === 'all' ? 'Complete index' : kindNames[kind]
  return `
    <main class="page-main">
      <section class="page-title">
        <p class="eyebrow">${kind === 'all' ? 'All records' : 'Discipline'}</p>
        <h1>${title}</h1>
        <p>${kind === 'all' ? 'The complete public record, ordered by most recent.' : `All ${title.toLowerCase()} in the archive.`}</p>
      </section>
      <section class="archive-tools">
        <label class="search-field">
          <span>Search</span>
          <input data-search type="search" value="${escapeAttribute(state.query)}" placeholder="Title, tag, or phrase" autocomplete="off" />
          <kbd>/</kbd>
        </label>
        <div class="filter-row" role="group" aria-label="Filter archive">
          ${['all', ...kinds].map((item) => `<button data-filter="${item}" class="${state.filter === item ? 'active' : ''}">${item === 'all' ? 'All' : kindNames[item]}</button>`).join('')}
        </div>
      </section>
      <section data-results>${archiveResults(entries)}</section>
    </main>
  `
}

function archiveResults(entries) {
  const query = state.query.trim().toLowerCase()
  const filtered = entries.filter((entry) => {
    if (state.filter !== 'all' && entry.kind !== state.filter) return false
    if (!query) return true
    return [entry.title, entry.summary, entry.body, ...(entry.tags || [])]
      .join(' ')
      .toLowerCase()
      .includes(query)
  })

  return filtered.length
    ? `<div class="archive-list">${filtered.map(indexRow).join('')}</div>`
    : `<div class="empty-state"><span>00</span><h2>No matching records.</h2><p>Try a broader search or another discipline.</p></div>`
}

function entryView(site, entries) {
  const entry = entries.find((item) => item.id === state.route.id)
  if (!entry) return `<main class="page-main">${emptyArchive('Record not found.')}</main>`
  const media = Array.isArray(entry.media) ? entry.media : []
  return `
    <main class="entry-main">
      <a class="back-link" href="#${entry.kind || 'archive'}">← ${kindNames[entry.kind] || 'Index'}</a>
      <article class="entry-article">
        <header class="entry-header">
          <div class="entry-meta"><span>${kindNames[entry.kind] || 'Record'}</span><time>${formatDate(entry.date)}</time></div>
          <h1>${escapeHTML(entry.title)}</h1>
          ${entry.summary ? `<p class="entry-deck">${escapeHTML(entry.summary)}</p>` : ''}
          ${entry.tags?.length ? `<div class="tag-row">${entry.tags.map((tag) => `<span>${escapeHTML(tag)}</span>`).join('')}</div>` : ''}
        </header>
        ${entry.cover ? `<figure class="entry-cover"><img src="${escapeAttribute(assetURL(entry.cover))}" alt="" /></figure>` : ''}
        ${renderMedia(media, entry)}
        ${entry.body ? `<div class="prose">${markdown(entry.body)}</div>` : ''}
        ${entry.href ? `<a class="button button-dark outbound" href="${escapeAttribute(entry.href)}" target="_blank" rel="noreferrer">Open project <span>↗</span></a>` : ''}
      </article>
    </main>
  `
}

function aboutView(site, entries) {
  const counts = kinds.map((kind) => ({ kind, count: entries.filter((entry) => entry.kind === kind).length }))
  return `
    <main class="page-main about-main">
      <section class="page-title about-title">
        <p class="eyebrow">About</p>
        <h1>A public cabinet of work.</h1>
        <p>${escapeHTML(site.intro)}</p>
      </section>
      <section class="about-grid">
        <div class="about-copy">
          <p>Jane Co. is organized as a living archive rather than a portfolio with a finish line. Work can appear here as a story, a track, a photograph, a playable system, or a note made while figuring something out.</p>
          <p>The categories are useful. They are not borders.</p>
          ${site.email ? `<a class="text-link" href="mailto:${escapeAttribute(site.email)}">${escapeHTML(site.email)} <span>↗</span></a>` : ''}
        </div>
        <div class="archive-counts">
          ${counts.map(({ kind, count }, index) => `<a href="#${kind}"><span>0${index + 1}</span><strong>${kindNames[kind]}</strong><b>${String(count).padStart(2, '0')}</b></a>`).join('')}
        </div>
      </section>
    </main>
  `
}

function featureCard(entry) {
  return `
    <a class="feature-card" href="#entry/${encodeURIComponent(entry.id)}">
      <div class="feature-visual ${entry.cover ? 'has-image' : ''}">
        ${entry.cover ? `<img src="${escapeAttribute(assetURL(entry.cover))}" alt="" loading="lazy" />` : `<span>${kindGlyph(entry.kind)}</span><i></i>`}
      </div>
      <div class="feature-meta"><span>${kindNames[entry.kind] || 'Record'}</span><time>${formatDate(entry.date)}</time></div>
      <h3>${escapeHTML(entry.title)}</h3>
      ${entry.summary ? `<p>${escapeHTML(entry.summary)}</p>` : ''}
    </a>
  `
}

function indexRow(entry, index) {
  return `
    <a class="index-row" href="#entry/${encodeURIComponent(entry.id)}">
      <span class="row-number">${String(index + 1).padStart(2, '0')}</span>
      <div class="row-title"><strong>${escapeHTML(entry.title)}</strong><span>${escapeHTML(entry.summary || '')}</span></div>
      <span class="row-kind">${kindNames[entry.kind] || 'Record'}</span>
      <time>${formatDate(entry.date, true)}</time>
      <i>↗</i>
    </a>
  `
}

function renderMedia(media, entry) {
  if (!media.length) return ''
  const images = media.filter((item) => item.type?.startsWith('image') || /\.(png|jpe?g|webp|gif|avif)$/i.test(item.url || item))
  const audio = media.filter((item) => item.type?.startsWith('audio') || /\.(mp3|wav|m4a|ogg|flac)$/i.test(item.url || item))
  const other = media.filter((item) => !images.includes(item) && !audio.includes(item))

  return `
    ${audio.map((item) => `<div class="audio-player"><div><span>Audio</span><strong>${escapeHTML(item.name || entry.title)}</strong></div><audio controls preload="metadata" src="${escapeAttribute(assetURL(item.url || item))}"></audio></div>`).join('')}
    ${images.length ? `<div class="image-grid ${images.length === 1 ? 'single' : ''}">${images.map((item) => `<figure><img src="${escapeAttribute(assetURL(item.url || item))}" alt="${escapeAttribute(item.alt || '')}" loading="lazy" /></figure>`).join('')}</div>` : ''}
    ${other.map((item) => `<a class="download-row" href="${escapeAttribute(assetURL(item.url || item))}" target="_blank" rel="noreferrer"><span>${escapeHTML(item.name || 'Open file')}</span><i>↗</i></a>`).join('')}
  `
}

function emptyArchive(title = 'First transmission pending.') {
  return `<div class="empty-state home-empty"><span>00</span><h2>${title}</h2><p>The structure is live. The archive is ready for its first record.</p></div>`
}

function footer(site) {
  return `
    <footer>
      <div><span class="footer-mark">J</span><strong>${escapeHTML(site.name)}</strong></div>
      <p>Writing · Sound · Images · Systems</p>
      <span>© ${new Date().getFullYear()}</span>
    </footer>
  `
}

function bindUI() {
  const search = document.querySelector('[data-search]')
  search?.addEventListener('input', (event) => {
    state.query = event.target.value
    const results = document.querySelector('[data-results]')
    if (results) results.innerHTML = archiveResults(state.data.entries.filter((entry) => entry.published !== false))
  })
  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter
      document.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('active', item === button))
      const results = document.querySelector('[data-results]')
      if (results) results.innerHTML = archiveResults(state.data.entries.filter((entry) => entry.published !== false))
    })
  })
}

function formatDate(value, compact = false) {
  if (!value) return 'Undated'
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', compact
    ? { month: 'short', year: 'numeric' }
    : { month: 'long', day: 'numeric', year: 'numeric' }
  ).format(date)
}

function kindGlyph(kind) {
  return ({ writing: '¶', music: '∿', photography: '◫', games: '◇', journal: '↯' })[kind] || '·'
}

function assetURL(value) {
  if (!value) return ''
  if (/^(https?:|data:|blob:)/i.test(value)) return value
  return new URL(value.replace(/^\/+/, ''), document.baseURI).href
}

function markdown(source) {
  const safe = escapeHTML(source).replace(/\r\n/g, '\n')
  const blocks = safe.split(/\n{2,}/)
  return blocks.map((block) => {
    if (/^###\s/.test(block)) return `<h3>${inline(block.replace(/^###\s/, ''))}</h3>`
    if (/^##\s/.test(block)) return `<h2>${inline(block.replace(/^##\s/, ''))}</h2>`
    if (/^#\s/.test(block)) return `<h2>${inline(block.replace(/^#\s/, ''))}</h2>`
    if (/^&gt;\s/.test(block)) return `<blockquote>${inline(block.replace(/^&gt;\s/, ''))}</blockquote>`
    if (/^(?:-\s.+\n?)+$/.test(block)) return `<ul>${block.split('\n').map((line) => `<li>${inline(line.replace(/^-\s/, ''))}</li>`).join('')}</ul>`
    return `<p>${inline(block).replace(/\n/g, '<br>')}</p>`
  }).join('')
}

function inline(value) {
  return value
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character])
}

function escapeAttribute(value = '') {
  return escapeHTML(value).replace(/`/g, '&#96;')
}
