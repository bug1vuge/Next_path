import {normalizeForSearch} from "@/lib/format";
import type {Locale} from "@/lib/locales";
import type {ChatTurn} from "./input";
import {
  findMatches,
  pageContext,
  pick,
  pickList,
  universitiesForProfession,
  type DirectionDoc,
  type KnowledgeBase,
  type Matches,
  type ProfessionDoc,
  type UniversityDoc,
  type VisitorProfile
} from "./knowledge";

/**
 * The assistant without a language model: a rule-based engine that follows the
 * team's specification ("Структура ИИ-ассистента платформы Next Path") step by
 * step — it decides which module a question belongs to (using the site,
 * choosing a profession, the educational path), takes the answer from the same
 * catalogue and site guide the model would use, asks a clarifying question when
 * the request is vague and says plainly when Next Path has no data.
 *
 * It costs nothing to run and needs no key, so it is what visitors talk to
 * whenever `ANTHROPIC_API_KEY` is not set. Every fact comes from the database;
 * the engine only chooses which facts to show and phrases them.
 */

type Lang = Locale;

// ---------------------------------------------------------------------------
// Site sections and words, in the three interface languages

const SECTION_TITLES: Record<string, Record<Lang, string>> = {
  "/": {ru: "Главная", kk: "Басты бет", en: "Home"},
  "/test": {ru: "Тест", kk: "Тест", en: "Test"},
  "/test/results": {ru: "Результаты теста", kk: "Тест нәтижелері", en: "Test results"},
  "/directions": {ru: "Направления", kk: "Бағыттар", en: "Directions"},
  "/professions": {ru: "Профессии", kk: "Мамандықтар", en: "Professions"},
  "/universities": {ru: "Университеты", kk: "Университеттер", en: "Universities"},
  "/favorites": {ru: "Избранное", kk: "Таңдаулылар", en: "Favourites"},
  "/career-path": {ru: "Карьерная карта", kk: "Мансап картасы", en: "Career map"},
  "/admission-plan": {ru: "План поступления", kk: "Түсу жоспары", en: "Admission plan"},
  "/grants": {ru: "Гранты", kk: "Гранттар", en: "Grants"},
  "/search": {ru: "Поиск", kk: "Іздеу", en: "Search"},
  "/reviews": {ru: "Отзывы", kk: "Пікірлер", en: "Reviews"},
  "/about": {ru: "О проекте", kk: "Жоба туралы", en: "About"}
};

const section = (path: string, lang: Lang) => `[${SECTION_TITLES[path][lang]}](${path})`;

