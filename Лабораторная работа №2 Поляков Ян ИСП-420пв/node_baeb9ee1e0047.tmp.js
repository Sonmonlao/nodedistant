var express = require('express');
var bodyParser = require('body-parser');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('store.db');
var jwt = require('jsonwebtoken');

const SECRET_KEY="123456789"

db.serialize(() => {
   db.run(`
   CREATE TABLE IF NOT EXISTS products (
   id INTEGER PRIMARY KEY,
   name TEXT NOT NULL,
   price REAL NOT NULL,
   description TEXT
   );
   `);
});
db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    firstName TEXT,
    middleName TEXT,
    lastName TEXT,
    city TEXT
    );
    `);
 });

var app = express();

app.use(bodyParser.json());

app.get('/api/products', function (req, res) {
   db.all("SELECT * FROM products", (err, products) => {
       if (err) {
           res.status(500).json({ message: "Ошибка при получении товара" });
           return;
       }
       res.json(products);
   });
});

app.get('/api/products/:id', function (req, res) {
   var productId = parseInt(req.params.id);
   db.get("SELECT * FROM products WHERE id = ?", 
   [productId], (err, product) => {
       if (err) {
           res.status(500).json({ message: "Ошибка при получении товара" });
           return;
       }
       if (product) {
           res.json(product);
       } else {
           res.status(404).json({ message: "Товар не найден" });
       }
   });
});

app.post('/api/products', checkAdmin, function (req, res) {
   if (!req.body) {
       res.status(400).json({ message: "Ошибка в запросе" });
       return;
   }
   var productName = req.body.name;
   var productPrice = req.body.price;
   var productDescription = req.body.description;
   db.run("INSERT INTO products (name, price, description) VALUES (?, ?, ?)", 
   [productName, productPrice, productDescription], function (err) {
       if (err) {
           res.status(500).json({ message: "Ошибка создания товара" });
           return;
       }
       var newProductId = this.lastID;
       res.status(201).json({ id: newProductId, productName, productPrice, productDescription});
   });
});

app.delete('/api/products/:id', checkAdmin, function (req, res) {
   var productId = parseInt(req.params.id);
   db.run("DELETE FROM products WHERE id = ?", [productId], function (err) {
       if (err) {
           res.status(500).json({ message: "Ошибка при удалении товара" });
           return;
       }
       if (this.changes > 0) {
           res.json({ message: "Товар успешно удален" });
       } else {
           res.status(404).json({ message: "Товар не найден" });
       }
   });
});

app.put('/api/products/:id', checkAdmin, function (req, res) {
   if (!req.body) {
       res.status(400).json({ message: "Ошибка в запросе" });
       return;
   }
   var productId = parseInt(req.params.id);
   var productName = req.body.name;
   var productPrice = req.body.price;
   var productDescription = req.body.description;
   db.run("UPDATE products SET name = ?, price = ?, description = ? WHERE id = ?",
    [productName, productPrice, productDescription, productId], function (err) {
       if (err) {
           res.status(500).json({ message: "Ошибка при обновлении товара" });
           return;
       }
       if (this.changes > 0) {
           res.json({ id: productId, productName, productPrice,productDescription });
       } else {
           res.status(404).json({ message: "Товар не найден" });
       }
   });
});

app.post('/api/registration', function (req, res){
    var username = req.body.username;
    var password = req.body.password;
    var role = req.body.role;
    var firstName = req.body.firstName;
    var middleName = req.body.middleName;
    var lastName = req.body.lastName;
    var city = req.body.city;

  if (!username || !password || !role) {
    return res.status(400).json({ message: "Требуется заполнить имя пользователя, пароль и выбрать роль" });
  }

  db.run(
    "INSERT INTO users (username, password, role, firstName, middleName, lastName, city) VALUES (?,?,?,?,?,?,?) ",
    [username, password, role, firstName, middleName, lastName, city],
    function (err) {
      if (err) {
        console.error("Ошибка при регистрации:", err.message);
        res.status(500).json({ error: "Внутренняя ошибка сервера" }); 
        return;
      }

      var newUserId = this.lastID;
      res.status(201).json({ id: newUserId, username, role, firstName, middleName, lastName, city});
    },
  );
})
app.post('/api/login', verifyToken, function (req, res){
    var username = req.body.username;
    var password = req.body.password;

    if (!username || !password) {
        return res.status(400).json({ message: "Заполните логин и пароль"});
    }
    var user = { username, role: "user" }; 

    var token = jwt.sign(user, SECRET_KEY, { expiresIn: "1h" });
    res.json({ token });
})

function checkAdmin(req, res, next) {
    var token = req.headers.authorization;  
    if (!token) {
        return res.status(403).send({ message: "Отсутствует токен" });
    }
 
    jwt.verify(token, SECRET_KEY, function(err, decoded) {
        if (err) {
            return res.status(500).send({ message: "Ошибка аутентификации токена" });
        }
 
        if (decoded.role !== 'admin') {
            return res.status(403).send({ message: "Требуется роль администратора!" });
        }
 
        next();
    });
 }
 const verifyToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization'];
   
    if (bearerHeader) {
      const token = bearerHeader.split(' ')[1];
      req.token = token;
      jwt.verify(token, SECRET_KEY, function(err, decoded) {
          if (err) {
              return res.status(500).send({ message: "Ошибка аутентификации токена" });
          }
    
          if (decoded.role !== 'admin') {
              return res.status(403).send({ message: "Требуется роль администратора!" });
          }
    
          next();
      });
    } else {
      res.sendStatus(403);
    }
   };

app.listen(3000, function () {
   console.log('Сервер ждет подключения...');
});