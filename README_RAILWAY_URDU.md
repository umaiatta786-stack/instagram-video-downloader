# Railway deploy guide (Urdu)

## GitHub پر اپلوڈ
1. GitHub کھولیں اور `+` > `New repository` دبائیں۔
2. نام رکھیں `instagram-video-downloader`، Public یا Private منتخب کریں، پھر Create repository دبائیں۔
3. `Add file` > `Upload files` کھولیں۔ اس ZIP کو اپنے کمپیوٹر پر extract کریں اور اندر کی تمام فائلیں/فولڈرز upload کریں۔ ZIP خود upload نہ کریں۔ Hidden files مثلاً `.dockerignore` بھی شامل کریں اگر دکھائی دیں۔
4. نیچے `Commit changes` دبائیں۔ Root پر `Dockerfile`, `package.json`, `server.js`, `index.html` اور `public/` موجود ہونے چاہئیں۔

## Railway پر deploy
1. Railway میں New Project > GitHub Repository منتخب کریں۔
2. GitHub repository منتخب کریں اور deploy ہونے دیں۔ Railway کو Dockerfile مل جائے گا، جو Node.js، Python، FFmpeg اور yt-dlp انسٹال کرتا ہے۔
3. Service کھولیں > Settings > Networking (یا Public Networking) > Generate Domain دبائیں۔
4. Logs میں دیکھیں کہ build اور start کامیاب ہیں۔ پھر generated domain کھول کر ٹیسٹ کریں۔

## اہم حدود
- API key درکار نہیں۔ کوئی Instagram login/cookies/proxy یا anti-bot bypass شامل نہیں ہے۔
- صرف وہ public posts کام کریں گی جن کی media سرور کو Instagram سے دستیاب ہو۔ Instagram automated access روک سکتا ہے، اس لیے ہر Reel کی کامیابی کی ضمانت نہیں۔
- Railway پر usage/credit/billing کی شرائط اپنے account میں ضرور دیکھیں۔
- یہ package backend کی deployment کے لیے تیار ہے، لیکن live Instagram media retrieval اس وقت تک verified نہیں جب تک اسے Railway پر deploy کرکے حقیقی public URL سے ٹیسٹ نہ کیا جائے۔