const L = {
  ru: {
    fromBase: "По данным Next Path",
    advice: "Общая рекомендация",
    noData: "В базе Next Path этого пока нет.",
    checkSite: (url: string) => `Уточни на [официальном сайте вуза](${url}) или в приёмной комиссии.`,
    checkOfficial: "Уточни в приёмной комиссии вуза или на его официальном сайте.",
    description: "Описание",
    whoItSuits: "Кому подходит",
    subjects: "Школьные предметы",
    skills: "Навыки",
    professions: "Профессии",
    whatTheyDo: "Чем занимается",
    salary: "Зарплата (как указано в источнике)",
    demand: "Востребованность",
    pros: "Плюсы",
    cons: "Минусы",
    specialties: "Специальности",
    direction: "Направление",
    whereToStudy: "Где учиться (вузы из базы)",
    place: "Страна, город",
    rating: "Рейтинг",
    tuition: "Стоимость обучения в год",
    programs: "Программы",
    exams: "Экзамены",
    grants: "Гранты",
    deadline: "Сроки",
    website: "Официальный сайт",
    email: "Email",
    phone: "Телефон",
    address: "Адрес",
    openPage: (label: string, path: string) => `Подробнее — на странице [${label}](${path}).`,
    alsoFound: "Ещё в базе нашлось",
    noUniversities: "В базе Next Path пока нет вузов с программами по этой профессии.",
    greeting: `Привет! Я помощник Next Path. Могу:
- подсказать, как пользоваться сайтом;
- рассказать о профессиях и направлениях и помочь сравнить их;
- показать, где учиться и что нужно для поступления — по данным базы Next Path.

О чём хочешь узнать?`,
    thanks: "Пожалуйста! Если появятся ещё вопросы — пиши.",
    crisis:
      "Мне очень жаль, что тебе сейчас так тяжело. Ты не один, и об этом важно сказать человеку рядом: родителям, близкому взрослому, учителю или школьному психологу. Можно бесплатно и анонимно позвонить на детскую линию доверия Казахстана — **150**, там выслушают и помогут. Если есть опасность прямо сейчас — звони **112**.",
    offTopic:
      "С этим я не помогу: я помощник по выбору профессии и пути в образовании. Зато могу рассказать о профессиях, направлениях, вузах из базы Next Path или о том, как пользоваться сайтом.",
    missingFeature: (what: string) => `На Next Path нет функции «${what}», поэтому я не буду её описывать.`,
    features: {
      account: "регистрация и личный кабинет",
      apply: "подача документов в вузы",
      human: "консультации с живыми специалистами",
      payment: "платный доступ",
      chances: "расчёт шансов на поступление"
    },
    accountNote: "Регистрация не нужна: избранное, ответы теста и отметки планов хранятся прямо в твоём браузере.",
    applyNote: (s: string) => `Документы подаются через приёмную комиссию вуза. На Next Path можно собрать требования выбранных вузов в разделе ${s}.`,
    humanNote: "Если нужен разговор с человеком — обратись к школьному психологу или профориентатору.",
    paymentNote: "Сайт бесплатный, все разделы открыты.",
    chancesNote: (s: string) => `Я не оцениваю шансы на поступление. Посмотри требования вузов на их страницах и в разделе ${s}.`,
    instead: "Что есть на сайте",
    start: (test: string, dirs: string, map: string) =>
      `Next Path помогает пройти путь от интересов до плана поступления. Удобнее всего так:
1. Пройди ${test} — он покажет, какие направления тебе ближе.
2. Изучи ${dirs} и профессии в них, сохраняй понравившиеся сердечком.
3. Найди университеты с подходящими программами.
4. Открой ${map} — там всё соберётся в один маршрут.`,
    test: (link: string, results: string) =>
      `${link} — это профориентационный тест из трёх блоков: «Личность», «Интересы», «Карьера». Вопросы идут по одному на экране, ответы сохраняются в браузере, так что можно прерваться и продолжить позже. После теста ${results} покажут направления по проценту совпадения — это подсказка, а не приговор.`,
    careerMap: (link: string) =>
      `${link} — навигатор из девяти станций: профиль по тесту, рекомендованные направления, профессии, сравнение сохранённых профессий, университеты, план поступления, план развития, карьерный путь и альтернативные маршруты. Полоса прогресса сверху показывает, сколько шагов уже сделано.`,
    favourites: (link: string) =>
      `Нажми на сердечко на карточке направления, профессии или университета — и она появится в разделе ${link}. Регистрация не нужна: избранное хранится в этом браузере.`,
    admissionPlan: (link: string) =>
      `${link} — чек-лист шагов поступления и требования университетов, которые ты сохранил в избранное. Отметки сохраняются в браузере.`,
    grantsSection: (link: string, count: number) =>
      `В разделе ${link} собраны сведения о грантах и сроках по университетам — в том виде, в каком они есть в базе Next Path${count > 0 ? ` (сейчас такие сведения есть у вузов: ${count})` : ""}. Спроси меня про конкретный вуз — расскажу, что о нём известно.`,
    search: (link: string) => `${link} ищет сразу по направлениям, профессиям и университетам — иконка лупы в шапке сайта.`,
    reviews: (link: string) => `В разделе ${link} можно прочитать отзывы о сайте и оставить свой: имя, оценка от 1 до 5 и текст.`,
    language: "Сайт работает на русском, казахском и английском — переключатель языка в шапке сайта. Наш разговор при этом сохранится.",
    filters: (prof: string, uni: string) =>
      `В разделе ${prof} есть фильтры по направлению, востребованности и уровню зарплаты, в разделе ${uni} — по стране, городу, направлению и стоимости обучения. Результаты можно сортировать.`,
    about: (link: string) =>
      `Next Path — бесплатная профориентационная платформа для школьников 8–11 классов и абитуриентов Казахстана. Данные о профессиях и вузах загружены из рабочей таблицы команды и показаны без изменений. Подробнее — в разделе ${link}.`,
    directionsList: "Направления в базе Next Path",
    universitiesList: "Университеты в базе Next Path",
    professionsIn: (name: string) => `Профессии направления «${name}»`,
    noTest: (link: string) =>
      `Ты ещё не проходил тест, поэтому мне не на что опереться. Пройди ${link} — он займёт немного времени и покажет, какие направления тебе ближе. После этого спроси меня снова.`,
    testTop: "Судя по твоему тесту, тебе ближе всего эти направления",
    testNote: "Процент показывает совпадение ответов с направлением — это повод изучить их, а не окончательный выбор.",
    favouriteNote: "В избранном у тебя",
    mathQuestion: `Математика открывает много дорог. Чтобы предложить подходящие направления, уточни, что тебе нравится больше:
1. решать технические задачи и разбираться, как всё устроено;
2. работать с данными и находить в них закономерности;
3. проектировать — здания, механизмы, интерфейсы;
4. считать деньги, анализировать финансы и бизнес.`,
    bySubject: (subject: string) => `Предмет «${subject}» есть среди школьных предметов этих направлений`,
    interestQuestion: "Что именно тебе в этом нравится — разбираться в теории, делать что-то руками, работать с людьми или что-то создавать? От этого зависит, какие профессии стоит посмотреть.",
    vague: (test: string) =>
      `Давай сузим выбор. Расскажи, пожалуйста:
1. Какие школьные предметы тебе нравятся или даются легче?
2. Чем хочешь заниматься: работать с людьми, с техникой, с данными, творить или исследовать?

А если ещё не проходил ${test} — начни с него, он подскажет направления.`,
    compareAsk: (names: string) => `Какие профессии сравнить? В базе есть: ${names}. Назови две — покажу различия.`,
    compareOne: (name: string) => `С какой профессией сравнить «${name}»? Назови вторую — покажу различия по данным Next Path.`,
    compareIntro: "Сравнение по данным Next Path",
    notFound: (searchLink: string) =>
      `Я не нашёл этого в базе Next Path. Попробуй ${searchLink} по сайту или переформулируй вопрос — например, назови профессию, направление или университет.`,
    canHelp: `Я могу:
- рассказать о профессии или направлении;
- подсказать вузы из базы и требования к поступлению;
- объяснить, как пользоваться сайтом.`,
    searchLabel: "поиск",
    nextTest: (link: string) => `Следующий шаг: пройди ${link}, чтобы увидеть свои направления.`,
    nextCompare: "Хочешь — сравню эту профессию с похожей.",
    nextUniversity: "Могу рассказать о стоимости, экзаменах, грантах или сроках — спроси.",
    contactsLabel: "Контакты",
    more: "Подробнее"
  },
  kk: {
    fromBase: "Next Path деректері бойынша",
    advice: "Жалпы кеңес",
    noData: "Next Path базасында бұл туралы әзірге мәлімет жоқ.",
    checkSite: (url: string) => `[ЖОО-ның ресми сайтынан](${url}) немесе қабылдау комиссиясынан нақтыла.`,
    checkOfficial: "ЖОО-ның қабылдау комиссиясынан немесе ресми сайтынан нақтыла.",
    description: "Сипаттама",
    whoItSuits: "Кімге сәйкес",
    subjects: "Мектеп пәндері",
    skills: "Дағдылар",
    professions: "Мамандықтар",
    whatTheyDo: "Немен айналысады",
    salary: "Жалақы (дереккөздегідей)",
    demand: "Сұраныс",
    pros: "Артықшылықтары",
    cons: "Кемшіліктері",
    specialties: "Білім беру бағдарламалары",
    direction: "Бағыт",
    whereToStudy: "Қайда оқуға болады (базадағы ЖОО)",
    place: "Ел, қала",
    rating: "Рейтинг",
    tuition: "Жылдық оқу ақысы",
    programs: "Бағдарламалар",
    exams: "Емтихандар",
    grants: "Гранттар",
    deadline: "Мерзімдер",
    website: "Ресми сайт",
    email: "Email",
    phone: "Телефон",
    address: "Мекенжай",
    openPage: (label: string, path: string) => `Толығырақ — [${label}](${path}) бетінде.`,
    alsoFound: "Базада тағы табылғаны",
    noUniversities: "Next Path базасында бұл мамандық бойынша бағдарламасы бар ЖОО әзірге жоқ.",
    greeting: `Сәлем! Мен Next Path көмекшісімін. Мен:
- сайтты қалай пайдалану керегін түсіндіремін;
- мамандықтар мен бағыттар туралы айтып, оларды салыстыруға көмектесемін;
- Next Path базасы бойынша қайда оқуға болатынын және түсуге не керек екенін көрсетемін.

Не туралы білгің келеді?`,
    thanks: "Оқасы жоқ! Тағы сұрақ болса — жаз.",
    crisis:
      "Саған қазір қиын болғанына қатты өкінемін. Сен жалғыз емессің — бұл туралы жақын адамыңа айту маңызды: ата-анаңа, сенімді ересекке, мұғалімге немесе мектеп психологына. Қазақстанның балаларға арналған сенім телефонына **150** тегін және жасырын қоңырау шалуға болады. Қазір қауіп болса — **112** нөміріне хабарлас.",
    offTopic:
      "Бұған көмектесе алмаймын: мен мамандық пен білім жолын таңдауға көмектесемін. Есесіне Next Path базасындағы мамандықтар, бағыттар, ЖОО туралы немесе сайтты пайдалану туралы айтып бере аламын.",
    missingFeature: (what: string) => `Next Path-та «${what}» функциясы жоқ, сондықтан оны сипаттамаймын.`,
    features: {
      account: "тіркелу және жеке кабинет",
      apply: "ЖОО-ға құжат тапсыру",
      human: "тірі маманмен кеңес",
      payment: "ақылы қолжетімділік",
      chances: "түсу мүмкіндігін есептеу"
    },
    accountNote: "Тіркелудің қажеті жоқ: таңдаулылар, тест жауаптары және жоспар белгілері браузеріңде сақталады.",
    applyNote: (s: string) => `Құжаттар ЖОО-ның қабылдау комиссиясы арқылы тапсырылады. Next Path-та таңдалған ЖОО талаптарын ${s} бөлімінде жинауға болады.`,
    humanNote: "Адаммен сөйлесу керек болса — мектеп психологына немесе кәсіби бағдар беру маманына жүгін.",
    paymentNote: "Сайт тегін, барлық бөлімдер ашық.",
    chancesNote: (s: string) => `Мен түсу мүмкіндігін бағаламаймын. ЖОО талаптарын олардың беттерінен және ${s} бөлімінен қара.`,
    instead: "Сайтта бары",
    start: (test: string, dirs: string, map: string) =>
      `Next Path қызығушылықтан түсу жоспарына дейінгі жолды өтуге көмектеседі. Былай бастаған ыңғайлы:
1. ${test} тапсыр — ол саған жақын бағыттарды көрсетеді.
2. ${dirs} мен олардағы мамандықтарды қарап шық, ұнағанын жүрекшемен сақта.
3. Сәйкес бағдарламалары бар университеттерді тап.
4. ${map} аш — бәрі бір маршрутқа жиналады.`,
    test: (link: string, results: string) =>
      `${link} — үш блоктан тұратын кәсіби бағдар тесті: «Тұлға», «Қызығушылықтар», «Мансап». Сұрақтар экранда бір-бірден шығады, жауаптар браузерде сақталады, сондықтан кейін жалғастыруға болады. Тесттен кейін ${results} бағыттарды сәйкестік пайызы бойынша көрсетеді — бұл кеңес, үкім емес.`,
    careerMap: (link: string) =>
      `${link} — тоғыз станциядан тұратын навигатор: тест бойынша профиль, ұсынылған бағыттар, мамандықтар, сақталған мамандықтарды салыстыру, университеттер, түсу жоспары, даму жоспары, мансап жолы және балама маршруттар. Жоғарыдағы прогресс жолағы қанша қадам жасалғанын көрсетеді.`,
    favourites: (link: string) =>
      `Бағыттың, мамандықтың немесе университеттің карточкасындағы жүрекшені бас — ол ${link} бөлімінде пайда болады. Тіркелу қажет емес: таңдаулылар осы браузерде сақталады.`,
    admissionPlan: (link: string) =>
      `${link} — түсу қадамдарының тізімі және таңдаулыларға сақталған университеттердің талаптары. Белгілер браузерде сақталады.`,
    grantsSection: (link: string, count: number) =>
      `${link} бөлімінде университеттер бойынша гранттар мен мерзімдер туралы мәліметтер Next Path базасындағы күйінде жиналған${count > 0 ? ` (қазір мұндай мәлімет ${count} ЖОО-да бар)` : ""}. Нақты ЖОО туралы сұра — не белгілі екенін айтамын.`,
    search: (link: string) => `${link} бірден бағыттар, мамандықтар және университеттер бойынша іздейді — сайт басындағы лупа белгісі.`,
    reviews: (link: string) => `${link} бөлімінде сайт туралы пікірлерді оқып, өз пікіріңді қалдыра аласың: аты, 1-ден 5-ке дейінгі баға және мәтін.`,
    language: "Сайт орыс, қазақ және ағылшын тілдерінде жұмыс істейді — тіл ауыстырғыш сайттың жоғарғы жағында. Әңгімеміз сақталады.",
    filters: (prof: string, uni: string) =>
      `${prof} бөлімінде бағыт, сұраныс және жалақы деңгейі бойынша сүзгілер бар, ${uni} бөлімінде — ел, қала, бағыт және оқу ақысы бойынша. Нәтижелерді сұрыптауға болады.`,
    about: (link: string) =>
      `Next Path — Қазақстандағы 8–11 сынып оқушылары мен талапкерлерге арналған тегін кәсіби бағдар платформасы. Мамандықтар мен ЖОО туралы деректер команданың жұмыс кестесінен алынып, өзгеріссіз көрсетіледі. Толығырақ — ${link} бөлімінде.`,
    directionsList: "Next Path базасындағы бағыттар",
    universitiesList: "Next Path базасындағы университеттер",
    professionsIn: (name: string) => `«${name}» бағытының мамандықтары`,
    noTest: (link: string) =>
      `Сен әлі тест тапсырмағансың, сондықтан маған сүйенетін дерек жоқ. ${link} тапсыр — ол көп уақыт алмайды және саған жақын бағыттарды көрсетеді. Содан кейін қайта сұра.`,
    testTop: "Тестің бойынша саған мына бағыттар жақын",
    testNote: "Пайыз жауаптарыңның бағытпен сәйкестігін көрсетеді — бұл оларды зерттеуге себеп, түпкілікті таңдау емес.",
    favouriteNote: "Таңдаулыларыңда",
    mathQuestion: `Математика көп жолды ашады. Сәйкес бағыттарды ұсыну үшін, саған не көбірек ұнайтынын нақтыла:
1. техникалық есептер шығару және бәрі қалай жұмыс істейтінін түсіну;
2. деректермен жұмыс істеп, заңдылықтар табу;
3. жобалау — ғимараттар, механизмдер, интерфейстер;
4. ақша санау, қаржы мен бизнесті талдау.`,
    bySubject: (subject: string) => `«${subject}» пәні мына бағыттардың мектеп пәндерінің ішінде бар`,
    interestQuestion: "Мұның нақты несі ұнайды — теорияны түсіну, қолмен бір нәрсе жасау, адамдармен жұмыс істеу ме, әлде бір нәрсе жасап шығару ма? Қандай мамандықтарды қарау керегі соған байланысты.",
    vague: (test: string) =>
      `Таңдауды тарылтайық. Айтшы:
1. Қандай мектеп пәндері ұнайды немесе оңай меңгеріледі?
2. Немен айналысқың келеді: адамдармен, техникамен, деректермен жұмыс, шығармашылық па, әлде зерттеу ме?

Егер ${test} әлі тапсырмасаң — содан баста, ол бағыттарды ұсынады.`,
    compareAsk: (names: string) => `Қай мамандықтарды салыстырайын? Базада бар: ${names}. Екеуін ата — айырмашылығын көрсетемін.`,
    compareOne: (name: string) => `«${name}» мамандығын немен салыстырайын? Екіншісін ата — Next Path деректері бойынша айырмашылығын көрсетемін.`,
    compareIntro: "Next Path деректері бойынша салыстыру",
    notFound: (searchLink: string) =>
      `Мұны Next Path базасынан таппадым. Сайт бойынша ${searchLink} байқап көр немесе сұрақты басқаша қой — мысалы, мамандықты, бағытты немесе университетті ата.`,
    canHelp: `Мен:
- мамандық немесе бағыт туралы айтып беремін;
- базадағы ЖОО-ны және түсу талаптарын көрсетемін;
- сайтты қалай пайдалану керегін түсіндіремін.`,
    searchLabel: "іздеуді",
    nextTest: (link: string) => `Келесі қадам: өз бағыттарыңды көру үшін ${link} тапсыр.`,
    nextCompare: "Қаласаң — бұл мамандықты ұқсас мамандықпен салыстырамын.",
    nextUniversity: "Оқу ақысы, емтихандар, гранттар немесе мерзімдер туралы сұрай аласың.",
    contactsLabel: "Байланыс",
    more: "Толығырақ"
  },
  en: {
    fromBase: "According to Next Path",
    advice: "General advice",
    noData: "Next Path doesn't have this information yet.",
    checkSite: (url: string) => `Check the [university's official website](${url}) or ask its admissions office.`,
    checkOfficial: "Check with the university's admissions office or its official website.",
    description: "Description",
    whoItSuits: "Who it suits",
    subjects: "School subjects",
    skills: "Skills",
    professions: "Professions",
    whatTheyDo: "What they do",
    salary: "Salary (as given in the source)",
    demand: "Demand",
    pros: "Pros",
    cons: "Cons",
    specialties: "Degree programmes",
    direction: "Direction",
    whereToStudy: "Where to study (universities in the database)",
    place: "Country, city",
    rating: "Rating",
    tuition: "Tuition per year",
    programs: "Programmes",
    exams: "Exams",
    grants: "Grants",
    deadline: "Deadlines",
    website: "Official website",
    email: "Email",
    phone: "Phone",
    address: "Address",
    openPage: (label: string, path: string) => `More on the [${label}](${path}) page.`,
    alsoFound: "Also found in the database",
    noUniversities: "Next Path has no universities with programmes for this profession yet.",
    greeting: `Hi! I'm the Next Path assistant. I can:
- explain how to use the site;
- tell you about professions and directions and help compare them;
- show where to study and what you need to apply, based on Next Path's data.

What would you like to know?`,
    thanks: "You're welcome! Ask me anytime.",
    crisis:
      "I'm really sorry you're going through this. You're not alone, and it matters to tell someone close to you: a parent, a trusted adult, a teacher or the school psychologist. You can call Kazakhstan's free, anonymous children's helpline on **150** — they will listen and help. If you're in danger right now, call **112**.",
    offTopic:
      "I can't help with that — I'm here to help you choose a profession and an educational path. I can tell you about professions, directions and universities in Next Path, or about how to use the site.",
    missingFeature: (what: string) => `Next Path has no ${what} feature, so I won't describe one.`,
    features: {
      account: "sign-up or personal account",
      apply: "online application to universities",
      human: "live consultation",
      payment: "paid access",
      chances: "admission chance calculator"
    },
    accountNote: "No sign-up is needed: favourites, test answers and plan ticks are kept in your browser.",
    applyNote: (s: string) => `Applications go through the university's admissions office. On Next Path you can collect the requirements of the universities you chose in ${s}.`,
    humanNote: "If you'd like to talk to a person, ask your school psychologist or careers adviser.",
    paymentNote: "The site is free and every section is open.",
    chancesNote: (s: string) => `I don't estimate admission chances. See each university's requirements on its page and in ${s}.`,
    instead: "What the site has",
    start: (test: string, dirs: string, map: string) =>
      `Next Path takes you from your interests to an admission plan. A good order:
1. Take the ${test} — it shows which directions suit you.
2. Explore ${dirs} and their professions; save the ones you like with the heart.
3. Find universities with matching programmes.
4. Open the ${map} — it puts everything into one route.`,
    test: (link: string, results: string) =>
      `The ${link} is a career test in three blocks: "Personality", "Interests" and "Career". One question per screen; answers are saved in your browser, so you can stop and continue later. Afterwards ${results} rank directions by match percentage — a hint, not a verdict.`,
    careerMap: (link: string) =>
      `The ${link} is a navigator with nine stations: your test profile, recommended directions, professions, comparing saved professions, universities, the admission plan, a development plan, the career path and alternative routes. The progress bar at the top shows how many steps you've done.`,
    favourites: (link: string) =>
      `Tap the heart on a direction, profession or university card and it appears in ${link}. No sign-up needed: favourites are kept in this browser.`,
    admissionPlan: (link: string) =>
      `The ${link} is a checklist of admission steps plus the requirements of universities you saved to favourites. Your ticks are saved in the browser.`,
    grantsSection: (link: string, count: number) =>
      `${link} collects what Next Path knows about grants and deadlines by university${count > 0 ? ` (currently for ${count} universities)` : ""}. Ask me about a specific university and I'll tell you what's recorded.`,
    search: (link: string) => `${link} looks through directions, professions and universities at once — the magnifier icon in the header.`,
    reviews: (link: string) => `In ${link} you can read reviews of the site and leave your own: a name, a rating from 1 to 5 and a text.`,
    language: "The site works in Russian, Kazakh and English — the language switch is in the header. Our conversation stays when you switch.",
    filters: (prof: string, uni: string) =>
      `${prof} can be filtered by direction, demand and salary level; ${uni} by country, city, direction and tuition. Results can be sorted.`,
    about: (link: string) =>
      `Next Path is a free career guidance platform for students in grades 8–11 and applicants in Kazakhstan. Data on professions and universities comes from the team's working spreadsheet and is shown unchanged. More in ${link}.`,
    directionsList: "Directions in Next Path",
    universitiesList: "Universities in Next Path",
    professionsIn: (name: string) => `Professions in "${name}"`,
    noTest: (link: string) =>
      `You haven't taken the test yet, so I have nothing to go on. Take the ${link} — it doesn't take long and shows which directions suit you. Then ask me again.`,
    testTop: "Based on your test, these directions are closest to you",
    testNote: "The percentage shows how well your answers match a direction — a reason to explore, not a final choice.",
    favouriteNote: "In your favourites",
    mathQuestion: `Maths opens many doors. To suggest directions, tell me what you enjoy more:
1. solving technical problems and figuring out how things work;
2. working with data and finding patterns;
3. designing — buildings, machines, interfaces;
4. working with money, finance and business.`,
    bySubject: (subject: string) => `"${subject}" is among the school subjects of these directions`,
    interestQuestion: "What exactly do you like about it — understanding theory, making things with your hands, working with people or creating something? That decides which professions to look at.",
    vague: (test: string) =>
      `Let's narrow it down. Tell me:
1. Which school subjects do you like or find easier?
2. What would you like to do: work with people, technology, data, create or research?

And if you haven't taken the ${test} yet, start there — it suggests directions.`,
    compareAsk: (names: string) => `Which professions should I compare? Next Path has: ${names}. Name two and I'll show the differences.`,
    compareOne: (name: string) => `What should I compare "${name}" with? Name the second profession and I'll show the differences from Next Path's data.`,
    compareIntro: "Comparison from Next Path's data",
    notFound: (searchLink: string) =>
      `I couldn't find this in Next Path. Try the site ${searchLink} or rephrase — for example, name a profession, direction or university.`,
    canHelp: `I can:
- tell you about a profession or direction;
- show universities in the database and admission requirements;
- explain how to use the site.`,
    searchLabel: "search",
    nextTest: (link: string) => `Next step: take the ${link} to see your directions.`,
    nextCompare: "I can compare this profession with a similar one if you like.",
    nextUniversity: "Ask me about tuition, exams, grants or deadlines.",
    contactsLabel: "Contacts",
    more: "More"
  }
} satisfies Record<Lang, unknown>;

