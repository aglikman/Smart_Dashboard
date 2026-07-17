# Smart Dashboard V2 - Change Set

## Submitted Changes

1. Dark mode.
2. שינוי גוונים של המסכים על בסיס תבנית.
3. מערכת הזדהות ל־Dashboard.
4. מסך Admin לניהול לקוחות.
5. מסך לקוח לניהול המשתמשים שלו.

## Business Outcome

גרסת V2 תהפוך את הדשבורד מכלי לקוח יחיד לדשבורד שניתן להפעיל מול כמה לקוחות, עם שליטה בנראות, הרשאות וניהול משתמשים.

## Product Notes

- Dark mode ותבניות צבעים הן יכולות UI ויכולות להיכנס ראשונות.
- Auth הוא תנאי מקדים למסכי Admin ולקוח.
- Admin screen חייב להיות מוגבל ל־super admin בלבד.
- מסך לקוח חייב להיות מבודד לפי tenant כדי שלקוח לא יראה משתמשים או מידע של לקוח אחר.

## Not Included In This Submission

- אין מימוש קוד בפועל.
- אין שינוי לנתיבי Scalla / Arbox / Meta / AI chat.
- אין שינוי credentials.
- אין שינוי deployment.

## Recommended Definition Of Done

- כל יכולת מתועדת עם acceptance criteria.
- אין שינוי בהתנהגות הדשבורד הפעיל עד תחילת Phase 1.
- החלטות Auth ו־data store מתקבלות לפני פיתוח Admin/User Management.
