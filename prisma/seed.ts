/**
 * ============================================================================
 * SEED_DATA_PLACEHOLDER
 * ============================================================================
 *
 * This file exists ONLY as a fallback for environments that cannot reach the
 * team's Google Sheet (offline development, CI, a fresh clone before the first
 * import). The real catalogue lives in the sheet and is loaded with:
 *
 *     pnpm db:import:sheet
 *
 * Everything below is invented demonstration content. It is deliberately small,
 * it is labelled in the UI-visible description text, and it must never be
 * presented as verified information about a real university or profession:
 *
 *   • no real admission deadlines, ratings, tuition figures or contact details
 *   • no reviews (the Review table stays empty by design)
 *   • no salary numbers — the real source records pay as a level, not a figure
 *
 * The seed refuses to run when the database already holds data, so it can never
 * overwrite an import. Pass `--force` to reseed a scratch database on purpose.
 *
 * Kazakh and English columns are written empty, exactly like the importer does:
 * an empty column means "not translated yet" (see `lib/content.ts`).
 * ============================================================================
 */
import {PrismaClient, type Prisma} from "@prisma/client";

const db = new PrismaClient();

const PLACEHOLDER_NOTE = "Демонстрационные данные Next Path. Реальный каталог загружается из таблицы командой pnpm db:import:sheet.";

type SeedProfession = {
  slug: string;
  name: string;
  description: string;
  salaryLabel: string;
  salaryRank: number;
  demand: "LOW" | "MEDIUM" | "HIGH";
  demandLabel: string;
  specialties: string[];
  skills: string[];
  subjects: string[];
  pros: string[];
  cons: string[];
};

type SeedDirection = {
  slug: string;
  name: string;
  icon: string;
  description: string;
  whoItSuits: string;
  professions: SeedProfession[];
};