type Texts = (typeof L)["ru"];

// ---------------------------------------------------------------------------
// Recognising what the question is about (patterns run on normalizeForSearch
// output: lower case, "ё" → "е", "й" → "и")

const KAZAKH_LETTERS = /[әғқңөұүһі]/i;

/** Answer in the language of the message when it is clearly another of the three. */
export function replyLanguage(question: string, locale: Locale): Lang {
  if (KAZAKH_LETTERS.test(question)) return "kk";
  const cyrillic = /[а-яё]/i.test(question);
  const latin = /[a-z]{3,}/i.test(question.replace(/\b(it|ielts|sat|ux|ui|next path)\b/gi, ""));
  if (cyrillic) return locale === "en" ? "ru" : locale;
  if (latin) return "en";
  return locale;
}

/**
 * JavaScript's `\\b` and `\\w` only know Latin letters, so the patterns below are
 * rewritten to Unicode-aware equivalents: Cyrillic and Kazakh words get word
 * boundaries too.
 */
function unicode(pattern: RegExp): RegExp {
  const letter = "[\\p{L}\\p{N}_]";
  const source = pattern.source
    .replace(/\\w/g, letter)
    .replace(/\\b/g, `(?:(?<!${letter})(?=${letter})|(?<=${letter})(?!${letter}))`);
  return new RegExp(source, "u");
}

