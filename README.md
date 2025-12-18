# Arena Run 🎥

منصة خاصة لرفع وعرض الفيديوهات مع حماية متقدمة وتتبع المشاهدات.

## المميزات

- 🔐 تسجيل دخول عبر Discord OAuth
- 👮‍♂️ التحقق من العضوية في سيرفر Discord ورتبة Deputy
- 🚫 منع مشاركة روابط الفيديو (Signed Playback)
- 🎥 رفع فيديوهات كبيرة (حتى 2GB+) بطريقة Resumable
- 🧠 تحويل وضغط الفيديو تلقائيًا (Cloudflare Stream)
- 🏷️ علامة مائية ديناميكية متحركة
- 🕵️‍♂️ تتبع المشاهدات والجلسات
- 🔔 تنبيهات تلقائية إلى Discord

## التقنيات

- **Frontend**: React + TypeScript + TailwindCSS
- **Backend**: Netlify Functions (TypeScript)
- **Database**: Supabase (PostgreSQL)
- **Video**: Cloudflare Stream
- **Auth**: Discord OAuth2

## التثبيت

### 1. استنساخ المشروع

```bash
git clone <repo-url>
cd arena-run
npm install
```

### 2. إعداد Supabase

1. أنشئ مشروع جديد في [Supabase](https://supabase.com)
2. انسخ محتوى `supabase/schema.sql` وشغّله في SQL Editor
3. احصل على URL و Service Role Key

### 3. إعداد Discord App

1. اذهب إلى [Discord Developer Portal](https://discord.com/developers/applications)
2. أنشئ تطبيق جديد
3. في OAuth2:
   - أضف Redirect URI: `http://localhost:8888/.netlify/functions/auth-callback`
   - احصل على Client ID و Client Secret
4. أنشئ Bot واحصل على Token
5. أضف Bot إلى السيرفر مع صلاحية `guilds.members.read`

### 4. إعداد Cloudflare Stream

1. اذهب إلى [Cloudflare Dashboard](https://dash.cloudflare.com)
2. اختر Stream
3. احصل على Account ID و API Token

### 5. إعداد المتغيرات البيئية

انسخ `.env.example` إلى `.env` واملأ القيم:

```bash
cp .env.example .env
```

### 6. تشغيل المشروع

```bash
npm run netlify
```

## المتغيرات البيئية

| المتغير | الوصف |
|---------|-------|
| `DISCORD_CLIENT_ID` | Discord App Client ID |
| `DISCORD_CLIENT_SECRET` | Discord App Client Secret |
| `DISCORD_REDIRECT_URI` | OAuth Callback URL |
| `DISCORD_BOT_TOKEN` | Discord Bot Token |
| `DISCORD_GUILD_ID` | Server ID |
| `DISCORD_REQUIRED_ROLE_ID` | Deputy Role ID |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key |
| `CF_ACCOUNT_ID` | Cloudflare Account ID |
| `CF_STREAM_API_TOKEN` | Cloudflare Stream API Token |
| `JWT_SECRET` | Secret key for JWT tokens |

## هيكل المشروع

```
arena-run/
├── src/
│   ├── components/     # React components
│   ├── context/        # React context (Auth)
│   ├── lib/            # API & Supabase clients
│   ├── pages/          # Page components
│   └── types/          # TypeScript types
├── netlify/
│   └── functions/      # Serverless functions
├── supabase/
│   └── schema.sql      # Database schema
└── public/             # Static assets
```

## الاستخدام

### للمستخدمين
1. سجّل دخولك عبر Discord
2. تصفح الفيديوهات المتاحة
3. شاهد الفيديو (ستظهر علامة مائية فريدة)

### للمشرفين
1. ارفع ملف CSV للأعضاء المصرح لهم
2. ارفع فيديوهات جديدة
3. انشر الفيديوهات عندما تكون جاهزة
4. راقب التنبيهات الأمنية

## الأمان

- لا يوجد رابط مباشر للفيديو
- التوكن مؤقت ويتجدد
- العلامة المائية تمنع التسريب
- كل مشاهدة قابلة للتتبع
- تنبيهات تلقائية للنشاط المشبوه

## الترخيص

MIT License
