# Smart Dashboard V2 - Change Set

## Submitted Changes

1. Dark mode.
2. שינוי גוונים של המסכים על בסיס תבנית.
3. מערכת הזדהות ל־Dashboard.
4. מסך Admin לניהול לקוחות.
5. מסך לקוח לניהול המשתמשים שלו.

## Implemented In Preview

- נוצר קובץ גרסה עצמאי: `giliguli_dashboard_v2.html`.
- נוספו תבניות צבע: GiliGuli, Cerby, Executive.
- נוסף toggle ל־Dark / Light mode.
- נוסף שער כניסה לגרסת V2 עם roles: `super_admin`, `customer_admin`, `customer_user`, `viewer`.
- נוסף tab פנימי לניהול לקוחות עבור `super_admin`.
- נוסף tab לניהול משתמשי לקוח עבור `super_admin` ו־`customer_admin`.
- נתוני ה־Preview נשמרים ב־`localStorage`.

## Business Outcome

גרסת V2 תהפוך את הדשבורד מכלי לקוח יחיד לדשבורד שניתן להפעיל מול כמה לקוחות, עם שליטה בנראות, הרשאות וניהול משתמשים.

## Product Notes

- Dark mode ותבניות צבעים הן יכולות UI ויכולות להיכנס ראשונות.
- Auth הוא תנאי מקדים למסכי Admin ולקוח.
- Admin screen חייב להיות מוגבל ל־super admin בלבד.
- מסך לקוח חייב להיות מבודד לפי tenant כדי שלקוח לא יראה משתמשים או מידע של לקוח אחר.

## Not Included In This Submission

- אין Auth Provider production.
- אין בסיס נתונים production ל־tenants/users/roles.
- אין שינוי לנתיבי Scalla / Arbox / Meta / AI chat.
- אין שינוי credentials.
- אין שינוי deployment.

## Recommended Definition Of Done

- כל יכולת מתועדת עם acceptance criteria.
- אין שינוי בהתנהגות הדשבורד הפעיל עד תחילת Phase 1.
- החלטות Auth ו־data store מתקבלות לפני פיתוח Admin/User Management.

