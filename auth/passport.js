const bcrypt = require("bcryptjs");
LocalStrategy = require("passport-local").Strategy;

//Load model
//const User = require("../models/User");

// DATOS LOCALES
const users = require("../data/data").users;
const salas = require("../data/data").salas;

const loginCheck = passport => {
  passport.use(
    new LocalStrategy({ usernameField: "email" }, (email, password, done) => {
    // Aquí se explica todo: https://www.youtube.com/watch?v=98tiYny-FyQ
    // comprueba que existe un usuario con ese email en la bd
      //Check customer USING mongodb
      /*User.findOne({ email: email })
        .then((user) => {
          if (!user) {
            console.log("wrong email");
            return done();
          }
          //Match Password en caso de que exista el user
          bcrypt.compare(password, user.password, (error, isMatch) => {
            if (error) throw error;
            if (isMatch) { // si son iguales en correo y contraseña
              return done(null, user); // envío null si no hubo error
            } else {
              console.log("Wrong password");
              return done();
            }
          });
        })
        .catch((error) => console.log(error));*/
      //Check local customer
      var foundUser=users.find((user)=>user.email===email);
      if (!foundUser) {
        console.log("Wrong email");
        return done();
      }
      //Match local Password
      bcrypt.compare(password, foundUser.password, (error, isMatch) => {
        if (error) return (error); //throw error;
        if (isMatch) {
          console.log("Correct password");
          return done(null, foundUser); // va a passport.serialize
        } else {
          console.log("Wrong password");
          return done(null,false);
        }
      });
    })
  );
    /*
    to persist a user's data into the session after successful authentication,
        passport.serializeUser() is setting id as cookie in user’s browser and
    * */
  passport.serializeUser((user, done) => {
      done(null, user.id); // mete el user.id en la cookie
  });
    /*
    used to retrieve a user's data from the session. It gets id from the cookie
    * */
  passport.deserializeUser((id, done) => {
    var user=users.find((user)=>user.id==id);
    if (user) {
        done(null, user);
    } else  {
        return done();
    }
    /*User.findById(id, (error, user) => {
      done(error, user); // si no hay error pasamos el user
    });*/
  });
};

module.exports = {
  loginCheck,
};
