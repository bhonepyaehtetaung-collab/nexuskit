# NexusKit — setup after the security update

ဒီ update ပြီးရင် အောက်က အဆင့်တွေကို **တစ်ကြိမ်** လုပ်ရပါမယ်။

## 1. Database ကို လုံခြုံအောင်လုပ်ပါ (မဖြစ်မနေ)

1. Supabase Dashboard → **Table editor → team_members** ထဲမှာ သင့် email ရှိပြီး `role` က `super_admin` ဖြစ်နေတာ သေချာပါစေ။
   (မရှိရင် admin panel ထဲ ဝင်လို့ မရတော့ပါဘူး။)
2. **Authentication → Providers → Email** မှာ **Confirm email** ကို ON ထားပါ။
3. **SQL Editor → New query** ထဲကို `supabase/security.sql` ဖိုင်တစ်ခုလုံး paste လုပ်ပြီး **Run** နှိပ်ပါ။
   - အမှားတစ်ခုခု ရှိရင် ဘာမှ မပြောင်းလဲပါဘူး (transaction)။ Error message ကို ပို့ပေးပါ။
4. **Authentication → URL Configuration → Redirect URLs** ထဲမှာ ဒါတွေ ထည့်ပါ:
   - `http://localhost:3000/my-account`
   - `http://localhost:3000/admin/login`
   - Live domain ရရင်: `https://YOUR-DOMAIN/my-account`, `https://YOUR-DOMAIN/admin/login`

## 2. `.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=...        # (ရှိပြီးသား)
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # (ရှိပြီးသား)
TELEGRAM_BOT_TOKEN=...              # (ရှိပြီးသား — NEXT_PUBLIC_ မထည့်ရ)
TELEGRAM_CHAT_ID=...                # (ရှိပြီးသား)
```

`NEXT_PUBLIC_` နဲ့ စတဲ့ variable တွေက browser ထဲ ရောက်သွားပါတယ်။ Secret (bot token, service role key) တွေကို `NEXT_PUBLIC_` နဲ့ ဘယ်တော့မှ မပေးပါနဲ့။

Live တင်တဲ့ hosting (Vercel စသည်) ရဲ့ Environment Variables မှာလည်း ဒီ ၄ ခုကို ထည့်ပါ။

## 3. စမ်းကြည့်ပါ

```
npm run dev
```

- [ ] Shop → Cart ထဲထည့် → Checkout → "Pay after setup" နဲ့ order တင်ကြည့်ပါ → Telegram message ရောက်လား
- [ ] Payment method တစ်ခုရွေးပြီး screenshot တင်ကာ order တင်ကြည့်ပါ
- [ ] `/admin` → order ကိုဖွင့်ပြီး slip ပုံ ပေါ်လား စစ်ပါ
- [ ] Customer email နဲ့ `/my-account` ကို ဝင်ပြီး ကိုယ့် order ပဲ မြင်ရလား စစ်ပါ
- [ ] Admin မဟုတ်တဲ့ account နဲ့ `/admin` ကို ဝင်ကြည့်ပါ → login page ကို ပြန်ရောက်ရပါမယ်

## 4. Team members

Admin → Team မှာ email + role ထည့်ရုံပါပဲ။ Member အသစ်က `/admin/login` → **Email link** နဲ့ ပထမဆုံးအကြိမ် ဝင်ပါမယ်။

| Role | ဘာလုပ်လို့ရလဲ |
|---|---|
| editor | Orders, products, promo codes, customers |
| manager | + Overview (sales summary) |
| super_admin | အားလုံး + team, settings, payment methods |

## 5. ဖိုင်ဟောင်းများ

Update မတိုင်ခင်က တင်ထားတဲ့ payment slip တွေက public `products` bucket ထဲမှာ `slip_` နဲ့ စတဲ့ နာမည်နဲ့ ကျန်နေပါသေးတယ်။ စစ်ပြီးရင် Storage → products ကနေ ဖျက်ပါ (သို့) ရွှေ့ပါ။

## 6. Hub, Toolkit နဲ့ Jobs (feature အသစ်)

`supabase/security.sql` ပြီးမှ **`supabase/features.sql`** ကို SQL Editor မှာ အလားတူ run ပါ (Success. No rows returned ပေါ်ရမယ်)။

- **Admin → hub**: သတင်း/လမ်းညွှန်/promo post ရေးပြီး product တွေကို ချိတ်ပါ။ "Published" အမှန်ခြစ်မှ ပေါ်ပါမယ်။
- **Admin → bundles**: Product ၂ ခုအထက် ရွေးပြီး % လျှော့ကာ Toolkit ဖန်တီးပါ။ ဈေးကို database ကပဲ တွက်ပါတယ်။
- **Admin → jobs**: Customer တင်တဲ့ job post တွေကို Approve (၃၀ ရက်) / Reject လုပ်ပါ။
- Package အဖြစ် အုပ်စုဖွဲ့ချင်ရင် product နာမည်ရဲ့ ပထမစာလုံး တူအောင်ပေးပါ (ဥပမာ "Mobile Legend 86 Diamonds")။

## 7. AI Drafts (Product / Hub news / Job post)

AI က **draft** ပဲ ရေးပါတယ်။ သင် ✅ approve လုပ်မှ website ပေါ် တက်ပါတယ်။ ဝယ်ဈေးကို staff ပဲ မြင်ရပါတယ်။

1. **Database** — SQL Editor → New query → **`supabase/ai.sql`** အကုန် paste → Run။
2. **Anthropic API key** — <https://console.anthropic.com> → API Keys → Create key။ Billing မှာ credit အနည်းငယ် ထည့်ပါ။
3. **`.env.local`** ထဲကို ဒီ ၃ ကြောင်း ထည့်ပါ (Netlify → Site settings → Environment variables မှာလည်း အတူတူ ထည့်ပါ)။
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   SUPABASE_SERVICE_ROLE_KEY=...   # Supabase → Project Settings → API → service_role (secret)
   TELEGRAM_WEBHOOK_SECRET=...     # ကိုယ်တိုင်ပေးတဲ့ စာလုံး ၃၀ လောက် (A-Z a-z 0-9 _ -)
   ```
   ⚠️ ဒီ key တွေကို `NEXT_PUBLIC_` နဲ့ **မစ**ပါနဲ့၊ ဘယ်သူ့ကိုမှ မပြပါနဲ့။ ပြီးရင် `npm run dev` ကို ပြန်စပါ။