const P = Object.fromEntries(Object.entries({
  crisis:
    /(суицид|покончить с собо|навредить себе|убить себя|не хочу жить|хочу умереть|режу себя|порезать себя|өзіме зиян|өзімді өлтір|өмір сүргім келмеи|өлгім келеді|suicid|kill myself|hurt myself|self.?harm|want to die)/,
  greeting: /^(привет|здравств|добрыи (день|вечер)|доброе утро|хаи|салем|сәлем|қайырлы|hi|hello|hey|good (morning|afternoon|evening))\b/,
  thanks: /(спасибо|благодар|рахмет|thank)/,
  offTopic:
    /(домашн\w* (задан|работ)|сочинени|реши\w* (задач|пример|уравнен)|напиши (эссе|реферат|стих)|үи жұмыс|үй жұмыс|шығарма жаз|homework|write (an )?essay|solve (this|the) (problem|equation))/,
  account: /(регистрац|зарегистр|личн\w* кабинет|аккаунт|войти в|логин|парол|тіркел|жеке кабинет|sign ?up|register|account|log ?in|password)/,
  apply: /(подать документ|подач\w* документ|отправить документ|онлаин.?подач|подать заявлени|құжат тапсыр|өтініш бер|apply online|submit (my )?(documents|application)|send (my )?documents)/,
  human: /(живым|живои человек|с человеком|оператор|менеджер|консультаци\w* специалист|тірі маман|адаммен сөилес|адаммен сөйлес|real person|human|live (chat|consult))/,
  payment: /(подписк|платн\w* (ли )?(сайт|доступ|платформ)|сколько стоит (сайт|платформ|доступ)|сайт ақылы|ақылы ма|subscription|premium|is (the site|it) free|paid access)/,
  chances: /(шанс|вероятност|поступлю ли|пройду ли|смогу ли поступ|мүмкіндіг|түсе аламын ба|chance|will i get in|can i get in)/,
  profile:
    /(по (моему|моим) (тест|результат)|по тесту|мои результат|мне подход|подход\w* мне|подходит ли мне|тест нәтиже|тестім|маған сәикес|маған сәйкес|маған қаи|my (test|result)|suit(s)? me|fit(s)? me|right for me)/,
  compare: /(отлича|отличи|разниц|сравн|чем .+ от|айырмашы|салыстыр|differ|compare|\bvs\b|versus)/,
  interest: /(нравит|люблю|интерес|увлека|хорошо (дается|даются|получается)|ұнаиды|ұнайды|қызық|жақсы көрем|i (like|love|enjoy)|interested in|good at)/,
  vague:
    /(как\w* професси\w* выбрать|кем (стать|быть|работать)|не знаю кем|выбрать професси|помоги\w* (выбрать|определиться)|не могу (выбрать|определиться)|қандаи мамандық|қандай мамандық|кім болам|мамандық таңда|what (profession|career|job)|which (profession|career|job)|choose a (profession|career)|what should i (do|become|study))/,
  math: /(математ|алгебр|геометр|math)/,
  start:
    /(с чего начать|как пользоваться|что умеет (саит|сайт)|что такое next|что это за (саит|сайт)|для чего (саит|сайт)|неден бастау|қалаи пайдалан|қалай пайдалан|where (do i |should i |to )?start|how (do i |to )use|what is next ?path|what can (this|the) site)/,
  results: /(результат|нәтиже|results)/,
  test: /(тест|test)/,
  careerMap: /(карьерн\w* карт|карт\w* карьер|мансап карта|career ?(map|path))/,
  favourites: /(избранн|сохран|сердечк|таңдаулы|сақта|favou?rite|save|bookmark)/,
  admissionPlan: /(план\w* поступлен|чек.?лист|түсу жоспар|admission plan|checklist)/,
  grants: /(грант|бюджет|стипенд|grant|scholarship)/,
  search: /(поиск|как наити|где наити|іздеу|search)/,
  reviews: /(отзыв|пікір|review)/,
  language: /((сменить|переключ|поменять)\w* язык|язык\w* (сайта|интерфейс)|на казахском|на английском|тілді ауыстыр|change (the )?language|switch language)/,
  filters: /(фильтр|сортир|сүзгі|сұрыпта|filter|sort)/,
  about: /(о проекте|кто сделал|откуда (данные|информаци)|жоба туралы|деректер қаидан|about (the )?(project|site)|where does the data)/,
  directionsList: /(как\w* (есть )?направлени|список направлен|все направлени|қандаи бағыт|қандай бағыт|бағыттар тізім|what directions|list of directions|which directions)/,
  universitiesList: /(как\w* (есть )?(университет|вуз)|список (университет|вуз)|все (университет|вуз)|қандаи (университет|жоо)|қандай (университет|жоо)|what universities|which universities|list of universities)/,
  followUp: /^(а |и |а что|а как|а где|а сколько|ал |ал не|and |what about|how about)|(\bтам\b|\bтут\b|\bэт(о|ом|от|а|ои|ого)\b|\bнего\b|\bнее\b|\bнем\b|онда|осы|\bthere\b|\bit\b|\bthis\b)/,
  here: /(\bтут\b|\bздесь\b|эта страниц|этои страниц|эта професси|этот (вуз|университет)|это направлени|осы бет|осы мамандық|this page|this (profession|university|direction))/,
  // Aspects of a record
  cost: /(стоим|стоит|цен[аы]|сколько .*плат|оплат|платн|ақы|баға|құны|tuition|cost|price|fee)/,
  exams: /(экзамен|\bент\b|ielts|\bsat\b|сдава|емтихан|exam|entrance)/,
  deadline: /(срок|дедлаин|когда .*(пода|поступ|прием)|мерзім|deadline|when (to|do|can|should) (i )?apply)/,
  contacts: /(контакт|телефон|почт|email|e-mail|адрес|сайт (вуза|университета)|официальн\w* сайт|байланыс|мекенжаи|мекенжай|contact|phone|website|address)/,
  programs: /(программ|специальност|факультет|бағдарлама|program|major|faculty|degree)/,
  subjects: /(предмет|пән|subject)/,
  skills: /(навык|качеств|умени|знани|нужно знать|уметь|дағды|қасиет|skill|qualit|need to know)/,
  salary: /(зарплат|зарабат|доход|получа|жалақы|табыс|salary|earn|income|pay)/,
  where: /(где (учиться|можно учиться|получить|выучиться|обучают)|куда поступ|в как\w* (вуз|университет)|как\w* (вуз|университет)|қаида оқ|қайда оқ|қаи (жоо|университет)|қай (жоо|университет)|where (to |can i |do i )?(study|learn)|which universit|what universit)/,
  prosCons: /(плюс|минус|недостат|преимущ|сложност|артықшыл|кемшіл|pros|cons|downside|advantage|disadvantage)/,
  demand: /(востребован|сұраныс|demand|in demand)/,
  whatDo: /(чем занима|что делает|что делают|кто так|кто это|немен аиналыс|немен айналыс|не істеиді|не істейді|what does|what do|who is)/
}).map(([key, pattern]) => [key, unicode(pattern)])) as Record<string, RegExp>;

