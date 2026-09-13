/**
 * Corrections to test text that is still wrong in the team's sheet.
 *
 * The catalogue is otherwise imported word for word. These entries are the one
 * exception: spelling and grammar errors in the questionnaire that students
 * reported, fixed here because the sheet has not been corrected yet.
 *
 * Each entry replaces an exact fragment in one language. It applies only while
 * that fragment is still in the sheet — once the team fixes the cell, the entry
 * stops matching, the import lists it as unused, and it can be deleted. Nothing
 * here changes meaning; wording choices beyond plain errors stay with the team.
 */
export type Lang = "ru" | "kk" | "en";

export type Correction = {
  lang: Lang;
  /** Question number as the student sees it, for whoever maintains this list. */
  question: number;
  from: string;
  to: string;
};

export const TEST_CORRECTIONS: Correction[] = [
  {lang: "ru", question: 4, from: "Как ты реагируешь на измененния", to: "Как ты реагируешь на изменения?"},
  // A and B address the student ("Анализируешь", "Исправляешь"); C and D slipped into the first person.
  {lang: "ru", question: 6, from: "Ищу красивый выход", to: "Ищешь красивый выход"},
  {lang: "ru", question: 6, from: "Собираю совещание", to: "Собираешь совещание"},
  // The other answers are first-person verbs ("Строго соблюдаю", "Не использую").
  {lang: "ru", question: 8, from: "Изучая, чтобы понять суть", to: "Изучаю, чтобы понять суть"},
  {lang: "ru", question: 8, from: "Используя как инструмент для контроля", to: "Использую как инструмент для контроля"},
  {lang: "ru", question: 9, from: "Замйешься хобии", to: "Займешься хобби"},
  // Russian "скорее" left inside the Kazakh sentence; "көбіне" as in question 2.
  {lang: "kk", question: 9, from: "Бос кеште Сіз, скорее...", to: "Бос кеште Сіз көбіне..."},
  {lang: "ru", question: 18, from: "О соверемнном искусстве", to: "О современном искусстве"},
  {lang: "ru", question: 18, from: "Об истории извесных компаний", to: "Об истории известных компаний"},
  {lang: "ru", question: 20, from: "на покупку в дом", to: "на покупку для дома"},
  {lang: "ru", question: 22, from: "Поелзный для общения", to: "Полезный для общения"},
  {lang: "ru", question: 25, from: "Набор для эскпериментов", to: "Набор для экспериментов"},
  {lang: "ru", question: 29, from: "Снял видео-ролик", to: "Снял видеоролик"},
  {lang: "ru", question: 31, from: "зоны ответсвенности", to: "зоны ответственности"},
  {lang: "ru", question: 32, from: ". Вы создали или внедрили технологию", to: "Вы создали или внедрили технологию"},
  {lang: "ru", question: 39, from: "тренды современого дизайна", to: "тренды современного дизайна"},
  {lang: "ru", question: 39, from: "планирование по управление прибылью", to: "планирование по управлению прибылью"}
];

/** Applies every correction for `lang` to `value`, recording which entries matched. */
export function correct(value: string, lang: Lang, used: Set<Correction>, corrections = TEST_CORRECTIONS): string {
  let result = value;
  for (const entry of corrections) {
    if (entry.lang !== lang || !result.includes(entry.from)) continue;
    result = result.replace(entry.from, entry.to);
    used.add(entry);
  }
  return result;
}
