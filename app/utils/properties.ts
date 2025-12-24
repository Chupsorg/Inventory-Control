/* ================================
   ENV TYPE
================================ */
type ENV = "DEV" | "QA" | "PROD";

/* ================================
   CURRENT ENV (SAFE)
================================ */
const CURRENT_ENV: ENV =
  (process.env.NEXT_PUBLIC_ENV as ENV) || "DEV";

/* ================================
   BASE URL CONFIG (YOUR STYLE)
================================ */
const CONFIG: Record<ENV,{ baseURL: string; imgBaseURL: string }> = {
  DEV: {
    baseURL: "https://qa.chups.com/",
    imgBaseURL: "https://qa.chups.com/",
  },
  QA: {
    baseURL: "https://qa.chups.com/",
    imgBaseURL: "https://qa.chups.com/",
  },
  PROD: {
    baseURL: "https://chups.com/",
    imgBaseURL: "https://chups.com/",
  },
};

/* ================================
   EXPORT SAME VARIABLES AS BEFORE
================================ */
export const baseURL = CONFIG[CURRENT_ENV].baseURL;
export const imgBaseURL = CONFIG[CURRENT_ENV].imgBaseURL;

export const backendURL = `${baseURL}food/`;

/* ================================
   OTHER CONSTANTS (KEEP SAME)
================================ */
export const mealPassAmount = 99;
export const kitLocationId = 110;
export const whatsAppNumber = "19093137795";

export type Weekday = 'SUN'| 'MON'| 'TUE'| 'WED'| 'THU'| 'FRI'| 'SAT';

const WEEKDAY_MAP: Record<Weekday, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

export function getComingWeekday(targetDay: Weekday): Date {
  const today = new Date();
  const currentDay = today.getDay(); // 0–6

  const targetDayNumber = WEEKDAY_MAP[targetDay];

  const diff = (targetDayNumber - currentDay + 7) % 7;

  const result = new Date(today);
  result.setDate(today.getDate() + diff);

  return result;
}


export function getDayName(date: Date = new Date(), locale = 'en-US'): string {
  return date.toLocaleDateString(locale, { weekday: 'long' });
}

export const formatDate = (date: string | Date) =>
  new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export function subtractOneWeek(date: Date): Date {
  const result = new Date(date); // clone
  result.setDate(result.getDate() - 7);
  return result;
}

type DateUnit = 'week' | 'month';
type DateOperation = 'add' | 'subtract';

type DateRangeResult = {
  startDate: Date;
  endDate: Date;
};

export function getDateRange(
  date: Date,
  unit: DateUnit,
  range: number,
  operation: DateOperation
): DateRangeResult {
  const baseDate = new Date(date);

  let startDate: Date;
  let endDate: Date;

  if (operation === 'subtract') {
    endDate = baseDate;
    startDate = new Date(baseDate);

    if (unit === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setMonth(startDate.getMonth() - range);
    }
  } else {
    startDate = baseDate;
    endDate = new Date(baseDate);

    if (unit === 'week') {
      endDate.setDate(endDate.getDate() + 7);
    } else {
      endDate.setMonth(endDate.getMonth() + range);
    }
  }

  return { startDate, endDate };
}