const has = (pattern: RegExp, text: string) => pattern.test(text);

// ---------------------------------------------------------------------------
// Writing answers

function field(label: string, value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? `**${label}:** ${trimmed}` : null;
}

function listField(label: string, values: string[], max = 6): string | null {
  return values.length > 0 ? `**${label}:** ${values.slice(0, max).join(", ")}` : null;
}

function lines(...items: (string | null | undefined | false)[]): string {
  return items.filter((item): item is string => typeof item === "string" && item.length > 0).join("\n");
}

function paragraphs(...items: (string | null | undefined | false)[]): string {
  return items.filter((item): item is string => typeof item === "string" && item.trim().length > 0).join("\n\n");
}

const bullets = (items: string[]) => items.map((item) => `- ${item}`).join("\n");

const professionLink = (profession: ProfessionDoc, lang: Lang) => `[${pick(profession.name, lang)}](/professions/${profession.slug})`;
const directionLink = (direction: DirectionDoc, lang: Lang) => `[${pick(direction.name, lang)}](/directions/${direction.slug})`;
const universityLink = (university: UniversityDoc, lang: Lang) => `[${pick(university.name, lang)}](/universities/${university.slug})`;

function professionAnswer(base: KnowledgeBase, profession: ProfessionDoc, n: string, t: Texts, lang: Lang): string {
  const name = pick(profession.name, lang);
  const universities = universitiesForProfession(base, profession, 5);
  const direction = base.directions.find((item) => item.slug === profession.directionSlug);
  const facts: string[] = [];

  if (has(P.where, n) || (has(P.programs, n) && !has(P.subjects, n))) {
    return paragraphs(
      `${t.fromBase}, **${name}** — ${t.whereToStudy.toLowerCase()}:`,
      universities.length > 0 ? bullets(universities.map((university) => {
        const place = [pick(university.city, lang), pick(university.country, lang)].filter(Boolean).join(", ");
        return `${universityLink(university, lang)}${place ? ` — ${place}` : ""}`;
      })) : t.noUniversities,
      listField(t.specialties, profession.specialties),
      t.nextUniversity
    );
  }
  if (has(P.subjects, n)) facts.push(listField(t.subjects, pickList(profession.schoolSubjects, lang)) ?? `**${t.subjects}:** ${t.noData}`);
  if (has(P.skills, n)) facts.push(listField(t.skills, pickList(profession.skills, lang)) ?? `**${t.skills}:** ${t.noData}`);
  if (has(P.salary, n)) facts.push(field(t.salary, pick(profession.salaryLabel, lang)) ?? `**${t.salary}:** ${t.noData}`);
  if (has(P.demand, n)) facts.push(field(t.demand, pick(profession.demandLabel, lang)) ?? `**${t.demand}:** ${t.noData}`);
  if (has(P.prosCons, n)) {
    facts.push(listField(t.pros, pickList(profession.pros, lang)) ?? `**${t.pros}:** ${t.noData}`);
    facts.push(listField(t.cons, pickList(profession.cons, lang)) ?? `**${t.cons}:** ${t.noData}`);
  }
  if (has(P.whatDo, n)) facts.push(field(t.whatTheyDo, pick(profession.whatTheyDo, lang) || pick(profession.shortDescription, lang)) ?? `**${t.whatTheyDo}:** ${t.noData}`);

  if (facts.length > 0) {
    return paragraphs(`${t.fromBase}, **${name}**:`, lines(...facts), t.openPage(name, `/professions/${profession.slug}`));
  }

  return paragraphs(
    `**${name}**${pick(profession.shortDescription, lang) ? ` — ${pick(profession.shortDescription, lang)}` : ""}`,
    lines(
      field(t.whatTheyDo, pick(profession.whatTheyDo, lang)),
      direction ? `**${t.direction}:** ${directionLink(direction, lang)}` : null,
      listField(t.subjects, pickList(profession.schoolSubjects, lang)),
      listField(t.skills, pickList(profession.skills, lang), 5),
      field(t.salary, pick(profession.salaryLabel, lang)),
      field(t.demand, pick(profession.demandLabel, lang)),
      universities.length > 0 ? `**${t.whereToStudy}:** ${universities.slice(0, 3).map((university) => universityLink(university, lang)).join(", ")}` : null
    ),
    `${t.openPage(name, `/professions/${profession.slug}`)} ${t.nextCompare}`
  );
}