4. **Dashboard** — Admin → **AI Drafts**: Supplier ဈေးစာရင်း paste / screenshot တင် → "AI နဲ့ draft ရေးမယ်" → စစ်ပြီး **ဆိုင်ထဲ ထည့်မယ်**။
   အမြတ် % ကို ဒီစာမျက်နှာ "အမြတ် စည်းမျဉ်း" မှာ ပြောင်းပါ (default +20%, 100 Ks ပြည့်)။
5. **Telegram bot** (website ကို Netlify ပေါ် တင်ပြီးမှ) — Live site → Admin → Settings → **Bot ကို ချိတ်မယ်**။
   ပြီးရင် supplier bot ဆီက ဈေးစာရင်းကို ကိုယ့် bot ဆီ forward လုပ်ပါ။ `/job ...`၊ `/news` ပို့လို့ရပါတယ်။
   ကိုယ့် chat (`TELEGRAM_CHAT_ID`) ကလွဲပြီး တခြားသူ ပို့တာကို bot က လျစ်လျူရှုပါတယ်။

## 8. Sorting, Seasonal ပရိုမိုးရှင်း, နေ့စဉ် AI draft, Light mode

1. **Database** — SQL Editor → New query → **`supabase/promotions.sql`** အကုန် paste → Run (ထပ် run လည်း ရပါတယ်)။
2. **Product အစဉ်** — Admin → Products → **အစဉ်စီမယ်** → ↑↓ နဲ့ ရွှေ့ပါ။ Store ရဲ့ "အကြံပြု" sort က ဒီအစဉ်ကို သုံးပါတယ်။
   Customer တွေက အကြံပြု / လူကြိုက်အများဆုံး / အသစ်ဆုံး / ဈေးနည်း→များ / ဈေးများ→နည်း ရွေးလို့ရပါတယ်။
3. **Seasonal campaign** — Admin → **ပရိုမိုးရှင်း** → 🎉 Seasonal → Campaign အသစ်။ စ/ဆုံး ရက်၊ % နဲ့
   Product အားလုံး / Category / Product တချို့ ရွေးပါ။ ဈေးကို database (`create_order`) ကပဲ တွက်လို့ browser က ပြင်လို့ မရပါ။
   Combo (Toolkit) နဲ့ Promo code တွေလည်း ဒီ tab ထဲမှာ ရှိပါတယ်။
4. **နေ့စဉ် AI draft** — နေ့တိုင်း မနက် ၇:၁၅ (Netlify scheduled function `ai-daily`) မှာ Hub news ၃ ပုဒ် + Web က
   တကယ့် အလုပ်ခေါ်စာ ၃ ခုကို Claude Haiku 5.5 နဲ့ ရှာပြီး Telegram ကို ✅/❌ နဲ့ ပို့ပါတယ်။ ✅ နှိပ်မှ website ပေါ် တက်ပါတယ်။
   Admin → AI Drafts → "☀️ နေ့စဉ် AI draft" မှာ ဖွင့်/ပိတ်၊ အရေအတွက် ပြောင်းပြီး "အခု run မယ်" နှိပ်လို့ရပါတယ်။
   Telegram မှာ `/jobs` (ဒါမှမဟုတ် `/jobs designer`) ပို့ရင်လည်း ချက်ချင်း ရှာပေးပါတယ်။
   Model ပြောင်းချင်ရင် Netlify env `AI_DAILY_MODEL` (default `claude-haiku-5-5`)။
5. **Light mode** — Website ပေါ်က ☀/☾ ခလုတ်။ မနှိပ်ရသေးရင် ဖုန်းရဲ့ setting အတိုင်း ပြပါတယ်။
