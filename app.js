const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.json());
app.use(express.static('public'));

const usersFile = path.join(__dirname, 'users.json');

// file exist kore kina check kore
const fileExists = (filePath) => {
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath)) : [];
};


app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// signup
app.post('/signup', async (req, res) => {
  const { name, email, password, confirmPassword, anime1, anime2 } = req.body;
  const users = fileExists(usersFile);  

 
  const existingUser = users.find(user => user.email === email);
  if (existingUser) {
    return res.send('Email already exists. Please use another one.');
  }

  
  if (password !== confirmPassword) {
    return res.send('Passwords do not match.');
  }

  if (password.length < 8) {
    return res.send('Password must be at least 8 characters long.');
  }

  
  const uppercaseRegex = /[A-Z]/;
  if (!uppercaseRegex.test(password)) {
    return res.send('Password must contain at least one uppercase letter.');
  }

  
  const number = /[1-9]/;
  if (!number.test(password)) {
    return res.send('Password must contain at least one number.');
  }

  
  const hashedPassword = await bcrypt.hash(password, 10);

 
  const newUser = {
    name,
    email,
    password: hashedPassword, 
    animeList: [anime1, anime2] 
  };

  
  users.push(newUser);
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));  // Write back to users.json

  res.redirect('/login');
});


app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const users = fileExists(usersFile);

  const user = users.find(user => user.email === email);
  if (!user) {
    return res.send('User not found.');
  }

  // Compare passwords
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.send('Invalid password.');
  }

  // Redirect  kore dei hompage a with anime's list
  res.redirect(`/home?email=${user.email}`);
});

// Serve the home page
app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// API endpoint to fetch user data

app.get('/api/user', (req, res) => {
  const email = req.query.email;
  const users = fileExists(usersFile);

  const user = users.find(user => user.email === email);
  if (!user) {
    return res.status(404).send('User not found.');
  }

  res.json(user); 
});

// adding anime
app.get('/addAnime', (req, res) => {
  const email = req.query.email;
  res.send(`
    <form action="/addAnime" method="POST">
      <input type="text" name="anime" placeholder="New Anime" required />
      <input type="hidden" name="email" value="${email}" />
      <button type="submit">Add</button>
    </form>
  `);
});
app.post('/addAnime', (req, res) => {
    const { anime, email } = req.body;
    const users = fileExists(usersFile);

    const user = users.find(user => user.email === email);
    if (user) {
        user.animeList.push(anime);
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
        
        // Send back the newly added anime
        return res.redirect(`/home?email=${email}`);
    }
    
    res.status(404).send('User not found.');
});

// editing anime
app.get('/editAnime', (req, res) => {
  const email = req.query.email;
  const index = req.query.index;
  const users = fileExists(usersFile);
  const user = users.find(user => user.email === email);

  if (!user) {
    return res.send('User not found.');
  }

  const animeToEdit = user.animeList[index];
  
  res.send(`
    <h1>Edit Anime</h1>
    <form action="/updateAnime" method="POST">
      <input type="text" name="anime" value="${animeToEdit}" required />
      <input type="hidden" name="email" value="${email}" />
      <input type="hidden" name="index" value="${index}" />
      <button type="submit">Update</button>
    </form>
  `);
});

app.post('/updateAnime', (req, res) => {
  const { anime, email, index } = req.body;
  const users = fileExists(usersFile);
  
  const user = users.find(user => user.email === email);
  if (user) {
    
    const idx = parseInt(index, 10);
    if (idx >= 0 && idx < user.animeList.length) { // Check index bounds
      user.animeList[idx] = anime; // Update the anime entry
      fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
      return res.redirect(`/home?email=${email}`);
    } else {
      return res.status(400).send('Invalid index.');
    }
  }
  res.status(404).send('User not found.');
});

// deleting anime
app.post('/deleteAnime', (req, res) => {
  const { email, index } = req.body;
  const users = fileExists(usersFile);

  const user = users.find(user => user.email === email);
  if (user) {
    user.animeList.splice(index, 1); // Remove the anime entry at the given index
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  }

  res.redirect(`/home?email=${email}`);
});

app.listen(3300, () => {
  console.log('Server started on port 3300');
});
