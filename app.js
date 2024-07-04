const cookieParser = require("cookie-parser");
const express = require("express");
const path = require("path");
const userModel = require("./models/user");
const postModel = require("./models/post");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res, next) => {
  res.render("index");
});
app.post("/register", async (req, res, next) => {
  let { name, email, password } = req.body;
  let user = await userModel.findOne({ email });
  if (user)
    return res.send("you are already registered || please try to login");

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      let newuser = await userModel.create({
        name,
        email,
        password: hash,
      });
      let token = jwt.sign({ email: email, id: newuser._id }, "shhhh");
      res.cookie("token", token);
      res.redirect("/profile");
    });
  });
});
app.get("/login", (req, res, next) => {
  res.render("login");
});
app.post("/login", async (req, res, next) => {
  let { email, password } = req.body;
  let user = await userModel.findOne({ email });
  if (!user) return res.send("No such user");

  bcrypt.compare(password, user.password, (err, result) => {
    if (result) {
      let token = jwt.sign({ email: user.email, id: user._id }, "shhhh");
      res.cookie("token", token);
      return res.redirect("/profile");
    } else res.redirect("/login");
  });
});

app.get("/logout", (req, res, next) => {
  res.cookie("token", "");
  res.redirect("/login");
});

app.get("/profile", isLoggedIn, async (req, res, next) => {
  let user = await userModel.findOne({ email: req.user.email }).populate('posts');
  res.render("profile", { user });
});
app.post("/post", isLoggedIn, async (req, res, next) => {
    let user = await userModel.findOne({ email: req.user.email });
  let { content } = req.body;
  let post = await postModel.create({
    content,
    user: user._id
  });
  user.posts.push(post._id);
  await user.save();
  res.redirect("/profile");
});

app.get("/like/:postid", isLoggedIn, async (req, res)=>{
    let postid = req.params.postid;
    let post = await postModel.findOne({_id: postid }).populate('user');
    if(post.likes.indexOf(req.user.id) === -1){
        post.likes.push(req.user.id);
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.id), 1);
    }
    await post.save();
    res.redirect('/profile');
})

function isLoggedIn(req, res, next) {
  if (req.cookies.token === "") return res.send("you must be loggedin first");
  else {
    let data = jwt.verify(req.cookies.token, "shhhh");
    req.user = data;
  }
  next();
}
function isLogged(req, res, next) {
    if(!req.cookies.token === "") return res.redirect("/profile");
    else res.redirect("/profile");
    next();
}

app.listen(3000);
