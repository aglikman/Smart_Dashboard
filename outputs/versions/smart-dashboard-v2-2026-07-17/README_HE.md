# Smart Dashboard V2 - תיקיית גרסה

תאריך פתיחה: 17 ביולי 2026

סטטוס: גרסת Preview נוצרה בקוד כקובץ HTML עצמאי

מטרת הגרסה: לרכז ולממש Preview ראשוני של שדרוגי V2 בלי לערבב אותם עם גרסת הדשבורד הפעילה.

## תכולת הגרסה

- Dark mode.
- שינוי גוונים לפי תבנית עיצוב.
- מערכת הזדהות לדשבורד.
- מסך Admin לניהול לקוחות.
- מסך לקוח לניהול המשתמשים שלו.

## קבצים בתיקייה

- `CHANGE_SET_HE.md` - רשימת השינויים שהוגשו לגרסה.
- `IMPLEMENTATION_PLAN_HE.md` - סדר מימוש מומלץ, תלויות וקריטריוני קבלה.
- `giliguli_dashboard_v2.html` - גרסת Preview עצמאית הכוללת Dark mode, theme selector, שער כניסה, Admin וניהול משתמשי לקוח.

## הערת שמירה על יציבות

גרסה זו אינה משנה את קבצי הדשבורד הפעילים:

- `giliguli_dashboard.html`
- `public/giliguli_dashboard.html`
- `public/index.html`

הסיבה: חלק מהבקשות, בעיקר Auth/Admin/User Management, דורשות החלטה על ספק הזדהות ושכבת נתונים לפני מימוש בטוח.

## איך לבדוק

אפשר לפתוח את הקובץ ישירות מהתיקייה, או דרך השרת המקומי אם הוא רץ:

`http://localhost:3001/outputs/versions/smart-dashboard-v2-2026-07-17/giliguli_dashboard_v2.html`

הערה: שכבת ההזדהות בגרסה זו היא Preview מקומי על בסיס `localStorage`, ללא סיסמאות וללא אבטחת production.
