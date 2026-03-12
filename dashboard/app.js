const { API_BASE_URL, ADMIN_KEY } = window.DASHBOARD_CONFIG;
const state = { view: 'overview', data: null, editing: null };
const app = document.getElementById('app');
const pageTitle = document.getElementById('pageTitle');
const dialog = document.getElementById('editorDialog');
const formFields = document.getElementById('formFields');
const dialogTitle = document.getElementById('dialogTitle');

document.querySelectorAll('.nav-item').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    state.view = button.dataset.view;
    pageTitle.textContent = button.textContent;
    render();
  });
});

document.getElementById('refreshBtn').addEventListener('click', bootstrap);

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': ADMIN_KEY,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

async function bootstrap() {
  state.data = await request('/api/admin/bootstrap');
  render();
}

function render() {
  if (!state.data) {
    app.innerHTML = `<div class="card"><p>Loading dashboard...</p></div>`;
    return;
  }
  if (state.view === 'overview') return renderOverview();
  if (state.view === 'feed') return renderFeed();
  if (state.view === 'sections') return renderSections();
  if (state.view === 'media') return renderMedia();
  if (state.view === 'push') return renderPush();
}

function renderOverview() {
  app.innerHTML = `
    <div class="grid cards-4">
      <div class="card"><div class="muted">Feed posts</div><div class="metric">${state.data.feedItems.length}</div></div>
      <div class="card"><div class="muted">Media items</div><div class="metric">${state.data.mediaLibrary.length}</div></div>
      <div class="card"><div class="muted">Section groups</div><div class="metric">${Object.keys(state.data.sections).length}</div></div>
      <div class="card"><div class="muted">Push sent</div><div class="metric">${state.data.pushNotifications.length}</div></div>
    </div>
    <div class="grid" style="grid-template-columns: 1.6fr 1fr; margin-top: 18px; gap:18px;">
      <div class="card">
        <div class="toolbar"><h3>Latest feed posts</h3><button class="primary-btn" onclick="openFeedEditor()">New post</button></div>
        <div class="list">
          ${state.data.feedItems.slice(0,4).map(renderFeedRow).join('')}
        </div>
      </div>
      <div class="card">
        <h3>Feed section text</h3>
        <p><strong>${state.data.sections.feed.title}</strong></p>
        <p class="muted">${state.data.sections.feed.subtitle}</p>
      </div>
    </div>`;
}

function renderFeed() {
  app.innerHTML = `
    <div class="card">
      <div class="toolbar"><div><h2>Feed management</h2><p class="muted">The app listens to these items through /api/feed.</p></div><button class="primary-btn" onclick="openFeedEditor()">Add feed item</button></div>
      <div class="list">${state.data.feedItems.map(renderFeedRow).join('')}</div>
    </div>`;
}

function renderFeedRow(item) {
  const preview = item.media?.[0]?.thumbnail || item.media?.[0]?.url || 'https://placehold.co/200x200?text=Feed';
  return `
    <div class="feed-item">
      <img class="avatar" src="${item.authorAvatar}" alt="${item.authorName}" />
      <div>
        <div class="row"><strong>${item.authorName}</strong><span class="tag">${item.category}</span></div>
        <div class="meta">@${item.authorHandle} · ${new Date(item.publishedAt).toLocaleString()}</div>
        <p class="body">${item.body}</p>
        <div class="meta">❤ ${item.likes || 0} · 💬 ${item.comments || 0} · 🔁 ${item.reposts || 0}</div>
      </div>
      <div style="display:grid; gap:10px; justify-items:end;">
        <img class="thumb" src="${preview}" alt="preview" />
        <div class="row" style="gap:8px;">
          <button class="ghost-btn" onclick="openFeedEditor('${item.id}')">Edit</button>
          <button class="danger-btn" onclick="deleteFeedItem('${item.id}')">Delete</button>
        </div>
      </div>
    </div>`;
}

function renderSections() {
  const sections = Object.entries(state.data.sections).map(([key, value]) => `
    <div class="card">
      <div class="row"><h3 style="margin:0">${key}</h3><button class="ghost-btn" onclick="openSectionEditor('${key}')">Edit</button></div>
      <p><strong>${value.title}</strong></p>
      <p class="muted">${value.subtitle}</p>
    </div>`).join('');
  app.innerHTML = `<div class="grid">${sections}</div>`;
}

function renderMedia() {
  app.innerHTML = `
    <div class="card">
      <div class="toolbar"><div><h2>Media library</h2><p class="muted">Store image URLs to use inside feed posts and hero sections.</p></div><button class="primary-btn" onclick="openMediaEditor()">Add media</button></div>
      <div class="grid cards-4">
        ${state.data.mediaLibrary.map((item) => `
          <div class="card">
            <img class="thumb" style="width:100%;height:180px" src="${item.url}" alt="${item.title}" />
            <h3>${item.title}</h3>
            <p class="muted">${item.type}</p>
          </div>`).join('')}
      </div>
    </div>`;
}

function renderPush() {
  const logs = state.data.pushNotifications.slice(0, 6).map((item) => `<div class="card"><strong>${item.title}</strong><p>${item.body}</p><p class="muted">${new Date(item.sentAt).toLocaleString()} · ${item.target}</p></div>`).join('');
  app.innerHTML = `
    <div class="grid" style="grid-template-columns: 1.1fr .9fr; gap:18px;">
      <div class="card">
        <h2>Send push notification</h2>
        <p class="muted">If Expo tokens are configured on the API, this endpoint will fan out the push.</p>
        <div class="form-grid" style="margin-top:16px;">
          <div class="full"><label>Title</label><input id="pushTitle" placeholder="Race Weekend is live" /></div>
          <div class="full"><label>Body</label><textarea id="pushBody" placeholder="Tap to open the latest feed updates."></textarea></div>
          <div><label>Target</label><select id="pushTarget"><option value="all">All users</option><option value="drivers">Drivers fans</option><option value="teams">Teams fans</option></select></div>
        </div>
        <button class="primary-btn" onclick="sendPush()">Send notification</button>
      </div>
      <div class="grid">${logs || '<div class="card"><p class="muted">No notifications sent yet.</p></div>'}</div>
    </div>`;
}

