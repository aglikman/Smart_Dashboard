# Smart Dashboard - Backlog שדרוגים עתידיים

תאריך: 17 ביולי 2026

מטרה: לרכז את השינויים העתידיים לדשבורד בצורה שמבדילה בין שדרוגי UI מהירים לבין יכולות מוצר שדורשות ארכיטקטורה, הרשאות ושמירת נתונים.

## תקציר מנהלים

הבקשות מתחלקות לשתי שכבות:

1. שכבת חוויית משתמש: Dark mode ושינוי גוונים לפי תבנית.
2. שכבת מוצר/ניהול: מערכת הזדהות, מסך Admin לניהול לקוחות, ומסך לקוח לניהול משתמשים.

המלצה: להתחיל ב־UI Theme Foundation, ואז לבנות Auth + Tenants לפני מסכי הניהול. בלי שכבת הזדהות ו־tenant model, מסכי Admin וניהול משתמשים יהיו מסוכנים ולא מספיק יציבים ללקוח.

## רשימת יכולות

| יכולת | ערך עסקי | מורכבות | תלות מרכזית |
|---|---:|---:|---|
| Dark mode | שיפור שימושיות ונראות פרימיום | נמוכה | CSS variables |
| תבניות צבעים למסכים | התאמה למותג לקוח / vertical | בינונית | Theme tokens |
| מערכת הזדהות | הגנה על מידע, לקוחות מרובים | גבוהה | Auth provider + session validation |
| מסך Admin לניהול לקוחות | שליטה פנימית בפריסה, סטטוס ולקוחות | גבוהה | Tenant database + roles |
| מסך לקוח לניהול משתמשים | self-service ללקוח והפחתת תפעול ידני | גבוהה | User roles + tenant isolation |

## Phase 1 - Theme Foundation

מטרה: לאפשר שליטה עקבית בצבעים בלי לשבור את הדשבורד הקיים.

Scope:

- החלפת צבעים hardcoded ב־CSS variables מרכזיים.
- הוספת מצב Light / Dark.
- שמירת בחירת המשתמש ב־localStorage.
- הוספת theme selector פנימי עם 2-3 תבניות בסיס.
- שמירה על שלושת קבצי הדשבורד המסונכרנים: `giliguli_dashboard.html`, `public/giliguli_dashboard.html`, `public/index.html`.

Acceptance criteria:

- הדשבורד נטען כברירת מחדל במראה הנוכחי.
- מעבר ל־Dark mode לא שובר טבלאות, כרטיסים, מודלים וגרפים.
- רענון דף שומר את בחירת המשתמש.
- אין שינוי בהתנהגות Scalla, Arbox, Meta, AI chat או EmailJS.

## Phase 2 - Authentication Foundation

מטרה: להוסיף כניסה מאובטחת לדשבורד לפני שמוסיפים יכולות ניהול.

המלצה ארכיטקטונית:

- להשתמש ב־Auth מנוהל כגון Supabase Auth, Auth0, Clerk או Netlify Identity.
- להוסיף שמירת tenants/users/roles בבסיס נתונים או store מרכזי.
- לא לשמור הרשאות רגישות ב־localStorage בלבד.
- לא לחשוף credential values בצד לקוח.

Roles ראשוניים:

- `super_admin` - Arye / צוות פנימי, גישה לכל הלקוחות.
- `customer_admin` - מנהל מטעם הלקוח, גישה לניהול משתמשים של אותו לקוח בלבד.
- `customer_user` - משתמש רגיל בדשבורד של הלקוח.
- `viewer` - צפייה בלבד, ללא שינוי הגדרות.

Acceptance criteria:

- משתמש לא מזוהה לא יכול לפתוח את הדשבורד.
- כל קריאת API רגישה מאמתת session בצד שרת.
- משתמש רואה רק את tenant שלו.
- logout מנקה session פעיל.

## Phase 3 - Internal Admin Screen

מטרה: מסך פנימי לניהול לקוחות והגדרות פריסה.

יכולות מומלצות:

- רשימת לקוחות.
- יצירת לקוח חדש.
- עדכון סטטוס לקוח: active / trial / paused / archived.
- שיוך template צבעים ללקוח.
- צפייה במשתמשים לפי לקוח.
- הפעלה/כיבוי יכולות: AI chat, Meta, Scalla, Arbox, alerts.
- audit log בסיסי לפעולות Admin.

שדות לקוח ראשוניים:

- Customer name.
- Tenant ID.
- Primary contact.
- Status.
- Region / timezone.
- Enabled integrations.
- Theme template.
- Created date.
- Last activity.

Acceptance criteria:

- רק `super_admin` יכול להיכנס למסך הזה.
- שינוי בהגדרות לקוח משפיע רק על אותו tenant.
- אין הצגת סודות או API keys במסך.

## Phase 4 - Customer User Management

מטרה: לתת ללקוח לנהל את המשתמשים שלו בלי תלות בתפעול פנימי.

יכולות מומלצות:

- רשימת משתמשים של הלקוח.
- הזמנת משתמש חדש במייל.
- שינוי role למשתמש.
- חסימה / הסרה של משתמש.
- צפייה בסטטוס הזמנה.
- audit log לפעולות customer admin.

Acceptance criteria:

- `customer_admin` מנהל רק משתמשים של tenant שלו.
- לא ניתן להעלות משתמש ל־`super_admin` ממסך לקוח.
- משתמש רגיל לא רואה מסכי ניהול.
- כל פעולה נרשמת עם user, timestamp ו־tenant.

## החלטות שנדרש לקבל לפני מימוש Auth/Admin

1. בחירת ספק Auth: Supabase Auth / Auth0 / Clerk / Netlify Identity.
2. בחירת שכבת נתונים ל־tenants/users/roles.
3. האם הדשבורד יישאר static-first או יעבור לאפליקציה עם routing מסודר.
4. האם לקוחות יקבלו URL משותף עם tenant-based login או URL נפרד לכל לקוח.
5. מי יהיה ה־super admin הראשון ואיך מתבצע onboarding ראשוני.

## המלצת סדר עבודה

1. Phase 1: Dark mode + theme tokens.
2. Phase 2: Auth + roles + tenant isolation.
3. Phase 3: Internal Admin.
4. Phase 4: Customer user management.

## הערכת סיכון

- סיכון אבטחה גבוה אם מוסיפים Admin לפני Auth ו־tenant isolation.
- סיכון תחזוקה בינוני אם ממשיכים להחזיק כמה עותקים של אותו HTML ללא תהליך sync.
- סיכון מוצר נמוך ב־Dark mode, כל עוד נשמרת ברירת המחדל הנוכחית.

## Next Action מומלץ

להתחיל במימוש Phase 1 כ־שינוי UI בלבד, בלי שינוי backend. אחרי בדיקת עיצוב והתנהגות, לקבל החלטת Auth ולפתוח Phase 2 כפרויקט נפרד.