const DIRECTIONS: SeedDirection[] = [
  {
    slug: "it-ai",
    name: "IT / AI",
    icon: "cpu",
    description: "Разработка программного обеспечения, работа с данными и системами искусственного интеллекта.",
    whoItSuits: "Направление подходит тем, кому близки логика, работа с данными и решение технических задач.",
    professions: [
      {
        slug: "software-engineer",
        name: "Software Engineer",
        description: "Разрабатывает программное обеспечение и веб-сервисы.",
        salaryLabel: "Высокая",
        salaryRank: 3,
        demand: "HIGH",
        demandLabel: "Очень высокая",
        specialties: ["Computer Science", "Software Engineering"],
        skills: ["Логика", "программирование"],
        subjects: ["Математика", "Информатика"],
        pros: ["Востребованность", "удалённая работа"],
        cons: ["Постоянное обучение"]
      },
      {
        slug: "data-analyst",
        name: "Data Analyst",
        description: "Анализирует данные и готовит отчёты для принятия решений.",
        salaryLabel: "Высокая",
        salaryRank: 3,
        demand: "HIGH",
        demandLabel: "Высокая",
        specialties: ["Data Analytics"],
        skills: ["Аналитика", "статистика"],
        subjects: ["Математика", "Информатика"],
        pros: ["Понятный вход в профессию"],
        cons: ["Много рутинной работы с данными"]
      }
    ]
  },
  {
    slug: "medicine",
    name: "MEDICINE",
    icon: "stethoscope",
    description: "Диагностика и лечение, биомедицинские технологии и забота о здоровье людей.",
    whoItSuits: "Направление подходит внимательным и ответственным людям, готовым помогать другим.",
    professions: [
      {
        slug: "general-practitioner",
        name: "General Practitioner",
        description: "Ведёт первичный приём пациентов и лечит общие заболевания.",
        salaryLabel: "Средняя",
        salaryRank: 1,
        demand: "HIGH",
        demandLabel: "Очень высокая",
        specialties: ["General Medicine"],
        skills: ["Диагностика", "коммуникация"],
        subjects: ["Биология", "Химия"],
        pros: ["Стабильная работа"],
        cons: ["Высокая нагрузка"]
      },
      {
        slug: "surgeon",
        name: "Surgeon",
        description: "Проводит операции и хирургическое лечение.",
        salaryLabel: "Высокая",
        salaryRank: 3,
        demand: "HIGH",
        demandLabel: "Высокая",
        specialties: ["Surgery"],
        skills: ["Точность", "выносливость"],
        subjects: ["Биология", "Химия"],
        pros: ["Значимость работы"],
        cons: ["Длительное обучение"]
      }
    ]
  },
  {
    slug: "engineering-architecture",
    name: "ENGINEERING / ARCHITECTURE",
    icon: "ruler",
    description: "Проектирование зданий, инфраструктуры, машин и новых материалов.",
    whoItSuits: "Направление подходит тем, у кого развито пространственное мышление и интерес к технике.",
    professions: [
      {
        slug: "civil-engineer",
        name: "Civil Engineer",
        description: "Проектирует и сопровождает строительство объектов.",
        salaryLabel: "Средняя",
        salaryRank: 1,
        demand: "MEDIUM",
        demandLabel: "Средняя",
        specialties: ["Civil Engineering"],
        skills: ["Расчёты", "проектирование"],
        subjects: ["Математика", "Физика"],
        pros: ["Виден результат работы"],
        cons: ["Ответственность за безопасность"]
      },
      {
        slug: "architect",
        name: "Architect",
        description: "Разрабатывает архитектурные решения зданий и пространств.",
        salaryLabel: "Средняя",
        salaryRank: 1,
        demand: "MEDIUM",
        demandLabel: "Средняя",
        specialties: ["Architecture"],
        skills: ["Черчение", "композиция"],
        subjects: ["Математика", "Черчение"],
        pros: ["Творческая составляющая"],
        cons: ["Долгие согласования"]
      }
    ]
  },
  {
    slug: "business-economics",
    name: "BUSINESS / ECONOMICS",
    icon: "briefcase",
    description: "Управление капиталом, экономический анализ и развитие компаний.",
    whoItSuits: "Направление подходит тем, кто любит организовывать процессы и работать с числами.",
    professions: [
      {
        slug: "financial-analyst",
        name: "Financial Analyst",
        description: "Оценивает финансовые показатели и готовит рекомендации.",
        salaryLabel: "Высокая",
        salaryRank: 3,
        demand: "HIGH",
        demandLabel: "Высокая",
        specialties: ["Finance"],
        skills: ["Финансовый анализ", "Excel"],
        subjects: ["Математика", "География"],
        pros: ["Карьерный рост"],
        cons: ["Высокая конкуренция"]
      },
      {
        slug: "marketing-manager",
        name: "Marketing Manager",
        description: "Планирует продвижение продуктов и работу с аудиторией.",
        salaryLabel: "Средняя",
        salaryRank: 1,
        demand: "MEDIUM",
        demandLabel: "Средняя",
        specialties: ["Marketing"],
        skills: ["Коммуникация", "аналитика"],
        subjects: ["Математика", "Литература"],
        pros: ["Разнообразие задач"],
        cons: ["Зависимость от результатов"]
      }
    ]
  },
  {
    slug: "design-creative",
    name: "DESIGN / CREATIVE",
    icon: "palette",
    description: "Визуальное оформление идей и создание цифровых и медийных продуктов.",
    whoItSuits: "Направление подходит тем, кто мыслит образами и любит создавать новое.",
    professions: [
      {
        slug: "ux-designer",
        name: "UX Designer",
        description: "Проектирует удобные интерфейсы и пользовательские сценарии.",
        salaryLabel: "Высокая",
        salaryRank: 3,
        demand: "HIGH",
        demandLabel: "Высокая",
        specialties: ["UX Design"],
        skills: ["Прототипирование", "исследования"],
        subjects: ["Информатика", "Черчение"],
        pros: ["Сочетание логики и творчества"],
        cons: ["Много правок"]
      },
      {
        slug: "graphic-designer",
        name: "Graphic Designer",
        description: "Создаёт визуальные материалы и фирменный стиль.",
        salaryLabel: "Средняя",
        salaryRank: 1,
        demand: "MEDIUM",
        demandLabel: "Средняя",
        specialties: ["Graphic Design"],
        skills: ["Композиция", "типографика"],
        subjects: ["Черчение", "Литература"],
        pros: ["Творческая свобода"],
        cons: ["Нестабильная загрузка"]
      }
    ]
  },
  {
    slug: "psychology-social-sciences",
    name: "PSYCHOLOGY / SOCIAL SCIENCES",
    icon: "brain",
    description: "Изучение человеческого поведения, общества и коммуникации.",
    whoItSuits: "Направление подходит тем, кому интересны люди, мотивация и общественные процессы.",
    professions: [
      {
        slug: "psychologist",
        name: "Psychologist",
        description: "Помогает людям справляться с трудностями и развиваться.",
        salaryLabel: "Средняя",
        salaryRank: 1,
        demand: "HIGH",
        demandLabel: "Высокая",
        specialties: ["Psychology"],
        skills: ["Эмпатия", "наблюдательность"],
        subjects: ["Биология", "Литература"],
        pros: ["Помощь людям"],
        cons: ["Эмоциональная нагрузка"]
      },
      {
        slug: "sociologist",
        name: "Sociologist",
        description: "Исследует общественные процессы и настроения.",
        salaryLabel: "Средняя",
        salaryRank: 1,
        demand: "MEDIUM",
        demandLabel: "Средняя",
        specialties: ["Sociology"],
        skills: ["Исследования", "статистика"],
        subjects: ["История", "Математика"],
        pros: ["Работа с реальными данными"],
        cons: ["Небольшой рынок вакансий"]
      }
    ]
  },
  {
    slug: "law-government",
    name: "LAW / GOVERNMENT",
    icon: "scale",
    description: "Защита прав, юридическое сопровождение и государственное управление.",
    whoItSuits: "Направление подходит тем, кто ценит порядок, аргументацию и справедливость.",
    professions: [
      {
        slug: "lawyer",
        name: "Lawyer",
        description: "Консультирует и представляет интересы в правовых вопросах.",
        salaryLabel: "Высокая",
        salaryRank: 3,
        demand: "HIGH",
        demandLabel: "Высокая",
        specialties: ["Law"],
        skills: ["Аргументация", "работа с документами"],
        subjects: ["История", "Литература"],
        pros: ["Востребованность"],
        cons: ["Большой объём текста"]
      },
      {
        slug: "public-administrator",
        name: "Public Administrator",
        description: "Организует работу государственных программ и услуг.",
        salaryLabel: "Средняя",
        salaryRank: 1,
        demand: "MEDIUM",
        demandLabel: "Средняя",
        specialties: ["Public Administration"],
        skills: ["Организация", "коммуникация"],
        subjects: ["История", "География"],
        pros: ["Социальная значимость"],
        cons: ["Бюрократия"]
      }
    ]
  },
  {
    slug: "education-science",
    name: "EDUCATION / SCIENCE",
    icon: "flask-conical",
    description: "Фундаментальные исследования, преподавание и развитие знаний.",
    whoItSuits: "Направление подходит любознательным людям, которым нравится разбираться и объяснять.",
    professions: [
      {
        slug: "researcher",
        name: "Researcher",
        description: "Проводит исследования и публикует результаты.",
        salaryLabel: "Средняя",
        salaryRank: 1,
        demand: "MEDIUM",
        demandLabel: "Средняя",
        specialties: ["Natural Sciences"],
        skills: ["Анализ", "эксперимент"],
        subjects: ["Физика", "Математика"],
        pros: ["Интеллектуальная работа"],
        cons: ["Долгий путь к результату"]
      },
      {
        slug: "teacher",
        name: "Teacher",
        description: "Преподаёт предмет и сопровождает учеников.",
        salaryLabel: "Средняя",
        salaryRank: 1,
        demand: "HIGH",
        demandLabel: "Высокая",
        specialties: ["Education"],
        skills: ["Объяснение", "терпение"],
        subjects: ["Литература", "История"],
        pros: ["Значимость работы"],
        cons: ["Высокая нагрузка"]
      }
    ]
  }
];

