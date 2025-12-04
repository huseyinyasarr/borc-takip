# 🚀 GitHub Pages Deploy - Hızlı Başlangıç

## 1️⃣ GitHub Secrets Ekle (ZORUNLU)

Repository > Settings > Secrets and variables > Actions > New repository secret

Şu 6 secret'ı ekle (`.env` dosyandaki değerler):

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

## 2️⃣ GitHub Pages'i Aktifleştir

Settings > Pages > Source: **GitHub Actions** seç

## 3️⃣ Firebase'e Domain Ekle

Firebase Console > Authentication > Settings > Authorized domains

Ekleyeceğin domain: `KULLANICI_ADINIZ.github.io`

## 4️⃣ Deploy Et

```bash
git add .
git commit -m "Deploy hazırlığı"
git push origin main
```

veya

Actions > Deploy to GitHub Pages > Run workflow

## ✅ Site URL'niz

`https://KULLANICI_ADINIZ.github.io/borc-takip`

---

📖 **Detaylı rehber:** `GITHUB_PAGES_DEPLOY.md` dosyasına bakın