function universityAnswer(base: KnowledgeBase, university: UniversityDoc, n: string, t: Texts, lang: Lang): string {
  const name = pick(university.name, lang);
  const admission = university.admission;
  const facts: string[] = [];
  let missingAny = false;
  const add = (label: string, value: string | null | undefined) => {
    const line = field(label, value);
    if (line) facts.push(line);
    else {
      facts.push(`**${label}:** ${t.noData}`);
      missingAny = true;
    }
  };

  if (has(P.cost, n)) add(t.tuition, pick(university.tuitionNote, lang));
  if (has(P.exams, n)) {
    add(t.exams, admission ? pick(admission.exams, lang) : "");
    if (admission?.ielts) facts.push(`**IELTS:** ${admission.ielts}`);
    if (admission?.sat) facts.push(`**SAT:** ${admission.sat}`);
  }
  if (has(P.grants, n)) add(t.grants, admission?.grants);
  if (has(P.deadline, n)) add(t.deadline, admission?.deadline);
  if (has(P.contacts, n)) {
    const contacts = lines(
      university.website ? `**${t.website}:** [${university.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}](${university.website})` : null,
      field(t.email, university.email),
      field(t.phone, university.phone),
      field(t.address, university.address)
    );
    if (contacts) facts.push(contacts);
    else add(t.contactsLabel, "");
  }
  if (has(P.programs, n)) {
    const directions = base.directions.filter((direction) => university.directionSlugs.includes(direction.slug));
    add(t.programs, university.programNames.slice(0, 10).join(", "));
    if (directions.length > 0) facts.push(`**${t.direction}:** ${directions.map((direction) => directionLink(direction, lang)).join(", ")}`);
  }

  if (facts.length > 0) {
    return paragraphs(
      `${t.fromBase}, **${name}**:`,
      lines(...facts),
      missingAny ? (university.website ? t.checkSite(university.website) : t.checkOfficial) : null,
      t.openPage(name, `/universities/${university.slug}`)
    );
  }

  const place = [pick(university.country, lang), pick(university.city, lang)].filter(Boolean).join(", ");
  const directions = base.directions.filter((direction) => university.directionSlugs.includes(direction.slug));
  return paragraphs(
    `**${name}**${place ? ` — ${place}` : ""}`,
    lines(
      field(t.description, pick(university.description, lang)),
      field(t.rating, pick(university.ratingLabel, lang)),
      field(t.tuition, pick(university.tuitionNote, lang)),
      directions.length > 0 ? `**${t.direction}:** ${directions.map((direction) => directionLink(direction, lang)).join(", ")}` : null,
      admission ? field(t.exams, pick(admission.exams, lang)) : null,
      admission ? field(t.grants, admission.grants) : null,
      admission ? field(t.deadline, admission.deadline) : null,
      university.website ? `**${t.website}:** [${university.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}](${university.website})` : null
    ),
    `${t.openPage(name, `/universities/${university.slug}`)} ${t.nextUniversity}`
  );
}

