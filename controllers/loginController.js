const passport = require("passport");
const bcrypt = require("bcryptjs");

//   M O D E L O   D E   D A T O S
const Jugador = require("../models/Jugador.js");

//   D A T O S   L O C A L E S   S I N   P E R S I S T E N C I A
// los tengo como globales en index.js

//   R E G I S T E R
//   V I S T A
const registerView = (req, res) => {
  res.render("register", {});
};
//   S U B M I T for Register
const registerUser = (req, res) => {
  const { name, email, password, confirm, imagen } = req.body;

  if (!name || !email || !password || !confirm || !imagen) {
    console.log("Rellene campos vacíos");
  }

  //Confirm Passwords
  if (password !== confirm) {
    console.log("Passwords deben emparejar");
  } else {

  // Validation and redirect login o register (change email)
  var foundUser=users.find((u)=> u.email === email);
  if (foundUser) {
    console.log("email existe");
    res.render("register", { name, email, password, confirm, imagen })
  } else {

  //const newUser = new Userlocal(name, email, password,imagen);
  const newJugador = new Jugador(-1,name, email, password,imagen);

  //Password Hashing
  bcrypt.genSalt(10, (err, salt) =>
    bcrypt.hash(newJugador.password, salt, (err, hash) => {
             if (err) console.log(err);
          newJugador.password = hash;
              //catch((err) => console.log(err));
        })
  );
  // id
  const ids = users.map((user) => user.id);
  let id = Math.max(...ids) + 1;
  newJugador.id=id;
  // color
  let color = '#'+Math.floor(Math.random()*16777215).toString(16);
  //newUser.setColor(id,color);
  newJugador.color=color;
  newJugador.log();
  users.push(newJugador);
  res.render("login", {});

    }
  }
};

//   L O G I N   V I S T A
const loginView = (req, res) => {
  noConectados.clear(); // borra todos los elem del Map
  users.forEach(u=>{
    if (conectados.contiene(u.id)) {
    } else {
      noConectados.set(u.id, u);
    }
  });
  res.render("login", {});
};
//   l O G I N   S U B M I T // redirect login OR juego
const loginUser = (req, res) => {
  const { email, password } =req.body;
  if (!email || !password) {
    console.log("Rellene todos los campos");
    res.render("login", { email, password, });
  }
  else {
    var foundUser = users.find((u) => u.email === email);
    //if (foundUser!=null) esteJugador=foundUser;
    if (noConectados.has(foundUser.id)) noConectados.delete(foundUser.id);
    passport.authenticate("local", {
      successRedirect: "/juego",
      failureRedirect: "/login",
      failureFlash: true,
    })(req, res);
  }
};

const logoutUser=function(req, res, error_message) {
  try {
    // no uso la sesión, es la misma para todas las ventanas, única para un mismo browser
    // req.user devuelve siempre el último user logueado que se almacena en la sesión, luego no me sirve
    userId=Number(req.params.userId);
    var foundUser=users.find((user)=>user.id===userId);
    let sala = null;
    let existeEnLaSala = false;
    let hayJugando = 0;
    for (const [key, value] of salas) {
      sala = salas.get(key); // g vale "1"....es el idSala
      existeEnLaSala = sala.contieneJugador(userId);
      hayJugando = sala.getNumeroJugadores();
      if (existeEnLaSala) {
        sala.clearEstados();
        sala.borrarJugador(userId);
        break;}
    }
    // PARA TODOS LOS CONECTADOS
    conectados.getArray().forEach(idConectado => {
      if (existeEnLaSala) {
        const payLoad = { "method": "disjoin", "sala": sala, "clientAQuitar": userId }
        console.log("\t"+userId+" sale de la sala "+sala.id+" en el usuario "+idConectado);
        clients[idConectado].connection.emit("message",JSON.stringify(payLoad))
      }
      else {
        // ESTABA CONECTADO PERO EN NINGUNA SALA
        //const payLoad = { "method": "borraMiAvatarEnRestoConectados", "idJugador": req.user.id }
        //console.log("\tborra Avatar del "+req.user.id+ " en el user "+idConectado);
        //clients[idConectado].connection.broadcast.emit("message",JSON.stringify(payLoad))
      }

    })
    if (!existeEnLaSala) {
      const payLoad = { "method": "borraMiAvatarEnRestoConectados", "idJugador": userId }
      console.log("\tborra Avatar del "+req.user.id+ " en el resto");
      clients[userId].connection.broadcast.emit("message",JSON.stringify(payLoad))
    }
    conectados.quitarElemento(userId);
    noConectados.set(userId, foundUser );
    delete req.session.authStatus;
    delete req.user;
    res.render("login", {});

  } catch (error) {
    res.end("LogoutUser. Internal server error.\n"+error_message);
  }
}

module.exports = {
  registerView,
  loginView,
  registerUser,
  loginUser,
  logoutUser,
};