const UNIVERSITIES = [
  {
    slug: "seed-university-astana",
    name: "Демонстрационный университет (Астана)",
    country: "Казахстан",
    city: "Астана",
    directions: ["it-ai", "engineering-architecture", "business-economics", "education-science"]
  },
  {
    slug: "seed-university-almaty",
    name: "Демонстрационный университет (Алматы)",
    country: "Казахстан",
    city: "Алматы",
    directions: ["medicine", "psychology-social-sciences", "law-government", "design-creative"]
  },
  {
    slug: "seed-university-international",
    name: "Демонстрационный зарубежный университет",
    country: "США",
    city: "Бостон",
    directions: ["it-ai", "business-economics", "education-science"]
  }
];

/** Archetype labels match `lib/test-mapping.ts`, so the weights stay in one place. */
const QUESTIONS: {text: string; block: string; category: "INTERESTS" | "APTITUDES" | "ACTIVITY_TYPE"; options: {text: string; archetype: string}[]}[] = [
  {
    text: "Как ты принимаешь важные решения?",
    block: "Личность",
    category: "APTITUDES",
    options: [
      {text: "Долго анализирую факты", archetype: "Ученый / Аналитический"},
      {text: "Опираюсь на логику", archetype: "Рациональный / Системный"},
      {text: "Доверяю интуиции", archetype: "Интуитивный / Креативный"},
      {text: "Взвешиваю выгоду", archetype: "Прагматический / Лидерский"}
    ]
  },
  {
    text: "Что тебе интереснее изучать?",
    block: "Интересы",
    category: "INTERESTS",
    options: [
      {text: "Как устроена природа", archetype: "Естественные науки"},
      {text: "Как работают технологии", archetype: "Цифровые технологии / IT"},
      {text: "Как создаются образы и истории", archetype: "Творчество / Искусство"},
      {text: "Как устроены рынки и общество", archetype: "Социум / Бизнес"}
    ]
  },
  {
    text: "В какой команде ты хотел бы работать?",
    block: "Карьера",
    category: "ACTIVITY_TYPE",
    options: [
      {text: "В научной лаборатории", archetype: "Science & Deep Tech"},
      {text: "В технологической компании", archetype: "IT и ИИ"},
      {text: "В творческой студии", archetype: "Дизайн и Креатив"},
      {text: "В управлении компанией", archetype: "Бизнес и Менеджмент"}
    ]
  },
  {
    text: "Какая задача кажется тебе интересной?",
    block: "Личность",
    category: "APTITUDES",
    options: [
      {text: "Разобраться в сложном исследовании", archetype: "Ученый / Аналитический"},
      {text: "Построить работающую систему", archetype: "Рациональный / Системный"},
      {text: "Придумать новый образ", archetype: "Интуитивный / Креативный"},
      {text: "Собрать команду под цель", archetype: "Прагматический / Лидерский"}
    ]
  },
  {
    text: "Чем бы ты занялся в свободный день?",
    block: "Интересы",
    category: "INTERESTS",
    options: [
      {text: "Наблюдением за живой природой", archetype: "Естественные науки"},
      {text: "Сборкой или программированием", archetype: "Цифровые технологии / IT"},
      {text: "Рисованием или музыкой", archetype: "Творчество / Искусство"},
      {text: "Организацией мероприятия", archetype: "Социум / Бизнес"}
    ]
  },
  {
    text: "Какой результат работы тебя радует больше?",
    block: "Карьера",
    category: "ACTIVITY_TYPE",
    options: [
      {text: "Новое знание об устройстве мира", archetype: "Science & Deep Tech"},
      {text: "Работающий цифровой продукт", archetype: "IT и ИИ"},
      {text: "Красивое и понятное решение", archetype: "Дизайн и Креатив"},
      {text: "Выросшие показатели проекта", archetype: "Бизнес и Менеджмент"}
    ]
  },
  {
    text: "Что тебе даётся легче всего?",
    block: "Личность",
    category: "APTITUDES",
    options: [
      {text: "Находить закономерности", archetype: "Ученый / Аналитический"},
      {text: "Выстраивать порядок в задачах", archetype: "Рациональный / Системный"},
      {text: "Предлагать неожиданные идеи", archetype: "Интуитивный / Креативный"},
      {text: "Договариваться с людьми", archetype: "Прагматический / Лидерский"}
    ]
  },
  {
    text: "О чём тебе интереснее прочитать статью?",
    block: "Интересы",
    category: "INTERESTS",
    options: [
      {text: "О медицинском открытии", archetype: "Естественные науки"},
      {text: "О новой модели ИИ", archetype: "Цифровые технологии / IT"},
      {text: "О выставке современного искусства", archetype: "Творчество / Искусство"},
      {text: "О запуске компании", archetype: "Социум / Бизнес"}
    ]
  }
];

