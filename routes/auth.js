const express = require("express");
const router = express.Router();
const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const Token = require("../models/tokenModel");
router.post("/register", async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser)
      return res
        .status(200)
        .send({ success: false, message: "User Already Registered" });

    const password = req.body.password;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    req.body.password = hashedPassword;
    const newuser = new User(req.body);
    await newuser.save();

    res.status(200).send({
      success: true,
      message: "Registration successfull",
    });
  } catch (error) {
    console.log(error);
    res.status(400).send(error);
  }
});

router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({
      email: req.body.email,
    });
    if (user) {
      const passwordsMached = await bcrypt.compare(
        req.body.password,
        user.password
      );
      if (passwordsMached) {
        const dataToBeSentToFrontend = {
          _id: user._id,
          email: user.email,
          name: user.name,
        };
        const token = jwt.sign(dataToBeSentToFrontend, process.env.JWT_SECRET, {
          expiresIn: 60 * 60,
        });
        res.status(200).send({
          success: true,
          message: "User Login Successfull",
          data: token,
        });
      } else
        res.status(200).send({ success: false, message: "Incorrect Password" });
    } else {
      res
        .status(200)
        .send({ success: false, message: "User Does Not Exists", data: null });
    }
  } catch (error) {
    res.status(400).send(error);
  }
});

router.post("/send-password-reset-link", async (req, res) => {
  try {
    const result = await User.findOne({ email: req.body.email });
    await sendEmail(result, "resetpassword");
    res.send({
      success: true,
      message: "Password reset link sent to your email successfully",
    });
  } catch (error) {
    res.status(500).send(error);
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const tokenData = await Token.findOne({ token: req.body.token });
    if (tokenData) {
      const password = req.body.password;
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await User.findByIdAndUpdate(tokenData.userid, {
        password: hashedPassword,
      });
      await Token.findOneAndDelete({ token: req.body.token });
      res.send({ success: true, message: "Password reset successfull" });
      const data = tokenData.userid;

      const result = await User.findById(data);
      await sendEmail(result, "afterreset");
    } else {
      res.send({ success: false, message: "Invalid token" });
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
