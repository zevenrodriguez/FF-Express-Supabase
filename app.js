var createError = require('http-errors');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var hbs = require('hbs');
const port = process.env.PORT || 3000;



require('dotenv').config(); // loads DATABASE_URL from the .env file
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

// Database setup: connect Prisma to the database in DATABASE_URL
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

app.use(logger('dev'));
app.use(express.urlencoded({ extended: false })); // lets us read form data with req.body
app.use(express.static(path.join(__dirname, 'public')));

// The colors of the rainbow, in order (outside to inside)
const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];


/* Home page: the form */
app.get('/', function (req, res, next) {
  res.render('index', { title: 'Favorite Color', colors: COLORS });
});

/* Form submit: save a person to the database */
app.post('/', async function (req, res, next) {
  try {
    const name = req.body.name;
    const color = req.body.color;

    // Check 1: did they type a name?
    if (name === '') {
      return res.redirect('/');  // no name, so send them back to the form
    }

    // Check 2: did they pick one of our rainbow colors?
    if (COLORS.includes(color) === false) {
      return res.redirect('/');  // not a rainbow color, so send them back to the form
    }

    await prisma.person.create({
      data: { name: name, color: color }
    });

    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
});


/* Dashboard: list of people, bar chart, and p5 rainbow */
app.get('/dashboard', async function (req, res, next) {
  try {
    // get everyone, newest first
    const people = await prisma.person.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // count how many people picked each color
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

    res.render('dashboard', {
      title: 'Dashboard',
      people: people,
      total: people.length,
      countsJSON: JSON.stringify(counts) // turned into text so the <script> can use it
    });
  } catch (err) {
    next(err);
  }
});

/* Delete a person, then go back to the dashboard */
app.post('/people/:id/delete', async function (req, res, next) {
  try {
    await prisma.person.deleteMany({
      where: { id: Number(req.params.id) } // URL values are strings, so convert to a number
    });
    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
});


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

app.listen(port, function () {
  console.log('Server running on http://localhost:' + port);
});
