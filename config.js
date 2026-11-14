// ─────────────────────────────────────────────────────────────────────────────
// CENTRAL WEDDING CONFIGURATION — edit this file only.
// Canonical INVITE_CONFIG shape shared by every template. Bengali copy lives in
// INVITE_TRANSLATIONS below; js/i18n.js derives the flat ui keys it renders.
// The names, messages and date below are SAMPLE DATA — replace before use.
// ─────────────────────────────────────────────────────────────────────────────

const INVITE_CONFIG = {
  /* ── Couple ─────────────────────────────────────────────────────────────── */
  couple: {
    name1: 'Ayesha Rahman', // SAMPLE
    name2: 'Imran Karim', // SAMPLE
    initials: 'A · I', // monogram in the opening seal
    hashtag: '', // not displayed by this template
  },

  /* ── When ───────────────────────────────────────────────────────────────── */
  // Local time with an explicit offset. The countdown, the calendar link and
  // the displayed date/time all derive from these values.
  weddingDateTime: '2026-12-11T16:00:00+06:00', // SAMPLE: Friday 11 December 2026, 4:00 PM
  dateDisplay: 'Friday, December 11, 2026',
  city: 'Dhaka, Bangladesh',

  /* ── Opening blessing ───────────────────────────────────────────────────── */
  blessing: 'In the name of Allah, the Most Gracious, the Most Merciful',

  /* ── Families / welcome ─────────────────────────────────────────────────── */
  welcome: {
    eyebrow: 'With the blessings of their families',
    // Qur'an verse, then the invitation line. Two paragraphs split on a blank
    // line: the first renders as the blockquote, the rest below it.
    inviteLine:
      '“And among His signs is that He created for you spouses from among yourselves, that you may find tranquility in them; and He placed between you affection and mercy.” — Qur’an 30:21' +
      '\n\n' +
      'Please join us as we begin this new chapter surrounded by the people we hold dearest.',
  },

  /* ── Countdown ──────────────────────────────────────────────────────────── */
  countdownNote: 'To the day we say Alhamdulillah',

  /* ── Event ──────────────────────────────────────────────────────────────── */
  // One ceremony. cal* feed the Google Calendar link; date/time are display.
  events: [
    {
      tag: 'Wedding',
      name: 'Wedding of Ayesha & Imran',
      icon: 'rings',
      tagline: '',
      date: 'Friday, December 11, 2026',
      time: '4:00 PM',
      venue: 'Lakeshore Grand Ballroom',
      address: 'Plot 12, Gulshan Avenue, Dhaka 1212, Bangladesh',
      mapQuery: 'Lakeshore Hotel Gulshan Dhaka',
      calDate: '2026-12-11',
      calStart: '2026-12-11T16:00:00+06:00',
      calEnd: '2026-12-11T18:00:00+06:00',
      calTz: 'Asia/Dhaka',
    },
  ],

  /* ── Where ──────────────────────────────────────────────────────────────── */
  // The Maps search and embed URLs are built from mapQuery (js/i18n.js).
  venue: {
    name: 'Lakeshore Grand Ballroom',
    address: 'Plot 12, Gulshan Avenue, Dhaka 1212, Bangladesh',
    mapQuery: 'Lakeshore Hotel Gulshan Dhaka',
  },

  /* ── Our story ──────────────────────────────────────────────────────────── */
  story: {
    chapters: [
      {
        label: '2021',
        title: 'The First Hello',
        text: 'A chance meeting at a family gathering — one conversation that neither of us wanted to end.',
      },
      {
        label: '2023',
        title: 'The Decision',
        text: 'With our families’ blessings, we said yes to a lifetime of growing together in faith and friendship.',
      },
      {
        label: '2026',
        title: 'The Beginning',
        text: 'Now, surrounded by the people we love, we prepare to begin our new life — and we want you there.',
      },
    ],
  },

  /* ── Gallery ────────────────────────────────────────────────────────────── */
  // Placeholder photos in assets/gallery/, replace with your own.
  gallery: {
    photos: [
      { src: 'assets/gallery/gallery-1.jpg', alt: 'Bridal bouquet of ivory roses and blue delphinium with a navy ribbon' },
      { src: 'assets/gallery/gallery-2.jpg', alt: 'Gold wedding rings on ivory silk with blue flowers' },
      { src: 'assets/gallery/gallery-3.jpg', alt: 'Wedding invitation card with a navy ribbon and botanicals' },
      { src: 'assets/gallery/gallery-4.jpg', alt: 'White hydrangea and blue delphinium centerpiece' },
      { src: 'assets/gallery/gallery-5.jpg', alt: 'Ornate teacup with dates and blue flowers' },
      { src: 'assets/gallery/gallery-6.jpg', alt: 'Ceremony aisle with white petals and blue floral arrangements' },
    ],
  },

  /* ── Closing ────────────────────────────────────────────────────────────── */
  closing: 'Your presence and prayers are the greatest gift. We look forward to celebrating with you.',
  credit: 'Crafted with ❤️ — Spondora Invites',
  ogImage: 'assets/gallery/gallery-1.jpg',

  /* ── RSVP ───────────────────────────────────────────────────────────────── */
  // The form opens WhatsApp with a pre-filled reply; the endpoint is an
  // optional JSON destination used first when set.
  rsvp: {
    enabled: true,
    deadline: 'Kindly respond by 20 November 2026',
    whatsapp: '8801000000000', // SAMPLE: international format, no + or dashes
    endpoint: '',
  },

  /* ── Language ───────────────────────────────────────────────────────────── */
  // Languages come from the keys of INVITE_TRANSLATIONS; "en" is the config.
  localization: {
    enabled: true,
    default: 'en',
  },

  /* ── Background music ───────────────────────────────────────────────────── */
  // Started on the visitor's first gesture, looped, volume-faded, preference
  // persisted. See assets/audio/PROVENANCE.md.
  music: {
    enabled: true,
    src: 'assets/audio/music.mp3',
    volume: 0.5, // soft background level
  },

  /* ── Template-specific knobs, never read by the editor ──────────────────── */
  extras: {
    musicProvenance: 'assets/audio/PROVENANCE.md',
  },
}

