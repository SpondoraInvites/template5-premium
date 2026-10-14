// ─────────────────────────────────────────────────────────────────────────────
// CENTRAL WEDDING CONFIGURATION — edit this file only.
// All visible text (English + Bengali), event timing, venue and audio settings.
// The names, messages and date below are SAMPLE DATA — replace before use.
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  // Event timing — IANA timezone plus explicit offset in the ISO string.
  event: {
    iso: '2026-12-11T16:00:00+06:00', // SAMPLE: Friday 11 December 2026, 4:00 PM
    endIso: '2026-12-11T18:00:00+06:00', // used only for the calendar link
    timezone: 'Asia/Dhaka',
  },

  venue: {
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Lakeshore+Hotel+Gulshan+Dhaka',
    mapEmbed: 'https://www.google.com/maps?q=Lakeshore+Hotel+Gulshan+Dhaka&output=embed',
  },

  // RSVP destinations — SAMPLE DATA. The form opens WhatsApp with a pre-filled
  // reply; the email link is the fallback channel.
  rsvp: {
    whatsapp: '8801000000000', // SAMPLE: international format, no + or dashes
    email: 'rsvp@example.com', // SAMPLE
  },

  // Background music — the user-supplied track (assets/audio/music.mp3),
  // started on the visitor's first gesture, looped, volume-faded, preference
  // persisted. See assets/audio/PROVENANCE.md.
  audio: {
    ready: true,
    src: 'assets/audio/music.mp3',
    volume: 0.5, // soft background level
    provenance: 'assets/audio/PROVENANCE.md',
  },

  locales: ['en', 'bn'],
  defaultLocale: 'en',

  i18n: {
    en: {
      'doc.title': 'Ayesha & Imran — Wedding Invitation',

      // Cover
      'cover.familyLine': 'With the blessings of their families',
      'cover.name1': 'Ayesha',
      'cover.name2': 'Imran',
      'cover.and': '&',
      'cover.cue': 'Tap to open the invitation',
      'control.skip': 'Skip',
      'control.skipAria': 'Skip the opening animation',
      'control.replay': 'Replay opening',
      'control.replayAria': 'Replay the opening animation (development mode)',

      // Hero
      'hero.invocation': 'In the name of Allah, the Most Gracious, the Most Merciful',
      'hero.announce': 'Together with their families',
      'hero.invite': 'joyfully invite you to celebrate their wedding',
      'hero.name1': 'Ayesha Rahman',
      'hero.name2': 'Imran Karim',
      'hero.dateNote': 'Save the date',
      'scroll.cue': 'Scroll',

      // Our story
      'story.heading': 'Our Story',
      'story.m1.date': '2021',
      'story.m1.title': 'The First Hello',
      'story.m1.text': 'A chance meeting at a family gathering — one conversation that neither of us wanted to end.',
      'story.m2.date': '2023',
      'story.m2.title': 'The Decision',
      'story.m2.text': 'With our families’ blessings, we said yes to a lifetime of growing together in faith and friendship.',
      'story.m3.date': '2026',
      'story.m3.title': 'The Beginning',
      'story.m3.text': 'Now, surrounded by the people we love, we prepare to begin our new life — and we want you there.',

      // Celebration message
      'message.heading': 'A Celebration of Love',
      'message.p1': '“And among His signs is that He created for you spouses from among yourselves, that you may find tranquility in them; and He placed between you affection and mercy.” — Qur’an 30:21',
      'message.p2': 'Please join us as we begin this new chapter surrounded by the people we hold dearest.',

      // Gallery — placeholder photos in assets/gallery/, replace with your own
      'gallery.heading': 'Moments & Memories',
      'gallery.intro': 'A few glimpses of us and of the details we love.',
      'gallery.alt1': 'Bridal bouquet of ivory roses and blue delphinium with a navy ribbon',
      'gallery.alt2': 'Gold wedding rings on ivory silk with blue flowers',
      'gallery.alt3': 'Wedding invitation card with a navy ribbon and botanicals',
      'gallery.alt4': 'White hydrangea and blue delphinium centerpiece',
      'gallery.alt5': 'Ornate teacup with dates and blue flowers',
      'gallery.alt6': 'Ceremony aisle with white petals and blue floral arrangements',

      // Lightbox
      'lightbox.close': 'Close',
      'lightbox.prev': 'Previous photo',
      'lightbox.next': 'Next photo',

      // Music
      'audio.play': 'Play background music',
      'audio.pause': 'Pause background music',

      // Details
      'details.heading': 'When & Where',
      'details.dateLabel': 'Date',
      'details.timeLabel': 'Time',
      'details.venueLabel': 'Venue',
      'details.addressLabel': 'Address',
      'details.venueName': 'Lakeshore Grand Ballroom',
      'details.venueAddress': 'Plot 12, Gulshan Avenue, Dhaka 1212, Bangladesh',
      'details.calendarCta': 'Add to Google Calendar',
      'details.eventTitle': 'Wedding of Ayesha & Imran',

      // Countdown
      'countdown.heading': 'Counting Down',
      'countdown.fallback': 'To the day we say Alhamdulillah',
      'countdown.days': 'Days',
      'countdown.hours': 'Hours',
      'countdown.minutes': 'Minutes',
      'countdown.seconds': 'Seconds',
      'countdown.aria': 'Countdown to the wedding ceremony',

      // Maps
      'venue.heading': 'Getting There',
      'venue.intro': 'The celebration takes place at the heart of Gulshan, Dhaka.',
      'venue.mapCta': 'Open in Google Maps',
      'venue.mapTitle': 'Map of the venue',

      // Share
      'share.button': 'Share this invitation',
      'share.copy': 'Copy link',
      'share.copied': 'Link copied!',
      'share.whatsapp': 'WhatsApp',
      'share.messenger': 'Messenger',
      'share.telegram': 'Telegram',
      'share.email': 'Email',

      // RSVP
      'rsvp.heading': 'Will You Join Us?',
      'rsvp.deadline': 'Kindly respond by 20 November 2026',
      'rsvp.nameLabel': 'Your name',
      'rsvp.namePlaceholder': 'Full name',
      'rsvp.attendLabel': 'Will you attend?',
      'rsvp.accept': 'Joyfully accept',
      'rsvp.decline': 'Regretfully decline',
      'rsvp.guestsLabel': 'Number of guests',
      'rsvp.g1': '1 guest',
      'rsvp.g2': '2 guests',
      'rsvp.g3': '3 guests',
      'rsvp.g4': '4 or more guests',
      'rsvp.noteLabel': 'A note for us (optional)',
      'rsvp.notePlaceholder': 'Wishes, dietary needs, questions…',
      'rsvp.submit': 'Send via WhatsApp',
      'rsvp.emailAlt': 'or reply by email',
      'rsvp.errorName': 'Please tell us your name',

      // Closing
      'closing.heading': 'With Heartfelt Gratitude',
      'closing.p1': 'Your presence and prayers are the greatest gift. We look forward to celebrating with you.',
      'closing.signoff': 'Ayesha & Imran',

      // Footer
      'footer.instagram': 'Spondora Invites on Instagram',
      'footer.facebook': 'Spondora Invites on Facebook',
      'footer.made': 'Crafted with ❤️ — Spondora Invites',
    },

    bn: {
      'doc.title': 'আয়েশা ও ইমরান — বিয়ের আমন্ত্রণ',

      'cover.familyLine': 'উভয় পরিবারের আশীর্বাদে',
      'cover.name1': 'আয়েশা',
      'cover.name2': 'ইমরান',
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

      // Our story
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

      // Gallery — placeholder photos in assets/gallery/, replace with your own
      'gallery.heading': 'মুহূর্ত ও স্মৃতি',
      'gallery.intro': 'আমাদের কিছু মুহূর্ত আর প্রিয় খুঁটিনাটির ঝলক।',
      'gallery.alt1': 'নেভি ফিতাসহ অফদুধ সাদা গোলাপ ও নীল ডেলফিনিয়ামের ফুলের তোড়া',
      'gallery.alt2': 'অফদুধ রেশমের ওপর সোনালি বিয়ের আংটি ও নীল ফুল',
      'gallery.alt3': 'নেভি ফিতা ও ফুল সাজানো বিয়ের আমন্ত্রণ কার্ড',
      'gallery.alt4': 'সাদা হাইড্রেঞ্জা ও নীল ডেলফিনিয়ামের সাজ',
      'gallery.alt5': 'খেজুর ও নীল ফুলসহ অলংকৃত কাপ',
      'gallery.alt6': 'সাদা পাপড়ি ও নীল ফুলে সাজানো অনুষ্ঠানের পথ',

      // Lightbox
      'lightbox.close': 'বন্ধ করুন',
      'lightbox.prev': 'আগের ছবি',
      'lightbox.next': 'পরের ছবি',

      // Music
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

      // Share
      'share.button': 'আমন্ত্রণটি শেয়ার করুন',
      'share.copy': 'লিংক কপি করুন',
      'share.copied': 'লিংক কপি হয়েছে!',
      'share.whatsapp': 'হোয়াটসঅ্যাপ',
      'share.messenger': 'মেসেঞ্জার',
      'share.telegram': 'টেলিগ্রাম',
      'share.email': 'ইমেইল',

      // RSVP
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
      'rsvp.emailAlt': 'অথবা ইমেইলে জানান',
      'rsvp.errorName': 'অনুগ্রহ করে আপনার নাম লিখুন',

      'closing.heading': 'আন্তরিক কৃতজ্ঞতা',
      'closing.p1': 'আপনাদের উপস্থিতি ও দোয়াই আমাদের শ্রেষ্ঠ উপহার। আপনাদের সঙ্গে আনন্দ ভাগ করে নেওয়ার অপেক্ষায় রইলাম।',
      'closing.signoff': 'আয়েশা ও ইমরান',

      // Footer
      'footer.instagram': 'ইনস্টাগ্রামে স্পন্দোরা ইনভাইটস',
      'footer.facebook': 'ফেসবুকে স্পন্দোরা ইনভাইটস',
      'footer.made': '❤️ দিয়ে নির্মিত — স্পন্দোরা ইনভাইটস',
    },
  },
}