function openFeedEditor(id = null) {
  state.editing = id ? state.data.feedItems.find((item) => item.id === id) : null;
  const item = state.editing || {
    authorName: '', authorHandle: '', authorAvatar: '', body: '', category: 'official', publishedAt: new Date().toISOString(), likes: 0, comments: 0, reposts: 0, sourceUrl: '', verified: true, media: [{ type: 'image', url: '' }]
  };
  dialogTitle.textContent = id ? 'Edit feed item' : 'New feed item';
  formFields.innerHTML = `
    <div><label>Author name</label><input id="authorName" value="${item.authorName || ''}" /></div>
    <div><label>Handle</label><input id="authorHandle" value="${item.authorHandle || ''}" /></div>
    <div><label>Avatar URL</label><input id="authorAvatar" value="${item.authorAvatar || ''}" /></div>
    <div><label>Category</label><select id="category"><option value="official">official</option><option value="teams">teams</option><option value="drivers">drivers</option><option value="media">media</option></select></div>
    <div class="full"><label>Body</label><textarea id="body">${item.body || ''}</textarea></div>
    <div><label>Media URL</label><input id="mediaUrl" value="${item.media?.[0]?.url || ''}" /></div>
    <div><label>Source URL</label><input id="sourceUrl" value="${item.sourceUrl || ''}" /></div>
    <div><label>Published at</label><input id="publishedAt" value="${new Date(item.publishedAt).toISOString().slice(0,16)}" type="datetime-local" /></div>
    <div><label>Verified</label><select id="verified"><option value="true">true</option><option value="false">false</option></select></div>
  `;
  formFields.querySelector('#category').value = item.category;
  formFields.querySelector('#verified').value = String(item.verified ?? true);
  document.getElementById('saveBtn').onclick = saveFeedItem;
  dialog.showModal();
}

async function saveFeedItem(event) {
  event.preventDefault();
  const payload = {
    authorName: document.getElementById('authorName').value,
    authorHandle: document.getElementById('authorHandle').value,
    authorAvatar: document.getElementById('authorAvatar').value,
    body: document.getElementById('body').value,
    category: document.getElementById('category').value,
    publishedAt: new Date(document.getElementById('publishedAt').value).toISOString(),
    verified: document.getElementById('verified').value === 'true',
    sourceUrl: document.getElementById('sourceUrl').value,
    media: document.getElementById('mediaUrl').value ? [{ type: 'image', url: document.getElementById('mediaUrl').value }] : [],
  };
  if (state.editing) await request(`/api/admin/feed/${state.editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
  else await request('/api/admin/feed', { method: 'POST', body: JSON.stringify(payload) });
  dialog.close();
  await bootstrap();
  state.view = 'feed';
}

async function deleteFeedItem(id) {
  await request(`/api/admin/feed/${id}`, { method: 'DELETE' });
  await bootstrap();
}

function openSectionEditor(key) {
  const section = state.data.sections[key];
  dialogTitle.textContent = `Edit ${key} section`;
  formFields.innerHTML = `
    <div class="full"><label>Title</label><input id="sectionTitle" value="${section.title}" /></div>
    <div class="full"><label>Subtitle</label><textarea id="sectionSubtitle">${section.subtitle}</textarea></div>
  `;
  document.getElementById('saveBtn').onclick = async (event) => {
    event.preventDefault();
    await request('/api/admin/sections', {
      method: 'PUT',
      body: JSON.stringify({ [key]: { title: document.getElementById('sectionTitle').value, subtitle: document.getElementById('sectionSubtitle').value } })
    });
    dialog.close();
    await bootstrap();
    state.view = 'sections';
  };
  dialog.showModal();
}

function openMediaEditor() {
  dialogTitle.textContent = 'Add media item';
  formFields.innerHTML = `
    <div class="full"><label>Title</label><input id="mediaTitle" /></div>
    <div><label>Type</label><select id="mediaType"><option value="image">image</option><option value="video">video</option></select></div>
    <div><label>Media URL</label><input id="mediaItemUrl" /></div>
  `;
  document.getElementById('saveBtn').onclick = async (event) => {
    event.preventDefault();
    await request('/api/admin/media', {
      method: 'POST',
      body: JSON.stringify({ title: document.getElementById('mediaTitle').value, type: document.getElementById('mediaType').value, url: document.getElementById('mediaItemUrl').value })
    });
    dialog.close();
    await bootstrap();
    state.view = 'media';
  };
  dialog.showModal();
}

async function sendPush() {
  await request('/api/admin/push', {
    method: 'POST',
    body: JSON.stringify({
      title: document.getElementById('pushTitle').value,
      body: document.getElementById('pushBody').value,
      target: document.getElementById('pushTarget').value,
    }),
  });
  await bootstrap();
  state.view = 'push';
  render();
}

bootstrap().catch((error) => {
  app.innerHTML = `<div class="card"><h3>Dashboard connection failed</h3><p class="muted">${error.message}</p><p class="muted">Set the right API URL in dashboard/config.js and make sure dashboard-api is running.</p></div>`;
});

window.openFeedEditor = openFeedEditor;
window.deleteFeedItem = deleteFeedItem;
window.openSectionEditor = openSectionEditor;
window.openMediaEditor = openMediaEditor;
window.sendPush = sendPush;
