import { ArticleIcon, BookIcon, EditIcon, FormatQuoteIcon, HeadlineIcon } from './components/icons';
import { Mode, ModeOption, PromptTagGroup } from './types';

export const MODES: ModeOption[] = [
  {
    id: Mode.GENERATE_HEADLINES,
    title: 'سازنده عنوان',
    description: 'ایجاد عناوین جذاب برای مقالات و پست‌ها',
    icon: HeadlineIcon,
    placeholder: 'موضوع مقاله خود را وارد کنید...',
    supportsThinkingMode: true,
    supportsSearchGrounding: true,
  },
  {
    id: Mode.FIND_POEMS,
    title: 'جستجوی شعر',
    description: 'پیدا کردن اشعار فارسی بر اساس موضوع',
    icon: BookIcon,
    placeholder: 'موضوعی مانند "بهار" یا "عشق" را وارد کنید...',
    supportsThinkingMode: true,
    supportsSearchGrounding: true,
  },
  {
    id: Mode.WRITE_ARTICLE,
    title: 'نویسنده مقاله',
    description: 'تولید متن ادبی منسجم در حدود ۲۵ خط (در صورت درخواست طولانی، بیشتر)',
    icon: ArticleIcon,
    placeholder: 'موضوع مقاله را برای نوشتن وارد کنید...',
    supportsThinkingMode: true,
    supportsSearchGrounding: true,
  },
  {
    id: Mode.REWRITE_TEXT,
    title: 'بازنویسی متن',
    description: 'بهبود و بازنویسی متون برای وضوح و جذابیت بیشتر',
    icon: EditIcon,
    placeholder: 'متنی را که می‌خواهید بازنویسی شود اینجا قرار دهید...',
    supportsThinkingMode: true,
    supportsSearchGrounding: false,
  },
  {
    id: Mode.FIND_PROVERBS,
    title: 'گوهر مازنی',
    description: 'یافتن ضرب‌المثل‌های مازندرانی (گویش مازنی) مرتبط با موضوعات',
    icon: FormatQuoteIcon,
    placeholder: 'موضوعی مانند "صبر" یا "دوستی" را وارد کنید...',
    supportsThinkingMode: true,
    supportsSearchGrounding: true, // This mode must use search grounding
  },
];

