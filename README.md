# Media QR - Direkt Medya Paylaşım Sistemi

Video veya görsel yükle → anında QR kod + link al.  
QR okutulunca (veya link açılınca) medya **direkt** açılır, ekstra tıklama yok.

## Özellikler

- Admin paneli ile kolay yükleme
- Resim (JPG, PNG, GIF, WebP...) ve Video (MP4, WebM...) desteği
- Otomatik benzersiz link + QR kod üretimi
- Netlify Blobs ile güvenli depolama (GitHub yerine önerilir)
- Mobil uyumlu, tam ekran oynatma

> **Not:** GitHub'a medya yüklemek teknik olarak mümkün olsa da dosya boyutu limiti (100MB), repo boyutu ve API rate limit yüzünden videolar için pratik değildir. Bu yüzden Netlify Blobs kullanılmıştır (ücretsiz ve medya için ideal).

## Kurulum (Netlify)

### 1. GitHub'a yükle

1. Bu klasörü bir GitHub deposuna push'la.
2. Netlify'a gir → **Add new site** → **Import an existing project**
3. GitHub deposunu seç.

### 2. Ortam Değişkenleri

Netlify Dashboard → Site settings → Environment variables:

| Key | Value | Açıklama |
|---|---|---|
| `ADMIN_PASSWORD` | `istedigin-sifre` | Admin paneli şifresi |
| `CLOUDINARY_CLOUD_NAME` | `senin-cloud-name` | Cloudinary bulut adı |
| `CLOUDINARY_API_KEY` | `...` | Cloudinary API anahtarı |
| `CLOUDINARY_API_SECRET` | `...` | Cloudinary API secret |

> Netlify Blobs sadece küçük metadata için kalır. Büyük medya dosyaları artık Cloudinary’ye yüklenir.

`ADMIN_PASSWORD` için `.env` dosyası oluşturabilirsin:

```
ADMIN_PASSWORD=admin123
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Deploy

Deploy sonrası site hazır.

- Ana sayfa: `https://senin-siten.netlify.app`
- Admin: `https://senin-siten.netlify.app/admin`

### 4. Kullanım

1. `/admin` adresine git
2. Şifreyi gir
3. Video veya görsel seç → Yükle
4. Çıkan QR'ı indir / linki kopyala
5. QR okutulunca medya direkt açılır

## Yerel Geliştirme

```bash
npm install
npx netlify dev
```

## Dosya Yapısı

```
media-qr-site/
├── netlify.toml
├── package.json
├── netlify/functions/
│   ├── upload.js      # Dosya yükleme + QR üretimi
│   └── media.js       # Medya servis etme
└── public/
    ├── index.html     # Ana sayfa
    ├── admin.html     # Yönetici paneli
    └── view.html      # Medya görüntüleme (QR/link hedefi)
```

## Limitler (Netlify Free)

- Function timeout: ~10 saniye
- Blobs: makul kullanım için yeterli
- Önerilen max dosya: 50MB (kodda sınırlı)

Büyük videolar için Cloudinary / Cloudflare R2 gibi harici storage önerilir.

## Lisans

MIT
