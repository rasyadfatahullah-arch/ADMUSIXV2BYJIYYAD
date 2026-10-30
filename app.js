/* ADMUSIXV2 — by jiyyad tools */
(function () {
  'use strict';

  const LEHZZ = 'https://lehzzmusify.vercel.app';
  const FUKU = 'https://api.fuku.eu.cc/api/ytmp3';
  const API_KEY = 'fukuxyz_3a9ea3';

  const ARTS = [
    'The Weeknd', 'Taylor Swift', 'Billie Eilish',
    'Bruno Mars', 'Olivia Rodrigo', 'Tulus',
    'Sheila On 7', 'NIKI', 'Ed Sheeran', 'Hindia'
  ];
  const ALBUMS = [
    'After Hours', 'Midnights', 'HIT ME HARD AND SOFT',
    '24K Magic', 'GUTS', 'Monokrom',
    'Kisah Klasik Untuk Masa Depan', 'Nicole',
    'Menari Dengan Bayangan'
  ];
  const GENRES = [
    'Pop', 'Synth-Pop', 'Indie', 'R&B',
    'Pop Rock', 'Hits Indonesia', 'Lo-Fi Chill',
    'Akustik Santai'
  ];

  // State
  let currentTracks = [];
  let currentIndex = -1;
  let queue = [];
  let favorites = loadFavorites();
  let feedData = null;
  let currentSlot = 'pagi';
  let syncedLyrics = [];
  let lyricsInterval = null;
  let isSeeking = false;

  // DOM
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const audio = $('#audio-el');
  const playerBar = $('#player-bar');
  const progressFill = $('#progress-fill');
  const timeDisplay = $('#time-display');
  const btnPlay = $('#btn-play');
  const lyricsOverlay = $('#lyrics-overlay');
  const lyricsBody = $('#lyrics-body');

  // ---------- Helpers ----------
  function loadFavorites() {
    try {
      return JSON.parse(localStorage.getItem('admusix_favs') || '[]');
    } catch { return []; }
  }
  function saveFavorites() {
    localStorage.setItem('admusix_favs', JSON.stringify(favorites));
  }
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2500);
  }
  function fmtTime(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  async function request(url, params = {}) {
    const u = new URL(url);
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
    const res = await fetch(u.toString(), {
      headers: { Accept: 'application/json', 'User-Agent': 'ADMUSIXV2/1.0' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  function getTracks(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.tracks)) return data.tracks;
    if (Array.isArray(data?.result)) return data.result;
    return [];
  }

  // ---------- Navigation ----------
  function switchPage(page) {
    $$('.page').forEach(p => p.classList.remove('active'));
    $(`#page-${page}`)?.classList.add('active');
    $$('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.page === page);
    });
    if (page === 'favorites') renderFavorites();
    if (page === 'home' && !feedData) loadFeed();
  }

  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchPage(btn.dataset.page));
  });

  // ---------- Theme ----------
  function setTheme(name) {
    document.body.className = `theme-${name}`;
    $$('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === name));
    localStorage.setItem('admusix_theme', name);
  }
  $$('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => setTheme(btn.dataset.theme));
  });
  setTheme(localStorage.getItem('admusix_theme') || 'archivetune');

  // ---------- Feed ----------
  async function loadFeed() {
    const grid = $('#feed-grid');
    grid.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Memuat rekomendasi...</p></div>';
    try {
      feedData = await request(`${LEHZZ}/api/feed`);
      renderFeed(currentSlot);
    } catch (e) {
      grid.innerHTML = `<div class="empty-state"><p>Gagal memuat feed: ${e.message}</p></div>`;
    }
  }

  function renderFeed(slot) {
    currentSlot = slot;
    $$('.time-tab').forEach(t => t.classList.toggle('active', t.dataset.slot === slot));
    const tracks = feedData?.[slot] || [];
    currentTracks = tracks;
    const grid = $('#feed-grid');
    if (!tracks.length) {
      grid.innerHTML = '<div class="empty-state"><p>Tidak ada rekomendasi untuk waktu ini</p></div>';
      return;
    }
    grid.innerHTML = tracks.map((t, i) => trackCardHTML(t, i)).join('');
    bindTrackCards(grid, tracks);
  }

  $$('.time-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (feedData) renderFeed(tab.dataset.slot);
    });
  });

  // ---------- Search ----------
  async function doSearch(q) {
    if (!q.trim()) return;
    const list = $('#search-results');
    list.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Mencari...</p></div>';
    try {
      const data = await request(`${LEHZZ}/api/search`, { q: q.trim() });
      const tracks = getTracks(data);
      currentTracks = tracks;
      if (!tracks.length) {
        list.innerHTML = '<div class="empty-state"><p>Lagu tidak ditemukan</p></div>';
        return;
      }
      list.innerHTML = tracks.map((t, i) => trackRowHTML(t, i)).join('');
      bindTrackRows(list, tracks);
    } catch (e) {
      list.innerHTML = `<div class="empty-state"><p>Error: ${e.message}</p></div>`;
    }
  }

  $('#search-btn').addEventListener('click', () => doSearch($('#search-input').value));
  $('#search-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch(e.target.value);
  });

  // ---------- Browse ----------
  function renderChips() {
    const make = (items, containerId) => {
      const el = $(`#${containerId}`);
      el.innerHTML = items.map(item =>
        `<button class="chip" data-q="${item}">${item}</button>`
      ).join('');
      el.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', async () => {
          switchPage('search');
          $('#search-input').value = chip.dataset.q;
          await doSearch(chip.dataset.q);
        });
      });
    };
    make(ARTS, 'artists-grid');
    make(ALBUMS, 'albums-grid');
    make(GENRES, 'genres-grid');
  }

  // ---------- Favorites ----------
  function isFav(song) {
    return favorites.some(f => f.id === song.id || f.youtubeId === song.youtubeId);
  }
  function toggleFav(song) {
    const idx = favorites.findIndex(f => f.id === song.id || f.youtubeId === song.youtubeId);
    if (idx >= 0) {
      favorites.splice(idx, 1);
      toast('Dihapus dari favorit');
    } else {
      favorites.push(song);
      toast('Ditambahkan ke favorit');
    }
    saveFavorites();
    updateFavButton();
    if ($('#page-favorites').classList.contains('active')) renderFavorites();
  }
  function renderFavorites() {
    const list = $('#favorites-list');
    if (!favorites.length) {
      list.innerHTML = `<div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        <p>Belum ada lagu favorit</p>
      </div>`;
      return;
    }
    currentTracks = favorites;
    list.innerHTML = favorites.map((t, i) => trackRowHTML(t, i)).join('');
    bindTrackRows(list, favorites);
  }
  function updateFavButton() {
    const song = queue[currentIndex];
    const btn = $('#btn-fav');
    if (!song) return;
    const filled = isFav(song);
    btn.querySelector('svg').setAttribute('fill', filled ? 'currentColor' : 'none');
    btn.style.color = filled ? 'var(--accent)' : '';
  }

  // ---------- HTML builders ----------
  function trackCardHTML(t, i) {
    const cover = t.coverUrl || `https://i.ytimg.com/vi/${t.youtubeId}/hqdefault.jpg`;
    return `<div class="track-card" data-idx="${i}">
      <div class="cover-wrap">
        <img src="${cover}" alt="" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23333%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22%23888%22 font-size=%2230%22>♪</text></svg>'" />
        <div class="play-overlay">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
      <div class="card-info">
        <div class="card-title">${esc(t.title)}</div>
        <div class="card-artist">${esc(t.artist)}</div>
      </div>
    </div>`;
  }
  function trackRowHTML(t, i) {
    const cover = t.coverUrl || `https://i.ytimg.com/vi/${t.youtubeId}/hqdefault.jpg`;
    const dur = t.duration ? fmtTime(t.duration) : '';
    return `<div class="track-row" data-idx="${i}">
      <img class="row-cover" src="${cover}" alt="" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22><rect fill=%22%23333%22 width=%2248%22 height=%2248%22/></svg>'" />
      <div class="row-meta">
        <div class="row-title">${esc(t.title)}</div>
        <div class="row-artist">${esc(t.artist)}</div>
      </div>
      <span class="row-duration">${dur}</span>
      <div class="row-actions">
        <button class="act-fav" title="Favorit" data-idx="${i}">
          <svg viewBox="0 0 24 24" fill="${isFav(t) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        </button>
        <button class="act-dl" title="Download" data-idx="${i}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
      </div>
    </div>`;
  }
  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function bindTrackCards(container, tracks) {
    container.querySelectorAll('.track-card').forEach(card => {
      card.addEventListener('click', () => {
        const i = +card.dataset.idx;
        playTrack(tracks, i);
      });
    });
  }
  function bindTrackRows(container, tracks) {
    container.querySelectorAll('.track-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.row-actions')) return;
        const i = +row.dataset.idx;
        playTrack(tracks, i);
      });
    });
    container.querySelectorAll('.act-fav').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFav(tracks[+btn.dataset.idx]);
        // refresh icon
        const svg = btn.querySelector('svg');
        svg.setAttribute('fill', isFav(tracks[+btn.dataset.idx]) ? 'currentColor' : 'none');
      });
    });
    container.querySelectorAll('.act-dl').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadTrack(tracks[+btn.dataset.idx]);
      });
    });
  }

  // ---------- Player ----------
  function playTrack(tracks, index) {
    queue = tracks;
    currentIndex = index;
    const song = queue[index];
    if (!song) return;

    const ytId = song.youtubeId || (song.id || '').replace('yt-', '');
    const cover = song.coverUrl || `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;

    $('#player-cover').src = cover;
    $('#player-title').textContent = song.title || 'Unknown';
    $('#player-artist').textContent = song.artist || '—';
    updateFavButton();

    // Highlight playing row
    $$('.track-row').forEach(r => r.classList.remove('playing'));
    $$(`[data-idx="${index}"]`).forEach(el => {
      if (el.classList.contains('track-row')) el.classList.add('playing');
    });

    // Use a free YouTube audio proxy / stream approach
    // Since we can't stream YouTube directly in browser easily without CORS,
    // we fetch a playable URL via the download API and play it.
    playViaDownload(song);
  }

  async function playViaDownload(song) {
    const ytId = song.youtubeId || (song.id || '').replace('yt-', '');
    const url = ytId
      ? `https://www.youtube.com/watch?v=${ytId}`
      : song.audioUrl;

    if (!url) {
      toast('URL lagu tidak tersedia');
      return;
    }

    toast('Menyiapkan audio...');
    try {
      // Try using a public stream proxy first for instant play
      // Fallback: get download link then play
      const streamUrl = await getPlayableUrl(url, song);
      if (!streamUrl) {
        toast('Gagal mendapatkan audio');
        return;
      }
      audio.src = streamUrl;
      audio.load();
      await audio.play();
      setPlayingUI(true);
      loadLyrics(song);
    } catch (err) {
      console.error(err);
      toast('Gagal memutar: ' + (err.message || 'error'));
      setPlayingUI(false);
    }
  }

  async function getPlayableUrl(ytUrl, song) {
    // Primary: Fuku API download link (works as playable URL)
    try {
      const data = await request(FUKU, { api: API_KEY, url: ytUrl });
      if (data.status && data.result?.download) {
        return data.result.download;
      }
    } catch (e) {
      console.warn('Fuku failed', e);
    }

    // Secondary: try common public converters / proxies (may fail due to CORS)
    // As last resort, we can't stream YouTube natively without a backend.
    // Show message.
    return null;
  }

  function setPlayingUI(playing) {
    const playIcon = btnPlay.querySelector('.icon-play');
    const pauseIcon = btnPlay.querySelector('.icon-pause');
    if (playing) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }
  }

  btnPlay.addEventListener('click', () => {
    if (!audio.src) {
      if (queue.length) playTrack(queue, currentIndex >= 0 ? currentIndex : 0);
      return;
    }
    if (audio.paused) {
      audio.play();
      setPlayingUI(true);
    } else {
      audio.pause();
      setPlayingUI(false);
    }
  });

  $('#btn-prev').addEventListener('click', () => {
    if (currentIndex > 0) playTrack(queue, currentIndex - 1);
  });
  $('#btn-next').addEventListener('click', () => {
    if (currentIndex < queue.length - 1) playTrack(queue, currentIndex + 1);
  });

  audio.addEventListener('timeupdate', () => {
    if (isSeeking || !audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    progressFill.style.width = pct + '%';
    timeDisplay.textContent = `${fmtTime(audio.currentTime)} / ${fmtTime(audio.duration)}`;
    updateSyncedLyrics(audio.currentTime);
  });
  audio.addEventListener('ended', () => {
    setPlayingUI(false);
    if (currentIndex < queue.length - 1) playTrack(queue, currentIndex + 1);
  });
  audio.addEventListener('play', () => setPlayingUI(true));
  audio.addEventListener('pause', () => setPlayingUI(false));

  // Seek
  $('.player-progress').addEventListener('click', (e) => {
    if (!audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
  });

  // ---------- Download ----------
  async function downloadTrack(song) {
    const ytId = song.youtubeId || (song.id || '').replace('yt-', '');
    const url = ytId
      ? `https://www.youtube.com/watch?v=${ytId}`
      : song.audioUrl;
    if (!url) {
      toast('URL tidak tersedia');
      return;
    }
    toast('Memproses download...');
    try {
      const data = await request(FUKU, { api: API_KEY, url });
      if (!data.status || !data.result?.download) {
        toast('Gagal mendapatkan link download');
        return;
      }
      const a = document.createElement('a');
      a.href = data.result.download;
      a.download = (data.result.filename || song.title || 'audio') + '.mp3';
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast('Download dimulai');
    } catch (e) {
      toast('Error download: ' + e.message);
    }
  }
  $('#btn-download').addEventListener('click', () => {
    const song = queue[currentIndex];
    if (song) downloadTrack(song);
    else toast('Tidak ada lagu yang diputar');
  });
  $('#btn-fav').addEventListener('click', () => {
    const song = queue[currentIndex];
    if (song) toggleFav(song);
  });

  // ---------- Lyrics ----------
  async function loadLyrics(song) {
    syncedLyrics = [];
    lyricsBody.innerHTML = '<div class="lyrics-loading">Memuat lirik...</div>';

    // Prefer lyrics already in the track object
    let text = song.lyrics || null;

    if (!text) {
      try {
        const data = await request(`${LEHZZ}/api/lyrics`, {
          track: song.title,
          artist: song.artist,
          duration: Math.round(song.duration || 0)
        });
        text = data.syncedLyrics || data.plainLyrics || null;
      } catch (e) {
        console.warn('lyrics api', e);
      }
    }

    if (!text) {
      lyricsBody.innerHTML = '<div class="lyrics-empty">Lirik tidak ditemukan</div>';
      return;
    }

    // Parse LRC-style
    const lines = text.split('\n').filter(Boolean);
    const parsed = [];
    const lrcRe = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)/;

    lines.forEach(line => {
      const m = line.match(lrcRe);
      if (m) {
        const min = parseInt(m[1], 10);
        const sec = parseInt(m[2], 10);
        const ms = m[3] ? parseInt(m[3].padEnd(3, '0').slice(0, 3), 10) : 0;
        const time = min * 60 + sec + ms / 1000;
        const content = m[4].trim();
        if (content) parsed.push({ time, text: content });
      } else if (line.trim() && !line.startsWith('[')) {
        parsed.push({ time: -1, text: line.trim() });
      }
    });

    if (parsed.length && parsed.some(p => p.time >= 0)) {
      syncedLyrics = parsed.filter(p => p.time >= 0);
      lyricsBody.innerHTML = syncedLyrics.map((l, i) =>
        `<div class="lyrics-line" data-i="${i}" data-t="${l.time}">${esc(l.text)}</div>`
      ).join('');
      // click to seek
      lyricsBody.querySelectorAll('.lyrics-line').forEach(el => {
        el.addEventListener('click', () => {
          const t = parseFloat(el.dataset.t);
          if (!isNaN(t) && audio.duration) audio.currentTime = t;
        });
      });
    } else {
      // plain lyrics
      lyricsBody.innerHTML = lines.map(l =>
        `<div class="lyrics-line">${esc(l.replace(/\[\d+:\d+(?:\.\d+)?\]/g, '').trim())}</div>`
      ).filter(h => h.includes('lyrics-line') && !h.endsWith('></div>')).join('') ||
        `<div class="lyrics-empty">${esc(text)}</div>`;
    }

    $('#lyrics-cover').src = song.coverUrl || `https://i.ytimg.com/vi/${song.youtubeId}/hqdefault.jpg`;
    $('#lyrics-title').textContent = song.title;
    $('#lyrics-artist').textContent = song.artist;
  }

  function updateSyncedLyrics(currentTime) {
    if (!syncedLyrics.length) return;
    let active = -1;
    for (let i = 0; i < syncedLyrics.length; i++) {
      if (syncedLyrics[i].time <= currentTime + 0.3) active = i;
      else break;
    }
    const lines = lyricsBody.querySelectorAll('.lyrics-line');
    lines.forEach((el, i) => {
      const was = el.classList.contains('active');
      el.classList.toggle('active', i === active);
      if (i === active && !was) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  $('#btn-lyrics').addEventListener('click', () => {
    if (!queue[currentIndex]) {
      toast('Pilih lagu dulu');
      return;
    }
    lyricsOverlay.classList.add('open');
  });
  $('#lyrics-close').addEventListener('click', () => {
    lyricsOverlay.classList.remove('open');
  });

  // ---------- Init ----------
  renderChips();
  loadFeed();
  switchPage('home');
})();
