# Smart Dashboard V2 - Implementation Plan

## Phase 1 - UI Theme Foundation

מטרה: להוסיף Dark mode ותבניות צבעים בלי לשנות backend.

משימות:

- להגדיר CSS variables מרכזיים לצבעים, רקעים, גבולות וטקסט.
- להחליף צבעים hardcoded במשתנים.
- להוסיף toggle בין Light / Dark.
- לשמור theme נבחר ב־localStorage.
- להוסיף 2-3 תבניות צבע בסיסיות.
- לסנכרן את שלושת קבצי הדשבורד הפעילים לאחר בדיקה.

Acceptance criteria:

- ברירת המחדל נראית כמו הדשבורד הנוכחי.
- Dark mode עובד על כרטיסים, טבלאות, מודלים וגרפים.
- בחירת theme נשמרת אחרי refresh.
- אין שינוי בקריאות API או באינטגרציות קיימות.

## Phase 2 - Authentication Foundation

מטרה: להוסיף כניסה מאובטחת לדשבורד.

משימות:

- לבחור ספק Auth: Supabase Auth / Auth0 / Clerk / Netlify Identity.
- להגדיר session validation בצד שרת.
- להגדיר roles: `super_admin`, `customer_admin`, `customer_user`, `viewer`.
- להגדיר tenant isolation.
- להגן על כל API רגיש.

Acceptance criteria:

- משתמש לא מזוהה לא יכול לפתוח את הדשבורד.
- משתמש רואה רק את ה־tenant שלו.
- role נבדק בצד שרת, לא רק בדפדפן.
- logout מנקה session פעיל.

## Phase 3 - Internal Admin

מטרה: מסך פנימי לניהול לקוחות.

משימות:

- רשימת לקוחות.
- יצירת לקוח חדש.
- עדכון סטטוס לקוח: active / trial / paused / archived.
- שיוך theme template ללקוח.
- הפעלה/כיבוי אינטגרציות לפי לקוח.
- audit log לפעולות Admin.

Acceptance criteria:

- רק `super_admin` יכול להיכנס.
- שינוי לקוח משפיע רק על tenant אחד.
- סודות ו־API keys לא מוצגים במסך.

## Phase 4 - Customer User Management

מטרה: מסך לקוח לניהול משתמשים.

משימות:

- רשימת משתמשי הלקוח.
- הזמנת משתמש במייל.
- שינוי role למשתמש בתוך tenant.
- חסימה או הסרה של משתמש.
- צפייה בסטטוס הזמנה.
- audit log לפעולות customer admin.

Acceptance criteria:

- `customer_admin` מנהל רק משתמשים של אותו tenant.
- לא ניתן ליצור `super_admin` ממסך לקוח.
- משתמש רגיל לא רואה מסכי ניהול.
- כל פעולה נרשמת עם user, timestamp ו־tenant.

## Recommended Sequence

1. לממש Phase 1 כ־UI-only.
2. לבחור Auth + data store.
3. לממש Phase 2.
4. לממש Phase 3.
5. לממש Phase 4.