function directionAnswer(base: KnowledgeBase, direction: DirectionDoc, n: string, t: Texts, lang: Lang): string {
  const name = pick(direction.name, lang);
  const professions = base.professions.filter((profession) => profession.directionSlug === direction.slug);
  const universities = base.universities.filter((university) => university.directionSlugs.includes(direction.slug));

  if (has(P.where, n)) {
    return paragraphs(
      `${t.fromBase}, **${name}** — ${t.whereToStudy.toLowerCase()}:`,
      universities.length > 0 ? bullets(universities.slice(0, 6).map((university) => universityLink(university, lang))) : t.noUniversities,
      t.nextUniversity
    );
  }
  if (has(P.subjects, n) || has(P.skills, n)) {
    return paragraphs(
      `${t.fromBase}, **${name}**:`,
      lines(
        has(P.subjects, n) ? (listField(t.subjects, pickList(direction.schoolSubjects, lang)) ?? `**${t.subjects}:** ${t.noData}`) : null,
        has(P.skills, n) ? (listField(t.skills, pickList(direction.skills, lang)) ?? `**${t.skills}:** ${t.noData}`) : null
      ),
      t.openPage(name, `/directions/${direction.slug}`)
    );
  }
  return paragraphs(
    `**${name}**`,
    lines(
      field(t.description, pick(direction.description, lang)),
      field(t.whoItSuits, pick(direction.whoItSuits, lang)),
      listField(t.subjects, pickList(direction.schoolSubjects, lang)),
      listField(t.skills, pickList(direction.skills, lang), 5)
    ),
    professions.length > 0 ? `${t.professionsIn(name)}:\n${bullets(professions.slice(0, 8).map((profession) => professionLink(profession, lang)))}` : null,
    t.openPage(name, `/directions/${direction.slug}`)
  );
}

function compareAnswer(professions: ProfessionDoc[], t: Texts, lang: Lang): string {
  const [first, second] = professions;
  const row = (profession: ProfessionDoc) =>
    paragraphs(
      `**${pick(profession.name, lang)}**`,
      lines(
        field(t.whatTheyDo, pick(profession.whatTheyDo, lang) || pick(profession.shortDescription, lang)),
        listField(t.skills, pickList(profession.skills, lang), 4),
        listField(t.subjects, pickList(profession.schoolSubjects, lang), 4),
        field(t.salary, pick(profession.salaryLabel, lang)),
        field(t.demand, pick(profession.demandLabel, lang))
      )
    );
  const shared = pickList(first.schoolSubjects, lang).filter((subject) =>
    pickList(second.schoolSubjects, lang).some((other) => normalizeForSearch(other) === normalizeForSearch(subject))
  );
  return paragraphs(
    `${t.compareIntro}:`,
    row(first),
    row(second),
    shared.length > 0 ? `**${t.subjects} (${lang === "en" ? "both" : lang === "kk" ? "екеуіне ортақ" : "общие"}):** ${shared.join(", ")}` : null,
    `${t.more}: ${professionLink(first, lang)}, ${professionLink(second, lang)}.`
  );
}

function profileAnswer(base: KnowledgeBase, profile: VisitorProfile, t: Texts, lang: Lang): string {
  const top = profile.topDirections
    .map((score) => ({score, direction: base.directions.find((direction) => direction.slug === score.slug)}))
    .filter((entry): entry is {score: {slug: string; percent: number}; direction: DirectionDoc} => Boolean(entry.direction));
  if (top.length === 0) return t.noTest(section("/test", lang));

  const favourites = profile.favouriteProfessions
    .map((slug) => base.professions.find((profession) => profession.slug === slug))
    .filter((profession): profession is ProfessionDoc => Boolean(profession));

  return paragraphs(
    `${t.testTop}:`,
    bullets(
      top.map(({score, direction}) => {
        const professions = base.professions.filter((profession) => profession.directionSlug === direction.slug).slice(0, 3);
        const list = professions.length > 0 ? `: ${professions.map((profession) => professionLink(profession, lang)).join(", ")}` : "";
        return `${directionLink(direction, lang)} — ${Math.round(score.percent)}%${list}`;
      })
    ),
    t.testNote,
    favourites.length > 0 ? `${t.favouriteNote}: ${favourites.map((profession) => professionLink(profession, lang)).join(", ")}.` : null,
    `${t.openPage(SECTION_TITLES["/career-path"][lang], "/career-path")}`
  );
}

/** Directions whose school subjects appear in the question ("люблю биологию" → medicine). */
function directionsBySubject(base: KnowledgeBase, n: string): {subject: string; directions: DirectionDoc[]} | null {
  const words = n.split(/[^\p{L}\p{N}]+/u).filter((word) => word.length >= 4);
  for (const direction of base.directions) {
    for (const subject of [...direction.schoolSubjects.ru, ...direction.schoolSubjects.kk, ...direction.schoolSubjects.en]) {
      const stem = normalizeForSearch(subject).slice(0, 5);
      if (stem.length < 4 || !words.some((word) => word.startsWith(stem))) continue;
      const directions = base.directions.filter((item) =>
        [...item.schoolSubjects.ru, ...item.schoolSubjects.kk, ...item.schoolSubjects.en].some((other) => normalizeForSearch(other).startsWith(stem))
      );
      return {subject, directions};
    }
  }
  return null;
}

function platformAnswer(n: string, base: KnowledgeBase, t: Texts, lang: Lang): string | null {
  if (has(P.start, n)) return t.start(section("/test", lang), section("/directions", lang), section("/career-path", lang));
  if (has(P.careerMap, n)) return t.careerMap(section("/career-path", lang));
  if (has(P.admissionPlan, n)) return t.admissionPlan(section("/admission-plan", lang));
  if (has(P.test, n) && !has(P.profile, n)) return t.test(section("/test", lang), section("/test/results", lang));
  if (has(P.favourites, n)) return t.favourites(section("/favorites", lang));
  if (has(P.grants, n)) {
    const count = base.universities.filter((university) => university.admission?.grants.trim()).length;
    return t.grantsSection(section("/grants", lang), count);
  }
  if (has(P.language, n)) return t.language;
  if (has(P.filters, n)) return t.filters(section("/professions", lang), section("/universities", lang));
  if (has(P.reviews, n)) return t.reviews(section("/reviews", lang));
  if (has(P.about, n)) return t.about(section("/about", lang));
  if (has(P.search, n)) return t.search(section("/search", lang));
  return null;
}

function missingFeatureAnswer(n: string, t: Texts, lang: Lang, foundProfession: boolean): string | null {
  const notes: [RegExp, string, string][] = [
    [P.account, t.features.account, t.accountNote],
    [P.apply, t.features.apply, t.applyNote(section("/admission-plan", lang))],
    // "оператор" or "менеджер" in a profession's name is not a request for a live consultant.
    ...(foundProfession ? [] : ([[P.human, t.features.human, t.humanNote]] as [RegExp, string, string][])),
    [P.payment, t.features.payment, t.paymentNote],
    [P.chances, t.features.chances, t.chancesNote(section("/admission-plan", lang))]
  ];
  const hit = notes.find(([pattern]) => has(pattern, n));
  if (!hit) return null;
  const [, what, note] = hit;
  return paragraphs(
    `${t.missingFeature(what)} ${note}`,
    `${t.instead}: ${[section("/test", lang), section("/professions", lang), section("/universities", lang), section("/admission-plan", lang), section("/career-path", lang)].join(", ")}.`
  );
}

/** "IT", "AI": names too short for the stem search, matched as whole words. */
function directionByShortName(base: KnowledgeBase, n: string): DirectionDoc | undefined {
  const words = new Set(n.split(/[^\p{L}\p{N}]+/u).filter((word) => word.length === 2));
  if (words.size === 0) return undefined;
  return base.directions.find((direction) =>
    [direction.name.ru, direction.name.kk, direction.name.en].some((name) =>
      normalizeForSearch(name).split(/[^\p{L}\p{N}]+/u).some((word) => words.has(word))
    )
  );
}

