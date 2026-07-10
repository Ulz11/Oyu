/* Oyu · API client */
const API = {
  onUnauthorized: null,   // app.js оноож өгнө — 401 ирвэл нэвтрэх дэлгэц рүү

  async _check(r) {
    if (r.status === 401 && API.onUnauthorized) {
      API.onUnauthorized();
      throw new Error('unauthorized');
    }
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async _get(url) {
    return API._check(await fetch(url));
  },
  async _post(url, body) {
    return API._check(await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }));
  },

  login:  (username, password) => API._post('/api/auth/login', { username, password }),
  logout: () => fetch('/api/auth/logout', { method: 'POST' }).then(r => r.json()),
  me:     () => API._get('/api/auth/me'),

  rooms:      () => API._get('/api/rooms'),
  room:       (id) => API._get(`/api/rooms/${id}`),
  lesson:     (id) => API._get(`/api/lessons/${id}`),
  submitEx:   (lesson_id, answers) => API._post('/api/exercises/submit', { lesson_id, answers }),
  exam:       (room) => API._get(`/api/exam/${room}`),
  submitExam: (room, answers) => API._post('/api/exam/submit', { room, answers }),
  graph:      (room) => API._get(`/api/graph/${room}`),
  progress:   () => API._get('/api/progress'),
  files:      () => API._get('/api/files'),
  async upload(file, room = 'general') {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('room', room);
    return API._check(await fetch('/api/files', { method: 'POST', body: fd }));
  },
  deleteFile: (id) => fetch(`/api/files/${id}`, { method: 'DELETE' }).then(r => API._check(r)),
  notes:      () => API._get('/api/notes'),
  saveNote:   (note) => API._post('/api/notes', note),
  deleteNote: (id) => fetch(`/api/notes/${id}`, { method: 'DELETE' }).then(r => API._check(r)),

  packs:       () => API._get('/api/packs'),
  srsDue:      () => API._get('/api/srs/due'),
  srsAnswer:   (card_key, grade) => API._post('/api/srs/answer', { card_key, grade }),
  obamaList:   () => API._get('/api/obama'),
  obamaUnread: () => API._get('/api/obama/unread'),
  obamaCreate: (item) => API._post('/api/obama', item),
  obamaReadAll: () => fetch('/api/obama/read-all', { method: 'POST' }).then(r => API._check(r)),
  obamaRead:   (id) => fetch(`/api/obama/${id}/read`, { method: 'POST' }).then(r => API._check(r)),
  obamaDone:   (id) => fetch(`/api/obama/${id}/done`, { method: 'POST' }).then(r => API._check(r)),
  obamaDelete: (id) => fetch(`/api/obama/${id}`, { method: 'DELETE' }).then(r => API._check(r)),
};