// Professional tag definitions for each mode - tailored for a professional Farsi writer
export const MODE_TAGS: Record<Mode, PromptTagGroup[]> = {
  [Mode.GENERATE_HEADLINES]: [
    {
      id: 'headline_style',
      label: 'سبک عنوان',
      tags: [
        {
          id: 'headline_informative',
          label: 'اطلاع‌رسانی مستقیم',
          description: 'عنوان خبری و مستقیم',
          promptFragment: 'عنوان‌ها باید به سبک خبری و اطلاع‌رسانی باشند، واضح و بدون ابهام، مثل عناوین روزنامه‌های جدی'
        },
        {
          id: 'headline_literary',
          label: 'ادبی و استعاره‌محور',
          description: 'عنوان با نثر ادبی',
          promptFragment: 'عنوان‌ها را با نثر ادبی، استعاره‌های زیبا و کنایه‌های ظریف بنویس، مناسب برای مجلات فرهنگی و ادبی'
        },
        {
          id: 'headline_question',
          label: 'پرسشی و تأمل‌برانگیز',
          description: 'عنوان به شکل پرسش',
          promptFragment: 'عنوان‌ها را به صورت پرسش‌های تأمل‌برانگیز و جذاب بنویس که خواننده را به فکر کردن وادار کنند'
        },
        {
          id: 'headline_list',
          label: 'فهرست‌محور',
          description: 'عنوان با فرمت لیست',
          promptFragment: 'عنوان‌ها را به سبک فهرست‌وار بنویس (مثلاً "۵ راه برای..."، "۱۰ نکتهٔ کلیدی...")، مناسب برای محتوای آموزشی'
        }
      ]
    },
    {
      id: 'headline_audience',
      label: 'مخاطب و رسانه',
      tags: [
        {
          id: 'audience_newspaper',
          label: 'روزنامه جدی',
          description: 'برای مطبوعات',
          promptFragment: 'عنوان‌ها مناسب روزنامه‌های جدی و خبری باشند، با لحن رسمی و حرفه‌ای'
        },
        {
          id: 'audience_magazine',
          label: 'مجله فرهنگی',
          description: 'برای نشریات فرهنگی',
          promptFragment: 'عنوان‌ها مناسب مجلات فرهنگی و تحلیلی باشند، با عمق بیشتر و لحن تأملی'
        },
        {
          id: 'audience_social',
          label: 'شبکه‌های اجتماعی',
          description: 'برای سوشال مدیا',
          promptFragment: 'عنوان‌ها جذاب، کوتاه و مناسب شبکه‌های اجتماعی باشند، با قدرت ویرال شدن بالا'
        },
        {
          id: 'audience_academic',
          label: 'مخاطب تخصصی',
          description: 'برای محیط دانشگاهی',
          promptFragment: 'عنوان‌ها با لحن علمی و دانشگاهی، مناسب برای مقالات تحقیقاتی و تخصصی'
        }
      ]
    },
    {
      id: 'headline_tone',
      label: 'لحن',
      tags: [
        {
          id: 'tone_formal',
          label: 'رسمی و جدی',
          description: 'لحن رسمی',
          promptFragment: 'لحن عنوان‌ها کاملاً رسمی، جدی و بی‌طرفانه باشد'
        },
        {
          id: 'tone_inspiring',
          label: 'الهام‌بخش',
          description: 'انگیزشی و مثبت',
          promptFragment: 'عنوان‌ها الهام‌بخش، انگیزشی و پر از امید باشند'
        },
        {
          id: 'tone_critical',
          label: 'انتقادی و تحلیلی',
          description: 'نقادانه',
          promptFragment: 'عنوان‌ها با لحن انتقادی، تحلیلی و پرسشگر باشند'
        },
        {
          id: 'tone_emotional',
          label: 'احساسی و تأثیرگذار',
          description: 'عاطفی',
          promptFragment: 'عنوان‌ها احساسی، تأثیرگذار و با قدرت جذب عاطفی بالا باشند'
        }
      ]
    }
  ],

  [Mode.FIND_POEMS]: [
    {
      id: 'poem_form',
      label: 'قالب شعری',
      tags: [
        {
          id: 'form_ghazal',
          label: 'غزل',
          description: 'شعر غزل',
          promptFragment: 'فقط اشعار غزل انتخاب کن - اشعاری با قالب غزل و با بیت‌های عاشقانه یا عارفانه'
        },
        {
          id: 'form_rubai',
          label: 'رباعی',
          description: 'شعر چهار مصرعی',
          promptFragment: 'اشعار را از رباعیات انتخاب کن - اشعار کوتاه چهار مصرعی با مفهوم عمیق'
        },
        {
          id: 'form_masnavi',
          label: 'مثنوی',
          description: 'ابیات مثنوی',
          promptFragment: 'از ابیات مثنوی‌ها انتخاب کن، مناسب برای داستان‌سرایی و آموزش اخلاقی'
        },
        {
          id: 'form_modern',
          label: 'شعر نو و سپید',
          description: 'شعر معاصر',
          promptFragment: 'اشعار معاصر و شعر نو (سپید) انتخاب کن، از شاعران نوگرا و مدرن'
        }
      ]
    },
    {
      id: 'poem_era',
      label: 'دوره و شاعر',
      tags: [
        {
          id: 'era_classic',
          label: 'کلاسیک (حافظ، سعدی، مولوی)',
          description: 'شعر کهن',
          promptFragment: 'ترجیحاً از شاعران کلاسیک بزرگ مانند حافظ، سعدی، مولوی، فردوسی و عطار انتخاب کن'
        },
        {
          id: 'era_contemporary',
          label: 'معاصر (شاملو، اخوان، فروغ)',
          description: 'شعر مدرن',
          promptFragment: 'از شاعران معاصر و مدرن مانند شاملو، اخوان ثالث، فروغ فرخزاد، سپهری انتخاب کن'
        },
        {
          id: 'era_mystic',
          label: 'عرفانی (مولوی، عطار، حافظ)',
          description: 'شعر صوفیانه',
          promptFragment: 'اشعار عرفانی و صوفیانه از شاعران بزرگ عارف مانند مولوی، عطار، حافظ و شبستری انتخاب کن'
        }
      ]
    },
    {
      id: 'poem_mood',
      label: 'حال و هوا',
      tags: [
        {
          id: 'mood_love',
          label: 'عاشقانه',
          description: 'شعر عشقی',
          promptFragment: 'اشعار عاشقانه و رمانتیک انتخاب کن، با مضمون عشق و محبت'
        },
        {
          id: 'mood_mystic',
          label: 'عارفانه و معنوی',
          description: 'شعر تأملی',
          promptFragment: 'اشعار عارفانه، معنوی و تأملی انتخاب کن، با مضامین عرفانی و فلسفی'
        },
        {
          id: 'mood_epic',
          label: 'حماسی و ملی',
          description: 'شعر پرشور',
          promptFragment: 'اشعار حماسی، میهنی و سرشار از شور و شوق انتخاب کن'
        },
        {
          id: 'mood_sad',
          label: 'غم‌انگیز و اندوهناک',
          description: 'شعر غمگین',
          promptFragment: 'اشعار غم‌انگیز، اندوهناک و با حال و هوای ملال و اندوه انتخاب کن'
        },
        {
          id: 'mood_hopeful',
          label: 'امیدبخش و مثبت',
          description: 'شعر روشن',
          promptFragment: 'اشعار امیدبخش، مثبت و سرشار از نور و روشنایی انتخاب کن'
        }
      ]
    },
    {
      id: 'poem_usage',
      label: 'کاربرد در متن',
      tags: [
        {
          id: 'usage_intro',
          label: 'برای مقدمه',
          description: 'آغاز مقاله',
          promptFragment: 'اشعاری انتخاب کن که برای مقدمه و آغاز مقاله مناسب باشند و زمینه‌ساز ورود به موضوع'
        },
        {
          id: 'usage_conclusion',
          label: 'برای جمع‌بندی',
          description: 'پایان مقاله',
          promptFragment: 'اشعاری انتخاب کن که برای جمع‌بندی و نتیجه‌گیری پایان مقاله مناسب باشند'
        },
        {
          id: 'usage_emphasis',
          label: 'برای تأکید میان متن',
          description: 'تقویت نکته',
          promptFragment: 'اشعاری انتخاب کن که برای تأکید و تقویت نکات کلیدی در میان متن مناسب باشند'
        }
      ]
    }
  ],

  [Mode.WRITE_ARTICLE]: [
    {
      id: 'article_tone',
      label: 'لحن و سبک نوشتاری',
      tags: [
        {
          id: 'tone_academic',
          label: 'رسمی - دانشگاهی',
          description: 'سبک علمی',
          promptFragment: 'متن را با لحن کاملاً رسمی و دانشگاهی بنویس، مناسب برای مقالات علمی و پژوهشی، با واژگان تخصصی و ساختار استدلالی محکم'
        },
        {
          id: 'tone_journalistic',
          label: 'روزنامه‌نگارانه',
          description: 'سبک خبری',
          promptFragment: 'متن را به سبک روزنامه‌نگاری بنویس - واضح، بی‌طرفانه، اطلاع‌رسان و با ساختار هرم معکوس (مهم‌ترین اطلاعات ابتدا)'
        },
        {
          id: 'tone_literary',
          label: 'ادبی و شاعرانه',
          description: 'نثر هنری',
          promptFragment: 'متن را با نثر ادبی، شاعرانه و هنری بنویس - استفاده از استعاره‌ها، تشبیهات زیبا، آرایه‌های ادبی و زبان روان و دلنشین'
        },
        {
          id: 'tone_friendly',
          label: 'صمیمی و محاوره‌ملایم',
          description: 'سبک دوستانه',
          promptFragment: 'متن را با لحن صمیمی، دوستانه و قابل ارتباط بنویس، با زبان ساده‌تر و نزدیک به گفتار (بدون خودمانی بیش از حد)'
        },
        {
          id: 'tone_analytical',
          label: 'تفسیری - تحلیلی',
          description: 'سبک تحلیلگرانه',
          promptFragment: 'متن را با رویکرد تحلیلی و تفسیری بنویس - بررسی عمیق موضوع، تحلیل علل و معلول‌ها، و ارائه دیدگاه‌های مختلف'
        }
      ]
    },
    {
      id: 'article_audience',
      label: 'مخاطب هدف',
      tags: [
        {
          id: 'audience_general',
          label: 'عموم مردم',
          description: 'همه مخاطبان',
          promptFragment: 'متن برای عموم مردم نوشته شود - با زبان ساده، واضح و قابل فهم، بدون اصطلاحات تخصصی پیچیده'
        },
        {
          id: 'audience_expert',
          label: 'متخصصان حوزه',
          description: 'مخاطب حرفه‌ای',
          promptFragment: 'متن برای متخصصان و کارشناسان حوزه نوشته شود - با عمق تخصصی، اصطلاحات فنی و بحث‌های پیشرفته'
        },
        {
          id: 'audience_student',
          label: 'دانشجویان',
          description: 'مخاطب دانشگاهی',
          promptFragment: 'متن برای دانشجویان و محققان نوشته شود - آموزنده، جامع و با ارجاعات علمی، در عین سادگی نسبی'
        },
        {
          id: 'audience_executive',
          label: 'مدیران و تصمیم‌گیران',
          description: 'مخاطب مدیریتی',
          promptFragment: 'متن برای مدیران و تصمیم‌گیران نوشته شود - مختصر، کاربردی، با تمرکز بر راهکارها و نتایج عملی'
        }
      ]
    },
    {
      id: 'article_structure',
      label: 'ساختار و روش',
      tags: [
        {
          id: 'structure_argumentative',
          label: 'استدلالی و نقدی',
          description: 'مقاله بحثی',
          promptFragment: 'ساختار متن استدلالی باشد - ارائه ادعا، دلایل، شواهد و نقد دیدگاه‌های مخالف'
        },
        {
          id: 'structure_descriptive',
          label: 'توصیفی - روایی',
          description: 'مقاله تشریحی',
          promptFragment: 'ساختار متن توصیفی و روایی باشد - شرح و بسط موضوع با جزئیات کامل، مانند یک داستان یا گزارش'
        },
        {
          id: 'structure_comparative',
          label: 'مقایسه‌ای',
          description: 'تطبیقی',
          promptFragment: 'ساختار متن مقایسه‌ای باشد - بررسی شباهت‌ها و تفاوت‌های دو یا چند موضوع در کنار هم'
        },
        {
          id: 'structure_problem_solution',
          label: 'مسئله - راه‌حل',
          description: 'حل مشکل',
          promptFragment: 'ساختار متن به شکل مسئله و راه‌حل باشد - ابتدا مشکل را شرح بده، سپس راهکارهای عملی ارائه کن'
        },
        {
          id: 'structure_narrative',
          label: 'روایت‌محور با مثال‌های داستانی',
          description: 'داستانی',
          promptFragment: 'متن را با رویکرد روایی و داستان‌گو بنویس - استفاده از مثال‌های ملموس، حکایات و داستان‌های واقعی'
        }
      ]
    },
    {
      id: 'article_depth',
      label: 'عمق پوشش',
      tags: [
        {
          id: 'depth_surface',
          label: 'سطحی و معرفی‌وار',
          description: 'مروری کلی',
          promptFragment: 'پوشش موضوع سطحی و معرفی‌وار باشد - یک نمای کلی و مرور اجمالی بدون عمق زیاد'
        },
        {
          id: 'depth_deep',
          label: 'تحلیلی عمیق',
          description: 'بررسی دقیق',
          promptFragment: 'پوشش موضوع عمیق و تحلیلی باشد - بررسی همه جوانب، تحلیل ریز و دقیق، و کاوش در لایه‌های پنهان'
        },
        {
          id: 'depth_historical',
          label: 'تمرکز بر جنبه تاریخی',
          description: 'نگاه گذشته‌نگر',
          promptFragment: 'تمرکز اصلی متن بر بُعد تاریخی موضوع باشد - بررسی ریشه‌ها، تحولات زمانی و سیر تاریخی'
        },
        {
          id: 'depth_aesthetic',
          label: 'تمرکز بر جنبه ادبی - زیباشناختی',
          description: 'نگاه هنری',
          promptFragment: 'تمرکز اصلی متن بر بُعد ادبی، هنری و زیباشناختی موضوع باشد - تحلیل جنبه‌های هنری و ارزش‌های زیبایی‌شناسانه'
        }
      ]
    }
  ],

  [Mode.REWRITE_TEXT]: [
    {
      id: 'rewrite_intensity',
      label: 'شدت بازنویسی',
      tags: [
        {
          id: 'intensity_light',
          label: 'ویرایش سبک و روان‌سازی',
          description: 'تغییرات جزئی',
          promptFragment: 'فقط ویرایش سبک انجام بده - اصلاح اشکالات نگارشی، روان‌تر کردن جملات، و حفظ ساختار کلی متن'
        },
        {
          id: 'intensity_complete',
          label: 'بازنویسی کامل با حفظ معنا',
          description: 'تغییر کامل ساختار',
          promptFragment: 'بازنویسی کامل انجام بده - ساختار جملات را تغییر بده، عبارات جدید استفاده کن، اما معنای دقیق متن را حفظ کن'
        },
        {
          id: 'intensity_summarize',
          label: 'خلاصه‌سازی ادبی',
          description: 'فشرده‌سازی',
          promptFragment: 'متن را خلاصه و فشرده کن - نکات اصلی را حفظ کن اما حجم را کاهش بده، با نثر ادبی و روان'
        },
        {
          id: 'intensity_expand',
          label: 'توسعه و بسط متن',
          description: 'افزودن جزئیات',
          promptFragment: 'متن را توسعه و بسط بده - جزئیات بیشتر اضافه کن، توضیحات کامل‌تری بده، و حجم متن را افزایش بده'
        }
      ]
    },
    {
      id: 'rewrite_style',
      label: 'سبک هدف',
      tags: [
        {
          id: 'style_news',
          label: 'مقاله‌نویسی خبری',
          description: 'سبک روزنامه‌ای',
          promptFragment: 'متن را به سبک مقاله‌نویسی خبری و روزنامه‌ای بازنویسی کن - واضح، مستقیم، بی‌طرفانه و اطلاع‌رسان'
        },
        {
          id: 'style_analytical',
          label: 'مقاله تحلیلی',
          description: 'سبک تحلیلی',
          promptFragment: 'متن را به سبک مقاله تحلیلی بازنویسی کن - با تحلیل عمیق، استدلال محکم و بررسی علل و معلول‌ها'
        },
        {
          id: 'style_literary',
          label: 'متن ادبی - نثری',
          description: 'سبک ادبی',
          promptFragment: 'متن را به نثر ادبی و هنری بازنویسی کن - با استعاره‌ها، تشبیهات، آرایه‌های ادبی و زبان شاعرانه'
        },
        {
          id: 'style_educational',
          label: 'متن آموزشی برای غیرمتخصص',
          description: 'سبک تدریسی',
          promptFragment: 'متن را به سبک آموزشی و تدریسی بازنویسی کن - ساده، گام‌به‌گام، با مثال‌های واضح و قابل فهم برای عموم'
        },
        {
          id: 'style_academic',
          label: 'سبک دانشگاهی - رسمی',
          description: 'سبک علمی',
          promptFragment: 'متن را به سبک دانشگاهی و علمی بازنویسی کن - رسمی، با واژگان تخصصی، ساختار استدلالی و لحن عینی'
        }
      ]
    },
    {
      id: 'rewrite_complexity',
      label: 'سطح پیچیدگی',
      tags: [
        {
          id: 'complexity_simple',
          label: 'زبان ساده برای عموم',
          description: 'سطح ابتدایی',
          promptFragment: 'زبان متن را بسیار ساده کن - برای عموم مردم قابل فهم، بدون واژگان دشوار و اصطلاحات تخصصی'
        },
        {
          id: 'complexity_moderate',
          label: 'زبان نسبتاً تخصصی',
          description: 'سطح متوسط',
          promptFragment: 'زبان متن در حد متوسط تا نسبتاً تخصصی باشد - برای افراد با سواد متوسط تا بالا'
        },
        {
          id: 'complexity_heavy',
          label: 'ادبی سنگین و کلاسیک',
          description: 'سطح پیشرفته',
          promptFragment: 'زبان متن ادبی سنگین، کلاسیک و با واژگان ادبی قدیمی و سنتی باشد - مناسب برای خوانندگان علاقه‌مند به نثر سنتی'
        },
        {
          id: 'complexity_modern',
          label: 'ادبی معاصر و روان',
          description: 'سطح مدرن',
          promptFragment: 'زبان متن ادبی معاصر و روان باشد - زیبا اما قابل فهم، با واژگان امروزی و ساختار مدرن'
        }
      ]
    },
    {
      id: 'rewrite_focus',
      label: 'تمرکز اصلاح',
      tags: [
        {
          id: 'focus_coherence',
          label: 'تمرکز بر انسجام منطقی',
          description: 'پیوستگی',
          promptFragment: 'تمرکز اصلی بر انسجام منطقی و پیوستگی ایده‌ها باشد - جریان فکری روان، ارتباط واضح بین جملات و بندها'
        },
        {
          id: 'focus_beauty',
          label: 'تمرکز بر زیبایی و استعاره‌ها',
          description: 'جنبه هنری',
          promptFragment: 'تمرکز اصلی بر زیبایی نثر، استعاره‌ها، تشبیهات و آرایه‌های ادبی باشد - متن را از نظر هنری غنی‌تر کن'
        },
        {
          id: 'focus_brevity',
          label: 'تمرکز بر کوتاه‌نویسی',
          description: 'اختصار',
          promptFragment: 'تمرکز اصلی بر کوتاه‌نویسی و اختصار باشد - کلمات اضافی حذف شوند، جملات مختصر و مفید باشند'
        },
        {
          id: 'focus_clarity',
          label: 'حذف ابهام و تکرار',
          description: 'وضوح',
          promptFragment: 'تمرکز اصلی بر حذف ابهام‌ها، تکرارهای غیرضروری و مبهم‌بودن‌ها باشد - همه چیز واضح و شفاف'
        }
      ]
    }
  ],

  [Mode.FIND_PROVERBS]: [
    {
      id: 'proverb_tone',
      label: 'لحن ضرب‌المثل',
      tags: [
        {
          id: 'tone_formal_proverb',
          label: 'رسمی و متین',
          description: 'ضرب‌المثل رسمی',
          promptFragment: 'ضرب‌المثل‌ها را رسمی، متین و با لحن جدی انتخاب کن - مناسب برای متون رسمی و نوشتار علمی'
        },
        {
          id: 'tone_colloquial',
          label: 'محاوره‌ای و خودمانی',
          description: 'ضرب‌المثل عامیانه',
          promptFragment: 'ضرب‌المثل‌های محاوره‌ای، خودمانی و نزدیک به گفتار روزمره انتخاب کن - مناسب برای متون صمیمی'
        },
        {
          id: 'tone_humorous',
          label: 'طنزآمیز',
          description: 'ضرب‌المثل شوخ‌طبعانه',
          promptFragment: 'ضرب‌المثل‌های طنزآمیز، شوخ‌طبعانه و با حال و هوای خنده‌دار انتخاب کن'
        },
        {
          id: 'tone_moral',
          label: 'پندآموز و اخلاقی',
          description: 'ضرب‌المثل تربیتی',
          promptFragment: 'ضرب‌المثل‌های پندآموز، اخلاقی و با بار تربیتی بالا انتخاب کن - مناسب برای آموزش اخلاق'
        },
        {
          id: 'tone_sarcastic',
          label: 'انتقادی / طعنه‌آلود',
          description: 'ضرب‌المثل طنزگونه',
          promptFragment: 'ضرب‌المثل‌های انتقادی، طعنه‌آمیز و با بار سیاسی یا اجتماعی انتخاب کن'
        }
      ]
    },
    {
      id: 'proverb_familiarity',
      label: 'میزان شناخت',
      tags: [
        {
          id: 'familiarity_common',
          label: 'بسیار رایج و آشنا',
          description: 'همه می‌شناسند',
          promptFragment: 'ضرب‌المثل‌ها را تا حد امکان رایج، مشهور و قابل فهم برای عموم انتخاب کن - ضرب‌المثل‌هایی که همه می‌شناسند'
        },
        {
          id: 'familiarity_moderate',
          label: 'نسبتاً کمتر شنیده‌شده',
          description: 'نیمه‌آشنا',
          promptFragment: 'ضرب‌المثل‌هایی انتخاب کن که نسبتاً کمتر شنیده‌شده باشند اما هنوز قابل فهم - ترکیبی از آشنا و تازه'
        },
        {
          id: 'familiarity_rare',
          label: 'ضرب‌المثل‌های کهن و ادبی',
          description: 'نایاب و کلاسیک',
          promptFragment: 'ضرب‌المثل‌های کهن، قدیمی و ادبی انتخاب کن - ضرب‌المثل‌هایی که در متون کلاسیک دیده می‌شوند'
        }
      ]
    },
    {
      id: 'proverb_usage',
      label: 'کاربرد در متن',
      tags: [
        {
          id: 'usage_opening',
          label: 'مناسب برای آغاز مقاله',
          description: 'شروع متن',
          promptFragment: 'ضرب‌المثل‌هایی انتخاب کن که برای افتتاح و آغاز مقاله مناسب باشند - زمینه‌ساز ورود به موضوع'
        },
        {
          id: 'usage_closing',
          label: 'مناسب برای جمع‌بندی',
          description: 'پایان متن',
          promptFragment: 'ضرب‌المثل‌هایی انتخاب کن که برای جمع‌بندی و نتیجه‌گیری پایان مقاله مناسب باشند'
        },
        {
          id: 'usage_subtitle',
          label: 'برای میان‌تیتر',
          description: 'عنوان بخش',
          promptFragment: 'ضرب‌المثل‌هایی انتخاب کن که به‌عنوان میان‌تیتر یا عنوان بخش‌های مقاله قابل استفاده باشند'
        },
        {
          id: 'usage_emphasis',
          label: 'برای تأکید احساسی وسط متن',
          description: 'تقویت نکته',
          promptFragment: 'ضرب‌المثل‌هایی انتخاب کن که برای تأکید احساسی و تقویت نکات کلیدی در میان متن مناسب باشند'
        }
      ]
    }
  ]
};