function anyMatch(matches: Matches): boolean {
  return matches.directions.length + matches.professions.length + matches.universities.length > 0;
}

/**
 * One reply of the rule-based assistant. Pure: everything it needs is passed
 * in, so it is unit-tested without a database.
 */
export function localReply({
  base,
  locale,
  messages,
  pathname,
  profile
}: {
  base: KnowledgeBase;
  locale: Locale;
  messages: ChatTurn[];
  pathname: string;
  profile: VisitorProfile;
}): string {
  const question = messages[messages.length - 1]?.content ?? "";
  const lang = replyLanguage(question, locale);
  const t = L[lang];
  const n = normalizeForSearch(question);

  // Safety and boundaries come first.
  if (has(P.crisis, n)) return t.crisis;
  if (has(P.offTopic, n)) return t.offTopic;

  let matches = findMatches(base, question);

  // A follow-up ("а сколько там стоит?") or "this page" refers to the record
  // the conversation or the page is about.
  if (!anyMatch(matches)) {
    const previous = messages.slice(0, -1);
    const isFollowUp = previous.length > 0 && (has(P.followUp, n) || n.length < 40);
    if (isFollowUp) {
      const earlierQuestion = [...previous].reverse().find((turn) => turn.role === "user")?.content ?? "";
      const lastReply = [...previous].reverse().find((turn) => turn.role === "assistant")?.content.slice(0, 300) ?? "";
      const fromQuestion = findMatches(base, earlierQuestion);
      matches = anyMatch(fromQuestion) ? fromQuestion : findMatches(base, lastReply);
      // Keep only the main subject of the conversation.
      if (matches.universities.length > 0) matches = {directions: [], professions: [], universities: matches.universities.slice(0, 1)};
      else if (matches.professions.length > 0) matches = {directions: [], professions: matches.professions.slice(0, 1), universities: []};
      else matches = {...matches, directions: matches.directions.slice(0, 1)};
    }
    if (!anyMatch(matches) && (has(P.here, n) || !isFollowUp)) {
      const context = pageContext(pathname);
      if (context && context.kind !== "section" && (has(P.here, n) || has(P.cost, n) || has(P.exams, n) || has(P.subjects, n) || has(P.salary, n) || has(P.where, n))) {
        if (context.kind === "profession") matches.professions = base.professions.filter((item) => item.slug === context.slug);
        if (context.kind === "university") matches.universities = base.universities.filter((item) => item.slug === context.slug);
        if (context.kind === "direction") matches.directions = base.directions.filter((item) => item.slug === context.slug);
      }
    }
  }

  const found = anyMatch(matches);

  if (!found && has(P.greeting, n) && n.length < 40) return t.greeting;
  if (!found && has(P.thanks, n) && n.length < 60) return t.thanks;

  // Module 1 — features that do not exist are named as such.
  const missingFeature = missingFeatureAnswer(n, t, lang, matches.professions.length > 0);
  if (missingFeature) return missingFeature;

  // Module 2 — the visitor's own test result.
  if (has(P.profile, n)) return profileAnswer(base, profile, t, lang);

  // Module 2 — comparing professions.
  if (has(P.compare, n)) {
    if (matches.professions.length >= 2) return compareAnswer(matches.professions, t, lang);
    if (matches.professions.length === 1) return t.compareOne(pick(matches.professions[0].name, lang));
    const direction = matches.directions[0] ?? directionByShortName(base, n);
    const pool = direction ? base.professions.filter((profession) => profession.directionSlug === direction.slug) : base.professions;
    if (pool.length >= 2) return t.compareAsk(pool.slice(0, 8).map((profession) => pick(profession.name, lang)).join(", "));
  }

  // Modules 2 and 3 — catalogue records.
  if (matches.universities.length > 0 && !(matches.professions.length > 0 && has(P.where, n))) {
    const [first, ...rest] = matches.universities;
    return paragraphs(
      universityAnswer(base, first, n, t, lang),
      rest.length > 0 ? `${t.alsoFound}: ${rest.slice(0, 3).map((university) => universityLink(university, lang)).join(", ")}.` : null
    );
  }
  if (matches.professions.length > 0) {
    const [first, ...rest] = matches.professions;
    return paragraphs(
      professionAnswer(base, first, n, t, lang),
      rest.length > 0 ? `${t.alsoFound}: ${rest.slice(0, 3).map((profession) => professionLink(profession, lang)).join(", ")}.` : null
    );
  }

  // Module 2 — interests and school subjects: offer several directions and ask a clarifying question.
  if (has(P.interest, n) || has(P.vague, n)) {
    if (has(P.math, n)) {
      const bySubject = directionsBySubject(base, n);
      return paragraphs(
        t.mathQuestion,
        bySubject && bySubject.directions.length > 0 ? `${t.bySubject(bySubject.subject)}: ${bySubject.directions.map((direction) => directionLink(direction, lang)).join(", ")}.` : null
      );
    }
    const bySubject = directionsBySubject(base, n);
    const directions = bySubject?.directions.length ? bySubject.directions : matches.directions;
    if (directions.length > 0) {
      return paragraphs(
        bySubject ? `${t.bySubject(bySubject.subject)}:` : `${t.fromBase}:`,
        bullets(directions.slice(0, 4).map((direction) => {
          const description = pick(direction.whoItSuits, lang) || pick(direction.description, lang);
          return `${directionLink(direction, lang)}${description ? ` — ${description}` : ""}`;
        })),
        t.interestQuestion,
        profile.topDirections.length === 0 ? t.nextTest(section("/test", lang)) : null
      );
    }
    if (has(P.vague, n) || !found) return t.vague(section("/test", lang));
  }

  if (matches.directions.length > 0) return directionAnswer(base, matches.directions[0], n, t, lang);

  // Module 1 — how the site works.
  const platform = platformAnswer(n, base, t, lang);
  if (platform) return platform;

  if (has(P.directionsList, n)) {
    return paragraphs(`${t.directionsList}:`, bullets(base.directions.map((direction) => directionLink(direction, lang))) || t.noData);
  }
  if (has(P.universitiesList, n)) {
    return paragraphs(
      `${t.universitiesList}:`,
      base.universities.length > 0 ? bullets(base.universities.slice(0, 10).map((university) => universityLink(university, lang))) : t.noData,
      base.universities.length > 10 ? section("/universities", lang) : null
    );
  }
  if (has(P.greeting, n)) return t.greeting;

  // Nothing matched: say so honestly and point to a reliable route.
  const query = question.trim().slice(0, 80);
  const searchLink = `[${t.searchLabel}](/search?q=${encodeURIComponent(query)})`;
  return paragraphs(t.notFound(searchLink), t.canHelp);
}

/**
 * Streams a ready reply in small pieces with short pauses, so the local
 * assistant appears in the chat the same way a model's answer does.
 */
export function streamText(text: string, signal?: AbortSignal): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const pieces = text.match(/\S+\s*|\s+/g) ?? [text];
  let index = 0;
  let first = true;
  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, ms);
      signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        resolve();
      }, {once: true});
    });

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (signal?.aborted) {
        controller.close();
        return;
      }
      await wait(first ? 450 : 28);
      first = false;
      if (index >= pieces.length) {
        controller.close();
        return;
      }
      const chunk = pieces.slice(index, index + 2).join("");
      index += 2;
      controller.enqueue(encoder.encode(chunk));
    }
  });
}
