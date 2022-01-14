const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {});
const expressLayouts = require("express-ejs-layouts");

//for run php file
const spawn = require("child_process").spawn;

//to fetch API
const axios = require("axios");

//utils
const formatMessage = require("./utils/messages");
const {userJoin,getCurrentUser,userLeave,getRoomUsers} = require("./utils/users");

//Require untuk encrypt   password
const crypto = require("crypto-js");

//Require untuk konfigurasi Flash
const session = require("express-session");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");

//konfigure session
const cookieTime = 1000 * 60 * 15;
app.use(cookieParser("secret"));
app.use(
  session({
    cookie: { maxAge: cookieTime },
    secret: "secret",
    resave: false,
    saveUninitialized: true,
  })
);
let sess;
app.use(flash());

//konfigurasi ejs
app.set("view engine", "ejs");
app.use(expressLayouts);
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
const port = 6969;

app.get("/cobaAPI", (req, res) => {
  axios("http://dino.dynalias.net/mobile/user/notaris/booking/my/24", { method: "GET" }).then((response) => res.send(response.data));
})

//jalan ketikan client terkoneksi
io.on("connection", (socket) => {
  console.log("Web Socket Connection");
  //menangani socket.emit('joinRoom)
  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);
    socket.join(user.room);

    socket.emit("message", formatMessage("ChatCord Bot", "Welcome to my ChatCord")); //emit untuk memasukkan data ke on

    socket.broadcast.to(user.room).emit("message", formatMessage("ChatCord Bot", `${user.username} has joined the chat`)); //emit untuk broadcast kecuali ke diri sendiri
    //io.emit("message", "Welcome to my ChatCord");//untuk broadcast ke semua user

    //send users and room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users:getRoomUsers(user.room),
    })
  });
  socket.on("chatMessage", (message) => {
    const user = getCurrentUser(socket.id);
    io.to(user.room).emit("message", formatMessage(user.username, message));
  });
  //listen on chatMessage
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);
    if (user) {
      io.to(user.room).emit("message", formatMessage("ChatCord Bot", `${user.username} has left the chat`));

      //send users and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

app.get('/coba', (req, res) => {
  const process = spawn('php', ["./index.php"]);
  process.stdout.on('data', data => {
    console.log("Data receive from php"+data.toString());
    res.send(data.toString())
  })
})

app.get("/", (req, res) => {
  if (req.cookies.username) return res.redirect("/chat");
  res.clearCookie("username");
  res.clearCookie("room");
  res.render("index", { title: "ChatCord App", layout: "layouts/main-layouts" });
});

app.get("/coba", (req, res) => res.send(req.body));

app.get("/chat", (req, res) => {
  if (!req.cookies.username) return res.redirect("/");
  //decrypt cookie username
  const bytesUsername = crypto.AES.decrypt(req.cookies.username, "secret key 123");
  const username = bytesUsername.toString(crypto.enc.Utf8);
  //decrypt cookie room
  const bytesRoom = crypto.AES.decrypt(req.cookies.room, "secret key 123");
  const room = bytesRoom.toString(crypto.enc.Utf8);
  console.log(username, room);
  res.render("chat", {
    title: "ChatCord App",
    layout: "layouts/main-layouts",
    username,
    room,
  });
});

app.get("/logout", (req, res) => {
  res.clearCookie("username");
  res.clearCookie("room");
  res.redirect("/");
});

app.post("/chat", (req, res) => {
  const { username, room } = req.body;
  //enkripsi password
  const encryptUsername = crypto.AES.encrypt(username, "secret key 123").toString();
  const encryptRoom = crypto.AES.encrypt(room, "secret key 123").toString();
  res.cookie("username", encryptUsername);
  res.cookie("room", encryptRoom);
  res.redirect("/chat");
});

http.listen(port, () => console.log("Aplikasi berjalan di http://localhost:" + port));