const ARCHETYPE_WEIGHTS: Record<string, Record<string, number>> = {
  "Ученый / Аналитический": {"education-science": 1, medicine: 0.6, "it-ai": 0.4, "engineering-architecture": 0.3},
  "Рациональный / Системный": {"it-ai": 1, "engineering-architecture": 0.8, "business-economics": 0.4, "law-government": 0.3},
  "Интуитивный / Креативный": {"design-creative": 1, "psychology-social-sciences": 0.5, "education-science": 0.3},
  "Прагматический / Лидерский": {"business-economics": 1, "law-government": 0.7, "psychology-social-sciences": 0.3},
  "Естественные науки": {medicine: 1, "education-science": 0.8, "engineering-architecture": 0.3},
  "Цифровые технологии / IT": {"it-ai": 1, "engineering-architecture": 0.5},
  "Творчество / Искусство": {"design-creative": 1, "psychology-social-sciences": 0.3},
  "Социум / Бизнес": {"business-economics": 1, "law-government": 0.8, "psychology-social-sciences": 0.7},
  "Science & Deep Tech": {"education-science": 1, "engineering-architecture": 0.7, medicine: 0.6, "it-ai": 0.4},
  "IT и ИИ": {"it-ai": 1, "engineering-architecture": 0.4},
  "Дизайн и Креатив": {"design-creative": 1},
  "Бизнес и Менеджмент": {"business-economics": 1, "law-government": 0.6, "psychology-social-sciences": 0.4}
};

