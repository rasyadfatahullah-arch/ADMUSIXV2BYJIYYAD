# ADMUSIXV2

**Music streaming & download web app** — by **jiyyad tools**

## Fitur

- 🔍 **Cari lagu** (judul / artis)
- 🏠 **Rekomendasi harian** (Pagi / Siang / Sore / Malam)
- 🎵 **Jelajah** artis, album & genre populer
- ❤️ **Favorit** (tersimpan di browser)
- ▶️ **Putar lagu** langsung di browser
- 📝 **Lirik tersinkron** (mengikuti progress lagu)
- ⬇️ **Download MP3**
- 🎨 **3 tema**:
  - **ArchiveTune** — dark archival gold
  - **Liquid Glass** — glassmorphism cyan
  - **Apple Musik** — Apple Music style red/black

## Cara pakai

1. Buka `index.html` di browser (atau serve dengan static server)
2. Untuk development lokal:

```bash
npx serve .
# atau
python -m http.server 8080
```

## API yang dipakai

| Endpoint | Sumber |
|----------|--------|
| Search / Feed / Lyrics | `https://lehzzmusify.vercel.app` |
| Download / Stream MP3 | `https://api.fuku.eu.cc/api/ytmp3` |

API key default ada di `app.js` (ganti jika perlu di https://api.fuku.eu.cc).

## Struktur

```
admusixv2/
├── index.html
├── styles.css
├── app.js
└── README.md
```

## Catatan

- Playback mengandalkan link download dari Fuku API (bisa diputar langsung).
- Favorit disimpan di `localStorage`.
- Tema tersimpan di browser.
- Responsive (mobile + desktop).

---

© jiyyad tools — ADMUSIXV2
