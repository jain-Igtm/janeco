import './styles.css'

const OWNER = 'jain-Igtm'
const REPO = 'jain-Igtm/janeco'
const CONTENT_PATH = 'public/content/index.json'
const API = 'https://api.github.com'
const MAX_FILE_SIZE = 45 * 1024 * 1024

const app = document.querySelector('#app')
const state = {
  token: '',
  user: null,
  content: null,
  contentSha: '',
  tab: 'library',
  editingId: null,
  busy: false,
  notice: null,
  uploadFiles: []
}

render()

function render() {
  app.innerHTML = state.user ? studioView() : loginView()
  bind()
}

function loginView() {
  return `
    <main class="login-shell">
      <section class="login-panel">
        <div class="brand"><span>J</span><div><strong>Jane Studio</strong><small>Private publishing terminal</small></div></div>
        <div class="login-copy">
          <p class="eyebrow">Owner access</p>
          <h1>Open the archive.</h1>
          <p>Enter a fine-grained GitHub token with read and write access to <b>${REPO}</b>. The key clears when the app closes.</p>
        </div>
        <form id="login-form" class="login-form">
          <label><span>Session key</span><input id="token" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…" required /></label>
          <button class="primary" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Verifying…' : 'Enter studio'}</button>
        </form>
        ${noticeView()}
        <div class="terminal-line"><i></i><span>Repository lock: ${OWNER}</span></div>
      </section>
      <aside class="login-visual" aria-hidden="true"><div class="scope"><i></i><i></i><i></i><span>JC</span></div><p>CONTENT / INDEX / DEPLOY</p></aside>
    </main>
  `
}

function studioView() {
  const count = state.content?.entries?.length || 0
  return `
    <div class="studio-shell">
      <header class="topbar">
        <div class="brand compact"><span>J</span><div><strong>Jane Studio</strong><small>${REPO}</small></div></div>
        <div class="top-actions"><span class="sync-state"><i></i>${count} records</span><button class="quiet" data-action="reload">Sync</button><button class="quiet" data-action="logout">Lock</button></div>
      </header>
      <nav class="tabs">
        <button data-tab="library" class="${state.tab === 'library' ? 'active' : ''}">Library</button>
        <button data-tab="editor" class="${state.tab === 'editor' ? 'active' : ''}">${state.editingId ? 'Edit record' : 'New record'}</button>
        <button data-tab="site" class="${state.tab === 'site' ? 'active' : ''}">Site</button>
      </nav>
      <main class="workspace">
        ${state.tab === 'library' ? libraryView() : ''}
        ${state.tab === 'editor' ? editorView() : ''}
        ${state.tab === 'site' ? siteView() : ''}
      </main>
      ${noticeView()}
      ${state.busy ? `<div class="busy"><div></div><span>Publishing</span></div>` : ''}
    </div>
  `
}

function libraryView() {
  const entries = [...(state.content?.entries || [])].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  return `
    <section class="screen">
      <header class="screen-head"><div><p class="eyebrow">Public records</p><h1>Library</h1></div><button class="primary small" data-action="new">New record</button></header>
      ${entries.length ? `<div class="record-list">${entries.map(recordRow).join('')}</div>` : `<div class="zero"><span>00</span><h2>The archive is empty.</h2><p>Create the first public record.</p><button class="primary small" data-action="new">New record</button></div>`}
    </section>
  `
}

function recordRow(entry) {
  return `
    <article class="record ${entry.published === false ? 'draft' : ''}">
      <div class="record-symbol">${glyph(entry.kind)}</div>
      <div class="record-main"><div class="record-meta"><span>${label(entry.kind)}</span><span>${entry.date || 'Undated'}</span>${entry.published === false ? '<b>Hidden</b>' : ''}</div><h2>${escapeHTML(entry.title)}</h2><p>${escapeHTML(entry.summary || 'No summary')}</p></div>
      <div class="record-actions"><button data-edit="${escapeAttribute(entry.id)}">Edit</button><button class="danger" data-remove="${escapeAttribute(entry.id)}">Remove</button></div>
    </article>
  `
}

