# GVF Academy

Interactive preparation platform for GVF / GSOA satellite certification: theory, equipment simulators and quizzes in Russian, English and Greek.

## Run

```bash
npm install
npm run dev        # http://localhost:3000 → redirects to /ru
```

Without a database the app runs in **local mode**: progress is stored in the browser and the sign-in button is hidden. To enable accounts and synced progress, connect a Neon Postgres database to the Vercel project (Storage → Neon), which sets `DATABASE_URL`. Tables are created automatically on the first request (`src/lib/schema.ts`).

## Adding a course

Courses are data, not code. Each course is a folder in `content/courses/<id>/`:

| File | Contents |
| --- | --- |
| `course.json` | Course → modules → steps. A step is `theory` (paragraphs), `sim` (simulator + scenario + task) or `quiz` (question ids, questions per attempt, pass mark, attempts). Every text is `{ "ru", "en", "el" }`. |
| `questions.json` | Question bank: single or multiple choice, with an explanation for each question. |

Illustrations go in `public/courses/<id>/` and are listed on a theory step as `figures: [{ "src": "/courses/<id>/file.webp", "caption": { … } }]`.

If an illustration has text, translated copies sit next to it as `file.ru.webp` / `file.el.webp` and the figure lists them in `"localized": ["ru", "el"]`.

The glossary of terms is `content/glossary.json`, shared by all courses: each entry has a term and a definition in every language, plus `match` patterns that find the term in course text. The first mention of a term on a page gets a popover with the definition; the full list is at `/<locale>/glossary`.

Add the folder, rebuild, and the course appears in the catalog. Types are in `src/content/types.ts`.

## Simulators

`src/components/sim/acu/` is a model of a marine VSAT terminal: antenna control unit (front panel, display, LEDs, menus), stabilised antenna with blockage zones, and a satellite modem. The behaviour lives in a pure state machine (`engine.ts`); training scenarios with goals live in `scenarios.ts`:

| Scenario | Goal |
| --- | --- |
| `explore-panel` | Open all status screens |
| `power-up` / `power-up-no-gyro` | Start the system and reach TRACKING |
| `switch-satellite` | Load another satellite from the menu |
| `blockage` | Steer the ship into a blockage zone and out again |
| `rain-fade` | Lose the signal in heavy rain and recover |
| `comm-error` | Fix an ACU–antenna communications error |

## Stack

Next.js 15 (App Router, static generation), Tailwind CSS 4, Neon Postgres (email + password accounts with bcrypt and HTTP-only session cookies, learner progress, quiz attempts), deployed on Vercel.

Course text is original training material written for this platform; it does not reproduce GVF/SatProf course content.