async function main() {
  const force = process.argv.includes("--force");
  const existing = await db.direction.count();
  if (existing > 0 && !force) {
    console.log(
      [
        `The database already holds ${existing} directions, so the placeholder seed was skipped.`,
        "Real content is loaded with `pnpm db:import:sheet`; pass `--force` to overwrite with placeholders."
      ].join("\n")
    );
    return;
  }

  console.log("Seeding SEED_DATA_PLACEHOLDER content — this is demonstration data, not verified content.");

  for (const [index, direction] of DIRECTIONS.entries()) {
    const skills = [...new Set(direction.professions.flatMap((profession) => profession.skills))];
    const subjects = [...new Set(direction.professions.flatMap((profession) => profession.subjects))];
    const data = {
      sortOrder: index,
      name_ru: direction.name,
      name_kk: "",
      name_en: "",
      description_ru: `${direction.description} ${PLACEHOLDER_NOTE}`,
      description_kk: "",
      description_en: "",
      whoItSuits_ru: direction.whoItSuits,
      whoItSuits_kk: "",
      whoItSuits_en: "",
      icon: direction.icon,
      skills,
      schoolSubjects: subjects
    };
    const record = await db.direction.upsert({
      where: {slug: direction.slug},
      update: data,
      create: {...data, slug: direction.slug}
    });

    for (const profession of direction.professions) {
      const professionData = {
        directionId: record.id,
        name_ru: profession.name,
        name_kk: "",
        name_en: "",
        shortDescription_ru: profession.description,
        shortDescription_kk: "",
        shortDescription_en: "",
        whatTheyDo_ru: profession.description,
        whatTheyDo_kk: "",
        whatTheyDo_en: "",
        salaryMin: null,
        salaryMax: null,
        salaryAverage: null,
        salaryLabel: profession.salaryLabel,
        salaryRank: profession.salaryRank,
        demand: profession.demand,
        demandLabel: profession.demandLabel,
        demandRank: profession.demand === "HIGH" ? 2 : 1,
        specialties: profession.specialties,
        pros_ru: profession.pros,
        pros_kk: [],
        pros_en: [],
        cons_ru: profession.cons,
        cons_kk: [],
        cons_en: [],
        skills: profession.skills,
        schoolSubjects: profession.subjects,
        careerLadder: [] as Prisma.InputJsonValue
      };
      await db.profession.upsert({
        where: {slug: profession.slug},
        update: professionData,
        create: {...professionData, slug: profession.slug}
      });
    }
  }

  for (const university of UNIVERSITIES) {
    const data = {
      name_ru: university.name,
      name_kk: "",
      name_en: "",
      country: university.country,
      city: university.city,
      // Ratings, tuition and contacts are unknown for placeholder rows and stay empty.
      rating: null,
      ratingLabel: null,
      tuitionMin: null,
      tuitionMax: null,
      tuitionCurrency: null,
      tuitionNote: null,
      website: null,
      email: null,
      phone: null,
      address: null,
      description_ru: PLACEHOLDER_NOTE,
      description_kk: "",
      description_en: ""
    };
    const record = await db.university.upsert({
      where: {slug: university.slug},
      update: data,
      create: {...data, slug: university.slug}
    });

    for (const slug of university.directions) {
      const direction = await db.direction.findUnique({where: {slug}});
      if (!direction) continue;
      const sourceKey = `seed:${university.slug}:${slug}`;
      const programData = {
        universityId: record.id,
        directionId: direction.id,
        professionId: null,
        name_ru: direction.name_ru,
        name_kk: "",
        name_en: "",
        requirements_ru: "",
        requirements_kk: "",
        requirements_en: "",
        tuitionCost: null
      };
      await db.program.upsert({where: {sourceKey}, update: programData, create: {...programData, sourceKey}});
    }
  }

  for (const [index, question] of QUESTIONS.entries()) {
    const order = index + 1;
    const sourceKey = `seed-q-${order}`;
    const questionData = {
      order,
      block: question.block,
      text_ru: question.text,
      text_kk: "",
      text_en: "",
      category: question.category
    };
    const record = await db.question.upsert({
      where: {sourceKey},
      update: questionData,
      create: {...questionData, sourceKey}
    });

    for (const [optionIndex, option] of question.options.entries()) {
      const optionKey = `${sourceKey}-${"ABCD"[optionIndex]}`;
      const optionData = {
        questionId: record.id,
        archetype: option.archetype,
        text_ru: option.text,
        text_kk: "",
        text_en: "",
        weights: (ARCHETYPE_WEIGHTS[option.archetype] ?? {}) as Prisma.InputJsonValue
      };
      await db.option.upsert({where: {sourceKey: optionKey}, update: optionData, create: {...optionData, sourceKey: optionKey}});
    }
  }

  // Reviews are intentionally never seeded: the UI shows its empty state.
  const counts = {
    directions: await db.direction.count(),
    professions: await db.profession.count(),
    universities: await db.university.count(),
    programs: await db.program.count(),
    questions: await db.question.count(),
    options: await db.option.count(),
    reviews: await db.review.count()
  };
  console.table(counts);
  console.log("Placeholder seed complete. Replace it with the real catalogue: pnpm db:import:sheet");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