function editorView() {
  const entry = state.editingId
    ? state.content.entries.find((item) => item.id === state.editingId)
    : blankEntry()
  const media = entry?.media || []
  return `
    <section class="screen editor-screen">
      <header class="screen-head"><div><p class="eyebrow">${state.editingId ? 'Editing' : 'New object'}</p><h1>${state.editingId ? escapeHTML(entry.title) : 'Create record'}</h1></div>${state.editingId ? '<button class="quiet" data-action="duplicate">Duplicate</button>' : ''}</header>
      <form id="entry-form" class="editor-form">
        <div class="form-grid">
          <label><span>Discipline</span><select name="kind">${['writing','music','photography','games','journal'].map((kind) => `<option value="${kind}" ${entry.kind === kind ? 'selected' : ''}>${label(kind)}</option>`).join('')}</select></label>
          <label><span>Date</span><input name="date" type="date" value="${escapeAttribute(entry.date || today())}" required /></label>
          <label class="wide"><span>Title</span><input name="title" value="${escapeAttribute(entry.title || '')}" placeholder="Title" required /></label>
          <label class="wide"><span>Summary</span><textarea name="summary" rows="3" placeholder="A concise public description">${escapeHTML(entry.summary || '')}</textarea></label>
          <label class="wide"><span>Body</span><textarea name="body" rows="15" placeholder="Markdown is supported">${escapeHTML(entry.body || '')}</textarea></label>
          <label><span>Tags</span><input name="tags" value="${escapeAttribute((entry.tags || []).join(', '))}" placeholder="fiction, systems" /></label>
          <label><span>External link</span><input name="href" type="url" value="${escapeAttribute(entry.href || '')}" placeholder="https://" /></label>
          <label class="wide"><span>Cover path or URL</span><input name="cover" value="${escapeAttribute(entry.cover || '')}" placeholder="media/photography/image.jpg" /></label>
        </div>
        <section class="upload-section">
          <div><p class="eyebrow">Media</p><h2>Attach files</h2></div>
          <label class="drop-zone"><input id="files" type="file" multiple /><span>Choose images, audio, documents, or builds</span><small>Up to 45 MB per file</small></label>
          <div id="pending-files" class="file-list">${state.uploadFiles.map((file, index) => `<div><span>${escapeHTML(file.name)}</span><b>${fileSize(file.size)}</b><button type="button" data-drop-file="${index}">×</button></div>`).join('')}</div>
          ${media.length ? `<div class="existing-media"><span>Attached</span>${media.map((item) => `<div><span>${escapeHTML(item.name || item.url || item)}</span><button type="button" data-remove-media="${escapeAttribute(item.url || item)}">Remove</button></div>`).join('')}</div>` : ''}
        </section>
        <div class="switches">
          <label><input name="featured" type="checkbox" ${entry.featured ? 'checked' : ''}/><span>Feature on home</span></label>
          <label><input name="published" type="checkbox" ${entry.published !== false ? 'checked' : ''}/><span>Public</span></label>
        </div>
        <div class="form-actions"><button type="button" class="quiet" data-action="cancel-edit">Cancel</button><button class="primary" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Publishing…' : 'Publish changes'}</button></div>
      </form>
    </section>
  `
}

function siteView() {
  const site = state.content?.site || {}
  return `
    <section class="screen editor-screen">
      <header class="screen-head"><div><p class="eyebrow">Identity</p><h1>Site settings</h1></div></header>
      <form id="site-form" class="editor-form site-form">
        <div class="form-grid">
          <label><span>Name</span><input name="name" value="${escapeAttribute(site.name || 'Jane Co.')}" required /></label>
          <label><span>Archive label</span><input name="location" value="${escapeAttribute(site.location || '')}" /></label>
          <label class="wide"><span>Tagline</span><input name="tagline" value="${escapeAttribute(site.tagline || '')}" required /></label>
          <label class="wide"><span>Introduction</span><textarea name="intro" rows="5">${escapeHTML(site.intro || '')}</textarea></label>
          <label class="wide"><span>Public email</span><input name="email" type="email" value="${escapeAttribute(site.email || '')}" placeholder="Optional" /></label>
        </div>
        <div class="form-actions"><span></span><button class="primary" ${state.busy ? 'disabled' : ''}>Save site</button></div>
      </form>
    </section>
  `
}

