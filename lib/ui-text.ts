import type { TKey } from "./dict";

/** Store text the admin can change (Admin → Storefront). Everything else uses the dictionary. */
export const EDITABLE_TEXT: { group: { my: string; en: string }; items: { key: TKey; label: { my: string; en: string }; hint?: { my: string; en: string }; long?: boolean }[] }[] = [
  {
    group: { my: "Banner", en: "Banner" },
    items: [
      {
        key: "home.heroTitle",
        label: { my: "ခေါင်းစဉ်", en: "Headline" },
        hint: { my: "စာကြောင်း ၂ ကြောင်း — ဒုတိယစာကြောင်းက အဝါရောင် ပေါ်မယ်", en: "Two lines — the second line is shown in yellow" },
        long: true,
      },
      { key: "home.heroSub", label: { my: "ဖော်ပြချက်", en: "Description" }, long: true },
      { key: "home.topUpNow", label: { my: "ပထမ ခလုတ်", en: "Main button" } },
      { key: "home.track", label: { my: "ဒုတိယ ခလုတ်", en: "Second button" } },
    ],
  },
  {
    group: { my: "Menu (navigation)", en: "Menu (navigation)" },
    items: [
      { key: "nav.store", label: { my: "ဆိုင် tab", en: "Store tab" } },
      { key: "nav.hub", label: { my: "Hub tab", en: "Hub tab" } },
      { key: "nav.jobs", label: { my: "Jobs tab", en: "Jobs tab" } },
      { key: "nav.account", label: { my: "အကောင့် tab", en: "Account tab" } },
    ],
  },
  {
    group: { my: "Home စာမျက်နှာ ခေါင်းစဉ်များ", en: "Home page headings" },
    items: [
      { key: "home.categories", label: { my: "အမျိုးအစား ခေါင်းစဉ်", en: "Categories heading" } },
      { key: "store.bundles", label: { my: "Toolkit ခေါင်းစဉ်", en: "Toolkits heading" } },
      { key: "store.products", label: { my: "Product အားလုံး ခေါင်းစဉ်", en: "All products heading" } },
      { key: "home.howTitle", label: { my: "ဝယ်ယူပုံ ခေါင်းစဉ်", en: "How-it-works heading" } },
      { key: "home.step1", label: { my: "ဝယ်ယူပုံ — အဆင့် ၁", en: "How it works — step 1" } },
      { key: "home.step2", label: { my: "ဝယ်ယူပုံ — အဆင့် ၂", en: "How it works — step 2" } },
      { key: "home.step3", label: { my: "ဝယ်ယူပုံ — အဆင့် ၃", en: "How it works — step 3" } },
      { key: "home.weAccept", label: { my: "\"လက်ခံသော ငွေပေးချေမှု\" စာ", en: "\"We accept\" label" } },
    ],
  },
  {
    group: { my: "Hub နဲ့ Job Board", en: "Hub and Job Board" },
    items: [
      { key: "hub.title", label: { my: "Hub ခေါင်းစဉ်", en: "Hub title" } },
      { key: "hub.sub", label: { my: "Hub ဖော်ပြချက်", en: "Hub description" }, long: true },
      { key: "jobs.title", label: { my: "Job Board ခေါင်းစဉ်", en: "Job Board title" } },
      { key: "jobs.sub", label: { my: "Job Board ဖော်ပြချက်", en: "Job Board description" }, long: true },
    ],
  },
  {
    group: { my: "Footer (အောက်ခြေ)", en: "Footer" },
    items: [
      { key: "footer.about", label: { my: "ဆိုင်အကြောင်း စာသား", en: "About text" }, long: true },
      { key: "footer.store", label: { my: "Menu ခေါင်းစဉ်", en: "Menu heading" } },
      { key: "footer.contact", label: { my: "ဆက်သွယ်ရန် ခေါင်းစဉ်", en: "Contact heading" } },
      { key: "footer.copyright", label: { my: "အောက်ဆုံးစာကြောင်း", en: "Bottom line" }, hint: { my: "{year} နေရာမှာ ခုနှစ် အလိုအလျောက် ဝင်မယ်", en: "{year} becomes the current year" } },
    ],
  },
];
