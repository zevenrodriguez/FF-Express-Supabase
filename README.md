# FF-Express-Supabase Example - Favorite Color

A small Express app that saves people's favorite colors to a **Supabase** Postgres database using **Prisma**, then shows the results on a dashboard:

- a **form** with a name and a rainbow color dropdown
- a **bar chart** (Chart.js) counting each color
- a **p5.js rainbow** whose bands get thicker as more people pick that color
- a **list of people** with a Delete button for each one

---

## Quick Start

### 1. Get your database connection string

1. In your Supabase project, click **Connect** at the top of the dashboard.
2. Copy the **Session pooler** connection string (port **5432**).
3. Replace `[YOUR-PASSWORD]` with your database password.

> Use a password with only letters and numbers. Special characters break the connection string.

### 2. Create your `.env` file

Copy `.env.example` to a new file named `.env` and paste your string:

```
DATABASE_URL="postgresql://postgres.abcdefgh:MyPassword123@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

> `.env` is in `.gitignore`. **Never commit it to GitHub**, because it contains your password.

### 3. Install, create the table, and run

```bash
npm install
npx prisma migrate dev --name init
npm start
```

Open http://localhost:3000 and add a few colors, then click **Dashboard**.

---

## Project Structure

```
expresssupaprisma/
├── app.js               # Database connection, Express app, and all the routes
├── prisma/
│   ├── schema.prisma    # The Person model (your table)
│   └── migrations/      # Created by "prisma migrate dev" - commit this folder
├── prisma.config.js     # Tells the Prisma CLI where the schema + database are
├── views/
│   ├── index.hbs        # The form
│   ├── dashboard.hbs    # Chart + rainbow + people list
│   ├── layout.hbs       # Page wrapper used by every view
│   └── partials/        # Header (nav links) and footer
├── public/stylesheets/style.css
├── .env.example         # Template for your .env file
└── package.json
```

---

## Connecting to the Database: top of `app.js`

```javascript
require('dotenv').config(); // loads DATABASE_URL from the .env file
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
```

After this, every route can use `prisma.person` to work with the `Person` table.

---

## The Model: `prisma/schema.prisma`

```prisma
model Person {
  id        Int      @id @default(autoincrement())
  name      String
  color     String
  createdAt DateTime @default(now())
}
```

- `@id @default(autoincrement())`: each person gets an id automatically (1, 2, 3...)
- `String`: required text
- `@default(now())`: the date and time is filled in when the row is created

**Changed the model?** Run `npx prisma migrate dev --name describe-your-change` to update the table.

---

## The Routes: `app.js`

| Route | What it does |
|---|---|
| `GET /` | Shows the form |
| `POST /` | Saves a person, then redirects to the dashboard |
| `GET /dashboard` | Gets everyone, counts the colors, and shows the dashboard |
| `POST /people/:id/delete` | Deletes one person, then redirects to the dashboard |

### Saving a person

```javascript
await prisma.person.create({
  data: { name: name, color: color }
});
```

### Getting everyone

```javascript
const people = await prisma.person.findMany({
  orderBy: { createdAt: 'desc' }   // newest first
});
```

### Counting each color

A loop inside a loop: for each rainbow color, count the people who picked it.

```javascript
const counts = [];
for (let color of COLORS) {
  let count = 0;
  for (let person of people) {
    if (person.color === color) {
      count = count + 1;
    }
  }
  counts.push({ color: color, count: count });
}
// [{ color: 'red', count: 3 }, { color: 'orange', count: 0 }, ...]
```

### Deleting a person

```javascript
await prisma.person.deleteMany({
  where: { id: Number(req.params.id) }
});
```

> Values from the URL (`req.params.id`) are **strings**. Prisma needs a **number** for an `Int` field, so wrap it in `Number(...)`.

The Delete button is a tiny form, because deleting should be a `POST`, not a link:

```handlebars
<form action="/people/{{this.id}}/delete" method="post">
  <button type="submit">Delete</button>
</form>
```

---

## The Dashboard: `views/dashboard.hbs`

### Passing data from Express to the browser

The route turns the counts into text with `JSON.stringify`:

```javascript
res.render('dashboard', { countsJSON: JSON.stringify(counts) });
```

The template drops that text into a `<script>`. Triple braces `{{{ }}}` print it as-is:

```javascript
let colorData = {{{countsJSON}}};
```

### Bar chart (Chart.js)

```javascript
new Chart(document.getElementById('barChart'), {
  type: 'bar',
  data: {
    labels: colors,                       // ['red', 'orange', ...]
    datasets: [{ data: counts, backgroundColor: colors }]
  }
});
```

### Rainbow (p5.js)

Each color is an `arc` (half circle). The most popular color gets the thickest band (34px), and a color with no votes is a thin 4px line. Each band starts inside the one before it.

```javascript
let radius = 290; // outside edge of the rainbow

for (let band of colorData) {
  let thickness = 4 + (band.count / maxCount) * 30;

  stroke(band.color);
  strokeWeight(thickness);

  let diameter = (radius - thickness / 2) * 2;
  arc(width / 2, height, diameter, diameter, PI, TWO_PI);

  radius = radius - thickness; // move inward for the next band
}
```

- `arc(x, y, w, h, start, stop)`: `PI` to `TWO_PI` draws the top half of a circle
- The stroke is centered on the arc line, so the code moves in by half the thickness to keep the bands from overlapping.

---

## Deploying to Render

1. Push to GitHub. Make sure `.env` is **not** in the repo and `prisma/migrations/` **is**.
2. In Render, create a **Web Service** from your repo:
   - **Build Command:** `npm install && npx prisma migrate deploy`
   - **Start Command:** `npm start`
3. Under **Environment**, add `DATABASE_URL` with your Supabase connection string.

---

## Troubleshooting

- **`Can't reach database server`**: free Supabase projects pause after a week without activity. Open the Supabase dashboard and click **Restore**.
- **`password authentication failed`**: check the password in `DATABASE_URL`, and make sure the `[` `]` brackets were removed.
- **Chart or rainbow doesn't show**: open the browser console (F12) and look for errors.
- **Installing Prisma yourself?** Use version 7: `npm install prisma@7 @prisma/client@7 @prisma/adapter-pg@7`.

---

## Try It Yourself

- Add an `age` field to the model and the form
- Show the percentage for each color on the dashboard
- Use `mouseX` in the p5 sketch to animate the rainbow
- Add an **Edit** button that changes a person's color