function noticeView() {
  if (!state.notice) return ''
  return `<div class="notice ${state.notice.type || ''}"><span>${escapeHTML(state.notice.message)}</span><button data-action="dismiss">×</button></div>`
}

function bind() {
  document.querySelector('#login-form')?.addEventListener('submit', login)
  document.querySelector('#entry-form')?.addEventListener('submit', saveEntry)
  document.querySelector('#site-form')?.addEventListener('submit', saveSite)
  document.querySelector('#files')?.addEventListener('change', pickFiles)

  document.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => {
    state.tab = button.dataset.tab
    if (state.tab === 'editor' && !state.editingId) state.uploadFiles = []
    render()
  }))
  document.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => edit(button.dataset.edit)))
  document.querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', () => removeEntry(button.dataset.remove)))
  document.querySelectorAll('[data-drop-file]').forEach((button) => button.addEventListener('click', () => {
    state.uploadFiles.splice(Number(button.dataset.dropFile), 1)
    render()
  }))
  document.querySelectorAll('[data-remove-media]').forEach((button) => button.addEventListener('click', () => removeMedia(button.dataset.removeMedia)))
  document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => action(button.dataset.action)))
}

async function login(event) {
  event.preventDefault()
  const token = document.querySelector('#token').value.trim()
  if (!token) return
  setBusy(true)
  try {
    const user = await api('/user', {}, token)
    if (user.login !== OWNER) throw new Error(`This studio is locked to ${OWNER}.`)
    state.token = token
    state.user = user
    await loadContent()
    state.notice = { type: 'success', message: 'Archive connected.' }
  } catch (error) {
    state.token = ''
    state.user = null
    state.notice = { type: 'error', message: error.message }
  }
  setBusy(false)
}

async function loadContent() {
  const file = await api(`/repos/${REPO}/contents/${CONTENT_PATH}`)
  state.contentSha = file.sha
  state.content = JSON.parse(decodeBase64(file.content))
  state.content.entries ||= []
  state.content.site ||= {}
}

