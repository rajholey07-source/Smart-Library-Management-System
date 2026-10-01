/**
 * Seeds the Smart Library Management System database with realistic sample data:
 * categories, 22 real-world academic/technical books, an admin, students,
 * borrow history across recent months, fines, and notifications.
 *
 * Run manually with `npm run reseed` (recreates the DB from scratch).
 */
const fs = require('fs');
const Database = require('better-sqlite3');
const config = require('./config');
const { hashPassword, isoDay } = require('./utils');

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const categories = [
  ['Computer Science', 'Programming, algorithms, and computing fundamentals'],
  ['Mathematics', 'Pure and applied mathematics'],
  ['Electronics', 'Circuits, signals, and embedded systems'],
  ['Mechanical Engineering', 'Thermodynamics, design, and manufacturing'],
  ['Data Science', 'Statistics, machine learning, and analytics'],
  ['Management', 'Business, economics, and project management'],
  ['Literature', 'Classic and modern fiction and essays'],
  ['General Knowledge', 'Reference, trivia, and general studies'],
];

const books = [
  // title, author, isbn, category, publisher, year, total, avail, featured, description
  ['Introduction to Algorithms', 'Thomas H. Cormen', '9780262046305', 'Computer Science', 'MIT Press', 2022, 6, 4, 1,
    'A comprehensive introduction to the design and analysis of algorithms, covering data structures, graph algorithms, dynamic programming, and NP-completeness with rigorous proofs and exercises.'],
  ['Clean Code', 'Robert C. Martin', '9780132350884', 'Computer Science', 'Prentice Hall', 2008, 5, 3, 1,
    'A handbook of agile software craftsmanship that teaches how to write readable, maintainable code through principles, patterns, and practices of the best programmers.'],
  ['The C Programming Language', 'Brian W. Kernighan', '9780131103627', 'Computer Science', 'Prentice Hall', 1988, 8, 5, 1,
    'The definitive guide to C, written by the language creators. Covers control flow, pointers, data structures, and the standard library through concise examples.'],
  ['Operating System Concepts', 'Abraham Silberschatz', '9781119800361', 'Computer Science', 'Wiley', 2021, 4, 2, 0,
    'The classic "dinosaur book" explaining processes, threads, memory management, file systems, and distributed operating systems with modern case studies.'],
  ['Computer Networks', 'Andrew S. Tanenbaum', '9780132126953', 'Computer Science', 'Pearson', 2021, 4, 3, 0,
    'Structured treatment of networking from the physical layer to applications, including TCP/IP, routing, security, and the modern web.'],
  ['Database System Concepts', 'Abraham Silberschatz', '9780078022159', 'Computer Science', 'McGraw-Hill', 2019, 5, 4, 0,
    'Foundational text on relational databases, SQL, ER modeling, normalization, transactions, concurrency control, and NoSQL systems.'],
  ['Artificial Intelligence: A Modern Approach', 'Stuart Russell', '9780134610993', 'Data Science', 'Pearson', 2020, 4, 1, 1,
    'The standard text in AI, covering search, logic, probabilistic reasoning, machine learning, deep learning, robotics, and AI ethics.'],
  ['Hands-On Machine Learning with Scikit-Learn, Keras & TensorFlow', 'Aurélien Géron', '9781098125974', 'Data Science', "O'Reilly Media", 2022, 3, 2, 1,
    'Practical machine learning from linear regression to transformers, with worked examples, exercises, and production-minded guidance.'],
  ['Python Data Science Handbook', 'Jake VanderPlas', '9781098109738', 'Data Science', "O'Reilly Media", 2022, 3, 2, 0,
    'An essential reference for NumPy, pandas, matplotlib, and scikit-learn, teaching the tools needed for effective data analysis in Python.'],
  ['Linear Algebra and Its Applications', 'Gilbert Strang', '9780060101983', 'Mathematics', 'Brooks Cole', 2016, 5, 3, 0,
    'Strang’s clear treatment of vector spaces, orthogonality, eigenvalues, and linear transformations with applications across engineering.'],
  ['Calculus: Early Transcendentals', 'James Stewart', '9781285741550', 'Mathematics', 'Cengage Learning', 2015, 6, 4, 0,
    'A widely used calculus text emphasizing conceptual understanding, problem solving, and real-world applications of single and multivariable calculus.'],
  ['Probability and Statistics for Engineers and Scientists', 'Ronald E. Walpole', '9780321629111', 'Mathematics', 'Pearson', 2011, 4, 2, 0,
    'Develops probability models, estimation, hypothesis testing, regression, and design of experiments with engineering examples.'],
  ['Discrete Mathematics and Its Applications', 'Kenneth H. Rosen', '9781259676512', 'Mathematics', 'McGraw-Hill', 2018, 4, 3, 0,
    'Covers logic, sets, counting, relations, graphs, Boolean algebra, and number theory — the mathematical backbone of computer science.'],
  ['Microelectronic Circuits', 'Adel S. Sedra', '9780190853464', 'Electronics', 'Oxford University Press', 2019, 4, 2, 0,
    'The standard electronics text covering diodes, MOSFETs, BJTs, op-amps, feedback, and integrated circuit design and analysis.'],
  ['Digital Signal Processing: Principles, Algorithms and Applications', 'John G. Proakis', '9780131873742', 'Electronics', 'Pearson', 2006, 3, 1, 0,
    'Rigorous introduction to discrete-time signals, z-transforms, DFT, filter design, and multirate systems with applications.'],
  ['Embedded Systems: Architecture, Programming and Design', 'Raj Kamal', '9780070251267', 'Electronics', 'McGraw-Hill', 2011, 3, 2, 0,
    'Introduces embedded hardware, microcontrollers, real-time operating systems, and firmware design with practical case studies.'],
  ['Fundamentals of Thermodynamics', 'Claus Borgnakke', '9781119595724', 'Mechanical Engineering', 'Wiley', 2018, 4, 3, 0,
    'Classic treatment of energy, entropy, power cycles, and reactive systems for mechanical engineering students.'],
  ['Engineering Mechanics: Statics', 'Russell C. Hibbeler', '9780134814971', 'Mechanical Engineering', 'Pearson', 2018, 4, 2, 0,
    'Statics through free-body diagrams, trusses, frames, centroids, and moments of inertia with extensive problem sets.'],
  ['Principles of Economics', 'N. Gregory Mankiw', '9780357038314', 'Management', 'Cengage Learning', 2020, 3, 2, 0,
    'An accessible introduction to micro- and macroeconomics covering markets, elasticity, fiscal policy, and monetary systems.'],
  ['A Guide to the Project Management Body of Knowledge (PMBOK Guide)', 'Project Management Institute', '9781628256642', 'Management', 'PMI', 2021, 2, 1, 0,
    'The globally recognized standard for project management processes, knowledge areas, and best practices.'],
  ['To Kill a Mockingbird', 'Harper Lee', '9780061120084', 'Literature', 'Harper Perennial', 2006, 5, 3, 1,
    'The Pulitzer Prize–winning novel about justice and conscience in the American South, narrated through a child’s eyes.'],
  ['The Design of Everyday Things', 'Don Norman', '9780465050659', 'General Knowledge', 'Basic Books', 2013, 3, 2, 0,
    'A landmark book on design psychology explaining affordances, signifiers, feedback, and human-centered product design.'],
];

