export const DASHBOARD_LOCALES = ["uz", "en", "ru", "fr"] as const;
export type DashboardLocale = (typeof DASHBOARD_LOCALES)[number];
export type DashboardMessages = Record<string, string>;

export const DEFAULT_DASHBOARD_LOCALE: DashboardLocale = "uz";
export const DASHBOARD_LOCALE_COOKIE = "rashpod_dashboard_locale";

export const DASHBOARD_LOCALE_NAMES: Record<DashboardLocale, string> = {
  uz: "O‘zbekcha",
  en: "English",
  ru: "Русский",
  fr: "Français",
};

const localeTags: Record<DashboardLocale, string> = {
  uz: "uz-UZ",
  en: "en-US",
  ru: "ru-RU",
  fr: "fr-FR",
};

// Human-reviewed operational vocabulary. Full sentence coverage lives in the
// generated catalogs; these overrides keep high-impact workflow actions and
// statuses consistent across every dashboard.
const reviewedCopy: Partial<Record<DashboardLocale, Record<string, string>>> = {
  uz: {
    "Dashboard": "Boshqaruv paneli",
    "RashPOD operations and designer dashboard": "RashPOD operatsiyalar va dizaynerlar boshqaruv paneli",
    "Overview": "Umumiy ko‘rinish",
    "Workflow": "Ish jarayoni",
    "Moderation Queue": "Moderatsiya navbati",
    "Listing Review": "Listingni tekshirish",
    "Moderation Logs": "Moderatsiya jurnali",
    "Approve": "Tasdiqlash",
    "Approve design": "Dizaynni tasdiqlash",
    "Reject": "Rad etish",
    "Reject design": "Dizaynni rad etish",
    "Request changes": "O‘zgartirish so‘rash",
    "Publish": "Nashr qilish",
    "Delete": "O‘chirish",
    "Archive": "Arxivlash",
    "Cancel": "Bekor qilish",
    "Save": "Saqlash",
    "Save changes": "O‘zgarishlarni saqlash",
    "Try again": "Qayta urinish",
    "Search...": "Qidirish...",
    "Notifications": "Bildirishnomalar",
    "Sign out": "Tizimdan chiqish",
    "Language": "Til",
    "Settings": "Sozlamalar",
    "Production Queue": "Ishlab chiqarish navbati",
    "Mockup Templates": "Maket shablonlari",
    "Print Areas": "Bosma maydonlari",
    "Base Products": "Asosiy mahsulotlar",
    "Product Types": "Mahsulot turlari",
    "Film Rights": "Film savdosi huquqlari",
    "Film Sales": "Film savdosi",
    "Earnings & Payouts": "Daromadlar va to‘lovlar",
    "Super Admin": "Super administrator",
    "Active": "Faol",
    "Inactive": "Faol emas",
    "Pending": "Kutilmoqda",
    "Approved": "Tasdiqlangan",
    "Rejected": "Rad etilgan",
    "Published": "Nashr qilingan",
    "Failed": "Muvaffaqiyatsiz",
    "Loading...": "Yuklanmoqda...",
    "Audit Logs": "Audit jurnali",
    "{role} navigation": "{role} navigatsiyasi",
    "{name} avatar": "{name} avatari",
  },
  ru: {
    "Dashboard": "Панель управления",
    "RashPOD operations and designer dashboard": "Панель управления операциями и дизайнерами RashPOD",
    "Overview": "Обзор",
    "Workflow": "Рабочий процесс",
    "Moderation Queue": "Очередь модерации",
    "Listing Review": "Проверка листингов",
    "Moderation Logs": "Журнал модерации",
    "Approve": "Одобрить",
    "Approve design": "Одобрить дизайн",
    "Reject": "Отклонить",
    "Reject design": "Отклонить дизайн",
    "Request changes": "Запросить изменения",
    "Publish": "Опубликовать",
    "Delete": "Удалить",
    "Archive": "Архивировать",
    "Cancel": "Отмена",
    "Save": "Сохранить",
    "Save changes": "Сохранить изменения",
    "Try again": "Повторить",
    "Search...": "Поиск...",
    "Notifications": "Уведомления",
    "Sign out": "Выйти",
    "Language": "Язык",
    "Settings": "Настройки",
    "Production Queue": "Очередь производства",
    "Mockup Templates": "Шаблоны мокапов",
    "Print Areas": "Области печати",
    "Base Products": "Базовые товары",
    "Product Types": "Типы товаров",
    "Film Rights": "Права на продажу плёнки",
    "Film Sales": "Продажи плёнки",
    "Earnings & Payouts": "Доходы и выплаты",
    "Super Admin": "Суперадминистратор",
    "Active": "Активно",
    "Inactive": "Неактивно",
    "Pending": "Ожидает",
    "Approved": "Одобрено",
    "Rejected": "Отклонено",
    "Published": "Опубликовано",
    "Failed": "Ошибка",
    "Loading...": "Загрузка...",
    "Audit Logs": "Журнал аудита",
    "{role} navigation": "Навигация: {role}",
    "{name} avatar": "Аватар пользователя {name}",
  },
  fr: {
    "Dashboard": "Tableau de bord",
    "RashPOD operations and designer dashboard": "Tableau de bord des opérations et des designers RashPOD",
    "Overview": "Vue d’ensemble",
    "Workflow": "Flux de travail",
    "Moderation Queue": "File de modération",
    "Listing Review": "Vérification des annonces",
    "Moderation Logs": "Journal de modération",
    "Approve": "Approuver",
    "Approve design": "Approuver le design",
    "Reject": "Rejeter",
    "Reject design": "Rejeter le design",
    "Request changes": "Demander des modifications",
    "Publish": "Publier",
    "Delete": "Supprimer",
    "Archive": "Archiver",
    "Cancel": "Annuler",
    "Save": "Enregistrer",
    "Save changes": "Enregistrer les modifications",
    "Try again": "Réessayer",
    "Search...": "Rechercher...",
    "Notifications": "Notifications",
    "Sign out": "Se déconnecter",
    "Language": "Langue",
    "Settings": "Paramètres",
    "Production Queue": "File de production",
    "Mockup Templates": "Modèles de mockup",
    "Print Areas": "Zones d’impression",
    "Base Products": "Produits de base",
    "Product Types": "Types de produits",
    "Film Rights": "Droits de vente de film",
    "Film Sales": "Ventes de film",
    "Earnings & Payouts": "Revenus et versements",
    "Super Admin": "Super administrateur",
    "Active": "Actif",
    "Inactive": "Inactif",
    "Pending": "En attente",
    "Approved": "Approuvé",
    "Rejected": "Rejeté",
    "Published": "Publié",
    "Failed": "Échec",
    "Loading...": "Chargement...",
    "Audit Logs": "Journal d’audit",
    "{role} navigation": "Navigation — {role}",
    "{name} avatar": "Avatar de {name}",
  },
};

export function isDashboardLocale(value: unknown): value is DashboardLocale {
  return typeof value === "string" && DASHBOARD_LOCALES.includes(value as DashboardLocale);
}

export function getDashboardLocale(value: unknown): DashboardLocale {
  return isDashboardLocale(value) ? value : DEFAULT_DASHBOARD_LOCALE;
}

export function translateDashboardCopy(
  locale: DashboardLocale,
  source: string,
  messages: DashboardMessages = {},
): string {
  if (locale === "en") return source;
  return reviewedCopy[locale]?.[source] || messages[source] || source;
}

export function interpolateDashboardCopy(
  locale: DashboardLocale,
  source: string,
  values: Record<string, string | number>,
  messages: DashboardMessages = {},
): string {
  return translateDashboardCopy(locale, source, messages).replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}

export function dashboardLocaleTag(locale: DashboardLocale): string {
  return localeTags[locale];
}