async function saveEntry(event) {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  const current = state.editingId ? state.content.entries.find((item) => item.id === state.editingId) : blankEntry()
  const entry = {
    ...current,
    id: current.id || makeId(form.get('title')),
    kind: form.get('kind'),
    title: form.get('title').trim(),
    summary: form.get('summary').trim(),
    body: form.get('body').trim(),
    date: form.get('date'),
    tags: form.get('tags').split(',').map((tag) => tag.trim()).filter(Boolean),
    href: form.get('href').trim(),
    cover: form.get('cover').trim(),
    featured: form.get('featured') === 'on',
    published: form.get('published') === 'on',
    media: [...(current.media || [])]
  }

  if (!entry.title) return showNotice('A title is required.', 'error')
  setBusy(true)
  try {
    const uploaded = []
    for (const file of state.uploadFiles) {
      if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name} is larger than 45 MB.`)
      uploaded.push(await uploadFile(file, entry.kind, entry.id))
    }
    entry.media.push(...uploaded)
    if (!entry.cover) {
      const firstImage = uploaded.find((item) => item.type.startsWith('image/'))
      if (firstImage) entry.cover = firstImage.url
    }

    const index = state.content.entries.findIndex((item) => item.id === entry.id)
    if (index >= 0) state.content.entries[index] = entry
    else state.content.entries.push(entry)

    await writeContent(state.editingId ? `Update ${entry.title}` : `Add ${entry.title}`)
    state.editingId = null
    state.uploadFiles = []
    state.tab = 'library'
    showNotice('Published. The site will refresh after deployment.', 'success')
  } catch (error) {
    showNotice(error.message, 'error')
  }
  setBusy(false)
}

async function saveSite(event) {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  state.content.site = {
    name: form.get('name').trim(),
    location: form.get('location').trim(),
    tagline: form.get('tagline').trim(),
    intro: form.get('intro').trim(),
    email: form.get('email').trim()
  }
  setBusy(true)
  try {
    await writeContent('Update site identity')
    showNotice('Site settings published.', 'success')
  } catch (error) {
    showNotice(error.message, 'error')
  }
  setBusy(false)
}

async function uploadFile(file, kind, entryId) {
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'file'
  const path = `public/media/${kind}/${entryId}-${Date.now()}-${safeName}`
  const content = await fileToBase64(file)
  await api(`/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({ message: `Add ${file.name}`, content })
  })
  return { name: file.name, url: path.replace(/^public\//, ''), type: file.type || 'application/octet-stream', size: file.size }
}

async function writeContent(message) {
  const result = await api(`/repos/${REPO}/contents/${CONTENT_PATH}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: encodeBase64(JSON.stringify(state.content, null, 2) + '\n'),
      sha: state.contentSha
    })
  })
  state.contentSha = result.content.sha
}

async function removeEntry(id) {
  const entry = state.content.entries.find((item) => item.id === id)
  if (!entry || !confirm(`Remove “${entry.title}” from the public index?`)) return
  setBusy(true)
  try {
    state.content.entries = state.content.entries.filter((item) => item.id !== id)
    await writeContent(`Remove ${entry.title}`)
    showNotice('Record removed.', 'success')
  } catch (error) {
    showNotice(error.message, 'error')
  }
  setBusy(false)
}

function removeMedia(url) {
  if (!state.editingId) return
  const entry = state.content.entries.find((item) => item.id === state.editingId)
  entry.media = (entry.media || []).filter((item) => (item.url || item) !== url)
  if (entry.cover === url) entry.cover = ''
  render()
}

function edit(id) {
  state.editingId = id
  state.uploadFiles = []
  state.tab = 'editor'
  render()
}

function pickFiles(event) {
  const selected = [...event.target.files]
  const oversized = selected.find((file) => file.size > MAX_FILE_SIZE)
  if (oversized) return showNotice(`${oversized.name} is larger than 45 MB.`, 'error')
  state.uploadFiles.push(...selected)
  render()
}

async function action(name) {
  if (name === 'new') {
    state.editingId = null
    state.uploadFiles = []
    state.tab = 'editor'
    render()
  }
  if (name === 'cancel-edit') {
    state.editingId = null
    state.uploadFiles = []
    state.tab = 'library'
    render()
  }
  if (name === 'duplicate' && state.editingId) {
    const source = state.content.entries.find((item) => item.id === state.editingId)
    const copy = { ...structuredClone(source), id: `${source.id}-copy-${Date.now()}`, title: `${source.title} copy`, published: false }
    state.content.entries.push(copy)
    state.editingId = copy.id
    render()
  }
  if (name === 'reload') {
    setBusy(true)
    try { await loadContent(); showNotice('Archive synchronized.', 'success') } catch (error) { showNotice(error.message, 'error') }
    setBusy(false)
  }
  if (name === 'logout') {
    state.token = ''
    state.user = null
    state.content = null
    state.notice = null
    render()
  }
  if (name === 'dismiss') { state.notice = null; render() }
}

async function api(path, options = {}, token = state.token) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  })
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`
    try { message = (await response.json()).message || message } catch {}
    throw new Error(message)
  }
  return response.status === 204 ? null : response.json()
}

function setBusy(value) { state.busy = value; render() }
function showNotice(message, type = '') { state.notice = { message, type }; render() }
function blankEntry() { return { id: '', kind: 'writing', title: '', summary: '', body: '', date: today(), tags: [], href: '', cover: '', featured: false, published: true, media: [] } }
function today() { return new Date().toISOString().slice(0, 10) }
function makeId(title) { return `${String(title).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'record'}-${Date.now().toString(36)}` }
function glyph(kind) { return ({ writing: '¶', music: '∿', photography: '◫', games: '◇', journal: '↯' })[kind] || '·' }
function label(kind) { return ({ writing: 'Writing', music: 'Music', photography: 'Photography', games: 'Games', journal: 'Journal' })[kind] || 'Record' }
function fileSize(bytes) { if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`; return `${(bytes / 1024 / 1024).toFixed(1)} MB` }
function fileToBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file) }) }
function encodeBase64(value) { const bytes = new TextEncoder().encode(value); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(binary) }
function decodeBase64(value) { const binary = atob(value.replace(/\n/g, '')); const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); return new TextDecoder().decode(bytes) }
function escapeHTML(value = '') { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]) }
function escapeAttribute(value = '') { return escapeHTML(value).replace(/`/g, '&#96;') }