/* ── Translations ───────────────────────────────────────────────────────────
   Keys mirror the flat ui keys js/i18n.js derives from INVITE_CONFIG for
   English. Anything omitted here falls back to English. */
const INVITE_TRANSLATIONS = {
  bn: {
    'doc.title': 'আয়েশা ও ইমরান — বিয়ের আমন্ত্রণ',

    'cover.familyLine': 'উভয় পরিবারের আশীর্বাদে',
    'cover.name1': 'আয়েশা রহমান',
    'cover.name2': 'ইমরান করিম',
    'cover.and': 'ও',
    'cover.cue': 'আমন্ত্রণ খুলতে ট্যাপ করুন',
    'control.skip': 'বাদ দিন',
    'control.skipAria': 'শুরুর অ্যানিমেশন বাদ দিন',
    'control.replay': 'আবার দেখুন',
    'control.replayAria': 'শুরুর অ্যানিমেশন আবার চালান (ডেভেলপমেন্ট মোড)',

    'hero.invocation': 'পরম করুণাময় অসীম দয়ালু আল্লাহর নামে',
    'hero.announce': 'উভয় পরিবারের পক্ষ থেকে',
    'hero.invite': 'আপনাদের বিয়ের অনুষ্ঠানে সাদরে আমন্ত্রণ জানাচ্ছি',
    'hero.name1': 'আয়েশা রহমান',
    'hero.name2': 'ইমরান করিম',
    'hero.dateNote': 'তারিখ মনে রাখুন',
    'scroll.cue': 'স্ক্রল করুন',

    'story.heading': 'আমাদের গল্প',
    'story.m1.date': '২০২১',
    'story.m1.title': 'প্রথম সাক্ষাৎ',
    'story.m1.text': 'এক পারিবারিক আড্ডায় হঠাৎ দেখা — এমন এক কথা, যা শেষ করতে দুজনেরই ভালো লাগছিল না।',
    'story.m2.date': '২০২৩',
    'story.m2.title': 'সিদ্ধান্ত',
    'story.m2.text': 'পরিবারের আশীর্বাদে ঈমান ও বন্ধুত্বের সঙ্গে জীবন গড়ে তোলার সিদ্ধান্ত নিলাম আমরা।',
    'story.m3.date': '২০২৬',
    'story.m3.title': 'নতুন শুরু',
    'story.m3.text': 'এখন প্রিয়জনদের মাঝে নতুন জীবনের প্রস্তুতি — এই আনন্দের দিনে আপনাদের পাশে চাই।',

    'message.heading': 'ভালোবাসার আয়োজন',
    'message.p1': '“তিনিই তোমাদের জন্য তোমাদের মধ্য থেকেই স্ত্রী সৃষ্টি করেছেন, যাতে তোমরা তাদের দ্বারা প্রশান্তি লাভ করো; এবং তোমাদের মধ্যে ভালোবাসা ও দয়া স্থাপন করেছেন।” — আল-কুরআন ৩০:২১',
    'message.p2': 'প্রিয়জনদের সান্নিধ্যে আমাদের নতুন জীবনের সূচনার আনন্দ ভাগাভাগি করে নিতে আপনাদের সাদরে আমন্ত্রণ।',

    'gallery.heading': 'মুহূর্ত ও স্মৃতি',
    'gallery.intro': 'আমাদের কিছু মুহূর্ত আর প্রিয় খুঁটিনাটির ঝলক।',
    'gallery.alt1': 'নেভি ফিতাসহ অফদুধ সাদা গোলাপ ও নীল ডেলফিনিয়ামের ফুলের তোড়া',
    'gallery.alt2': 'অফদুধ রেশমের ওপর সোনালি বিয়ের আংটি ও নীল ফুল',
    'gallery.alt3': 'নেভি ফিতা ও ফুল সাজানো বিয়ের আমন্ত্রণ কার্ড',
    'gallery.alt4': 'সাদা হাইড্রেঞ্জা ও নীল ডেলফিনিয়ামের সাজ',
    'gallery.alt5': 'খেজুর ও নীল ফুলসহ অলংকৃত কাপ',
    'gallery.alt6': 'সাদা পাপড়ি ও নীল ফুলে সাজানো অনুষ্ঠানের পথ',

    'lightbox.close': 'বন্ধ করুন',
    'lightbox.prev': 'আগের ছবি',
    'lightbox.next': 'পরের ছবি',

    'audio.play': 'ব্যাকগ্রাউন্ড মিউজিক চালু করুন',
    'audio.pause': 'ব্যাকগ্রাউন্ড মিউজিক বন্ধ করুন',

    'details.heading': 'কখন ও কোথায়',
    'details.dateLabel': 'তারিখ',
    'details.timeLabel': 'সময়',
    'details.venueLabel': 'স্থান',
    'details.addressLabel': 'ঠিকানা',
    'details.venueName': 'লেকশোর গ্র্যান্ড বলরুম',
    'details.venueAddress': 'প্লট ১২, গুলশান অ্যাভিনিউ, ঢাকা ১২১২, বাংলাদেশ',
    'details.calendarCta': 'গুগল ক্যালেন্ডারে যোগ করুন',
    'details.eventTitle': 'আয়েশা ও ইমরানের বিয়ের অনুষ্ঠান',

    'countdown.heading': 'বাকি সময়',
    'countdown.fallback': 'আমাদের বিশেষ দিন পর্যন্ত',
    'countdown.days': 'দিন',
    'countdown.hours': 'ঘণ্টা',
    'countdown.minutes': 'মিনিট',
    'countdown.seconds': 'সেকেন্ড',
    'countdown.aria': 'বিয়ের অনুষ্ঠানের বাকি সময়',

    'venue.heading': 'কীভাবে যাবেন',
    'venue.intro': 'অনুষ্ঠানটি অনুষ্ঠিত হবে ঢাকার গুলশানের প্রাণকেন্দ্রে।',
    'venue.mapCta': 'গুগল ম্যাপে খুলুন',
    'venue.mapTitle': 'ভেন্যুর ম্যাপ',

    'share.button': 'আমন্ত্রণটি শেয়ার করুন',
    'share.copy': 'লিংক কপি করুন',
    'share.copied': 'লিংক কপি হয়েছে!',
    'share.whatsapp': 'হোয়াটসঅ্যাপ',
    'share.messenger': 'মেসেঞ্জার',
    'share.telegram': 'টেলিগ্রাম',
    'share.email': 'ইমেইল',

    'rsvp.heading': 'আপনি কি আসছেন?',
    'rsvp.deadline': 'অনুগ্রহ করে ২০ নভেম্বর ২০২৬-এর মধ্যে জানান',
    'rsvp.nameLabel': 'আপনার নাম',
    'rsvp.namePlaceholder': 'পূর্ণ নাম',
    'rsvp.attendLabel': 'আপনি কি আসবেন?',
    'rsvp.accept': 'আসছি, ইন শা আল্লাহ',
    'rsvp.decline': 'আসতে পারব না',
    'rsvp.guestsLabel': 'অতিথির সংখ্যা',
    'rsvp.g1': '১ জন',
    'rsvp.g2': '২ জন',
    'rsvp.g3': '৩ জন',
    'rsvp.g4': '৪ বা তার বেশি',
    'rsvp.noteLabel': 'আমাদের জন্য কিছু বলতে চান (ঐচ্ছিক)',
    'rsvp.notePlaceholder': 'শুভেচ্ছা, খাবারের বিশেষ চাহিদা বা প্রশ্ন…',
    'rsvp.submit': 'হোয়াটসঅ্যাপে পাঠান',
    'rsvp.errorName': 'অনুগ্রহ করে আপনার নাম লিখুন',
    'rsvp.successMessage': 'ধন্যবাদ — আপনার উত্তরটি আমরা পেয়েছি।',
    'rsvp.sentMessage': 'আপনার উত্তরসহ WhatsApp খোলা হয়েছে — পাঠাতে Send চাপুন।',

    'closing.heading': 'আন্তরিক কৃতজ্ঞতা',
    'closing.p1': 'আপনাদের উপস্থিতি ও দোয়াই আমাদের শ্রেষ্ঠ উপহার। আপনাদের সঙ্গে আনন্দ ভাগ করে নেওয়ার অপেক্ষায় রইলাম।',
    'closing.signoff': 'আয়েশা ও ইমরান',

    'footer.instagram': 'ইনস্টাগ্রামে স্পন্দোরা ইনভাইটস',
    'footer.facebook': 'ফেসবুকে স্পন্দোরা ইনভাইটস',
    'footer.made': '❤️ দিয়ে নির্মিত — স্পন্দোরা ইনভাইটস',
  },
}

export { INVITE_CONFIG, INVITE_TRANSLATIONS }

/* ── Invite platform hook — identical in every template ────────────────────
   Publish:  the platform writes window.__INVITE_CONFIG__ before this file runs.
   Preview:  the editor passes #cfg=<url-encoded json>.
   Editing config.js by hand still works; this only overrides what it is given. */
(function (target) {
  if (!target || typeof window === "undefined") return;
  var patch = window.__INVITE_CONFIG__;
  if (!patch) {
    var m = /#cfg=(.*)$/.exec(location.hash);
    try { patch = m ? JSON.parse(decodeURIComponent(m[1])) : null; } catch (e) { patch = null; }
  }
  if (patch) Object.keys(patch).forEach(function (k) { target[k] = patch[k]; });
})(typeof INVITE_CONFIG !== "undefined" ? INVITE_CONFIG :
   typeof config !== "undefined" ? config : null);