const users = [
  // full_name, email, role, student_id
  ['Dr. Ananya Sharma', 'admin@library.edu', 'admin', null],
  ['Rahul Verma', 'rahul.verma@student.edu', 'student', 'CS2021001'],
  ['Priya Nair', 'priya.nair@student.edu', 'student', 'EC2021004'],
  ['Arjun Mehta', 'arjun.mehta@student.edu', 'student', 'ME2022011'],
  ['Sneha Kulkarni', 'sneha.kulkarni@student.edu', 'student', 'CS2022015'],
  ['Vikram Singh', 'vikram.singh@student.edu', 'student', 'IT2021023'],
  ['Ishita Roy', 'ishita.roy@student.edu', 'student', 'DS2023007'],
  ['Karthik Iyer', 'karthik.iyer@student.edu', 'student', 'CS2023031'],
];

const defaultPassword = 'Password123';

// ---------------------------------------------------------------------------

function resetDbFile() {
  try {
    fs.rmSync(config.dbFile, { force: true });
    fs.rmSync(`${config.dbFile}-wal`, { force: true });
    fs.rmSync(`${config.dbFile}-shm`, { force: true });
  } catch {
    /* ignore */
  }
}

function seed() {
  resetDbFile();
  require('./db');
  // eslint-disable-next-line global-require
  const { db, initDb } = require('./db');
  initDb();

  const passwordHash = hashPassword(defaultPassword);

  const tx = db.transaction(() => {
    // Categories -------------------------------------------------------------
    const insCat = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
    const catIds = {};
    for (const [name, description] of categories) {
      const info = insCat.run(name, description);
      catIds[name] = info.lastInsertRowid;
    }

    // Books ------------------------------------------------------------------
    const insBook = db.prepare(`
      INSERT INTO books (title, author, isbn, category_id, publisher, publication_year,
                         description, total_copies, available_copies, is_featured, cover_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const bookIds = [];
    for (const [title, author, isbn, cat, publisher, year, total, avail, featured, description] of books) {
      const cover = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
      const info = insBook.run(title, author, isbn, catIds[cat], publisher, year,
        description, total, avail, featured, cover);
      bookIds.push(info.lastInsertRowid);
    }

    // Users ------------------------------------------------------------------
    const insUser = db.prepare(`
      INSERT INTO users (full_name, email, password_hash, role, student_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    const userIds = {};
    for (const [full_name, email, role, studentId] of users) {
      const info = insUser.run(full_name, email, passwordHash, role, studentId);
      userIds[email] = info.lastInsertRowid;
    }
    const adminId = userIds['admin@library.edu'];

    // Borrow records ---------------------------------------------------------
    const insBorrow = db.prepare(`
      INSERT INTO borrow_records (book_id, user_id, borrowed_at, due_date, returned_at, status, issued_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insFine = db.prepare(`
      INSERT INTO fines (borrow_record_id, user_id, amount, days_overdue, status, paid_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // [bookIdx, userEmail, borrowedDaysAgo, dueInDaysFromBorrow, returnedDaysAgo|null]
    const history = [
      // bookIdx, user, borrowedDaysAgo, dueOffset(days), returnedDaysAgo (null = still out)
      [1, 'rahul.verma@student.edu', 130, 14, 125],   // returned on time
      [9, 'rahul.verma@student.edu', 120, 14, 106],   // returned on time
      [0, 'rahul.verma@student.edu', 110, 14, 96],    // returned on time
      [2, 'priya.nair@student.edu',   125, 14, 111],  // returned on time
      [10, 'priya.nair@student.edu',  100, 14, 86],   // returned on time
      [13, 'priya.nair@student.edu',  90,  14, 76],   // returned on time
      [3, 'arjun.mehta@student.edu',  80,  14, 66],   // returned on time
      [16, 'arjun.mehta@student.edu', 75,  14, 61],   // returned on time
      [4, 'vikram.singh@student.edu', 70,  14, 56],   // returned on time
      [11, 'vikram.singh@student.edu', 65, 14, 51],   // returned on time
      [20, 'ishita.roy@student.edu',  60,  14, 46],   // returned on time
      [12, 'ishita.roy@student.edu',  55,  14, 41],   // returned on time
      [21, 'karthik.iyer@student.edu', 50, 14, 35],   // returned on time
      [5, 'karthik.iyer@student.edu', 45,  14, 31],   // returned on time

      // overdue returns (fines): returned after the due date
      [6, 'rahul.verma@student.edu', 40, 14, 12],     // borrowed 40d ago, due 26d ago, returned 12d ago -> 14d late
      [14, 'sneha.kulkarni@student.edu', 35, 14, 9],  // due 21d ago, returned 9d ago -> 12d late
      [7, 'vikram.singh@student.edu', 30, 14, 7],     // due 16d ago, returned 7d ago -> 9d late

      // currently borrowed — on time
      [2, 'rahul.verma@student.edu', 6, 14, null],
      [8, 'priya.nair@student.edu',  4, 14, null],
      [17, 'arjun.mehta@student.edu', 10, 14, null],
      [19, 'ishita.roy@student.edu',  2, 14, null],

      // currently borrowed — upcoming due (<= 3 days)
      [6, 'ishita.roy@student.edu', 12, 14, null],    // due in 2 days

      // currently borrowed — overdue
      [1, 'sneha.kulkarni@student.edu', 25, 14, null], // 11 days overdue
      [12, 'karthik.iyer@student.edu', 22, 14, null],  // 8 days overdue
      [15, 'vikram.singh@student.edu', 20, 14, null],  // 6 days overdue
    ];

    let fineCount = 0;
    for (const [bookIdx, email, bAgo, dueIn, rAgo] of history) {
      const borrowedAt = isoDay(-bAgo);
      const dueDate = isoDay(-bAgo + dueIn);
      const returnedAt = rAgo === null ? null : isoDay(-rAgo);
      const status = rAgo === null ? 'BORROWED' : 'RETURNED';
      const info = insBorrow.run(bookIds[bookIdx], userIds[email], borrowedAt, dueDate, returnedAt, status, adminId);

      // Days past due at return time (or at now if still borrowed)
      const due = new Date(`${dueDate}T00:00:00Z`);
      const endDate = returnedAt ? new Date(`${returnedAt}T00:00:00Z`) : new Date(`${isoDay(0)}T00:00:00Z`);
      const daysOver = Math.floor((endDate - due) / 86400000);

      if (daysOver > 0) {
        const amount = daysOver * config.finePerDay;
        if (status === 'RETURNED') {
          // alternate paid/unpaid
          const paid = fineCount % 2 === 0;
          insFine.run(info.lastInsertRowid, userIds[email], amount, daysOver,
            paid ? 'PAID' : 'UNPAID', paid ? isoDay(-rAgo + 1) : null, isoDay(-rAgo));
          fineCount += 1;
        } else {
          insFine.run(info.lastInsertRowid, userIds[email], amount, daysOver, 'UNPAID', null, isoDay(0));
        }
      }
    }

    // Notifications ----------------------------------------------------------
    const insNote = db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insNote.run(userIds['rahul.verma@student.edu'], 'Welcome to the library portal',
      'Your student account has been created. You can borrow up to 5 books at a time.', 'info', 0, isoDay(-130));
    insNote.run(userIds['rahul.verma@student.edu'], 'Book borrowed successfully',
      'You borrowed "The C Programming Language". Due date: ' + isoDay(-6 + 14) + '.', 'success', 0, isoDay(-6));
    insNote.run(userIds['sneha.kulkarni@student.edu'], 'Book overdue',
      'Your copy of "Clean Code" is overdue. Please return it as soon as possible to avoid extra fines.', 'danger', 0, isoDay(-3));
    insNote.run(userIds['karthik.iyer@student.edu'], 'Book overdue',
      'Your copy of "Discrete Mathematics and Its Applications" is overdue. A fine is being charged per day.', 'danger', 0, isoDay(-2));
    insNote.run(userIds['vikram.singh@student.edu'], 'Fine unpaid reminder',
      'You have an unpaid fine on your account. Clear it at the library desk to avoid borrowing holds.', 'warning', 0, isoDay(-1));
    insNote.run(userIds['priya.nair@student.edu'], 'Return confirmed',
      'Your return of "Microelectronic Circuits" was recorded successfully.', 'success', 1, isoDay(-76));
  });

  tx();

  const counts = {
    categories: db.prepare('SELECT COUNT(*) c FROM categories').get().c,
    books: db.prepare('SELECT COUNT(*) c FROM books').get().c,
    users: db.prepare('SELECT COUNT(*) c FROM users').get().c,
    borrows: db.prepare('SELECT COUNT(*) c FROM borrow_records').get().c,
    fines: db.prepare('SELECT COUNT(*) c FROM fines').get().c,
    notifications: db.prepare('SELECT COUNT(*) c FROM notifications').get().c,
  };
  console.log('Seed complete:', JSON.stringify(counts));
  console.log('Admin login: admin@library.edu / Password123');
  console.log('Student login: rahul.verma@student.edu / Password123');
}

if (require.main === module) {
  seed();
}

module.exports = { seed, defaultPassword };
