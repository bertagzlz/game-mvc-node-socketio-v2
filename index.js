const WebSocketServer =require("socket.io");
const http = require("http");

const config=require('dotenv');
config.config(); // lee las var de entorno
const PORT = process.env.PORT || 4111;
const MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://localhost/socketsdb";

//const PORT =require("./config");
//import { PORT } from "./config";

// EXPRESS
const express = require("express");
const app = express();
//const cors=require("cors");
//app.use(cors());

// CARPETA PÚBLICA PASA JS, IMÁGENES
app.use(express.static('views'));
// USO EJS POR HABERLO USADO EN P2. motor plantillas similar a PUG
app.set("view engine", "ejs");

// BODY PARSING, usa express no body-parser

app.use(express.urlencoded({ extended: false }));
const session = require('express-session');
const passport = require("passport");
const { loginCheck } = require("./auth/passport");
loginCheck(passport);
app.use(session({
    secret:'p3node',
    saveUninitialized: true,
    resave: true
}));
// MODULO PASSPORT para autenticar usuarios con datos locales npm install passport-local
app.use(passport.initialize());
app.use(passport.session());
// ENTRADA PRINCIPAL A LA APLICACIÓN
app.use("/", require("./controllers/entrada"));

//   C A R G A   D E   D A T O S   L O C A L E S   D O S   A R R A Y S
global.users=require("./data/data").users;
global.arrSalas=require("./data/data").salas;
const Jugador = require("./models/Jugador.js");
const MiArray = require("./models/MiArray.js");

//   OBJETO DE CONEXIONES DE J U G A D O R E S
global.clients = {};

//   P A R T I D A S
const Sala = require("./models/Sala.js");
global.salas = new Map();
// array to Map
arrSalas.forEach(s=>{
    let value = new Sala(s.id,s.name,s.balls,s.jugadores,s.estado)
    salas.set(s.id,value)
})

global.conectados = new MiArray([]); //[]; //new Map()
/* se usa al hacer login y ver quién no ha entrado al sistema.
Evitamos que un usuario entre dos veces.*/
global.noConectados=new Map();

//   L I B R E R Í A   S O C K E T I O
const server = http.createServer(app);
const httpServer = server.listen(PORT);
const io = new WebSocketServer(httpServer);
console.log("Server on http://localhost:", PORT);

//   B U C L E   D E   M E N S A J E S
//   C O N N E C T
io.on("connection", (connection) => {
    //   D I S C O N N E C T
    connection.on("disconnect", () => console.log(connection.id+ " disconnected!"))
    //   M E S S A G E   F R O M   J U G A D O R
    connection.on("message", async (message) => {
        const result = JSON.parse(message)
        //   U N   J U G A D O R   S E   C O N E C T A,   H I Z O   L O G I N
        if (result.method === "connect") {
          //   J U G A D O R   A C T U A L
          const idNuevoConectado = result.idJugador;
          //   T O D O S   L O S   E N V Í O S   V A N   C O N   E S T A   C O N E X I Ó N
          clients[idNuevoConectado] = { "connection":  connection }
          console.log("connect del " + idNuevoConectado);
          //   INCREMENTO CONECTADOS
          conectados.getArray().push(idNuevoConectado);
          //   LOS CONECTADOS ME ENVÍAN, QUE SOY NUEVO, SUS AVATARES Y QUEDAN EN CONECTADOS
          updateAvatarEnConectadosV2(idNuevoConectado);
          //   ACABO DE COENCTARME, DEBO RECIBIR AVATARES DE LOS QUE ESTÁN JUGANDO QUEDANDO EN LAS SALAS
          recibirAvatarJugador(idNuevoConectado);
        }
        //   U N   J U G A D O R   W A N T   T O   J O I N   I N   A   S A L A
        if (result.method === "join") {
            const idJugador = result.idJugador;
            const idSala = Number(result.idSala);
            console.log("JOIN del "+ idJugador +" en sala "+idSala);

            let sala = salas.get(idSala);
            if (sala.getNumeroJugadores() > 2) { console.log("sorry max players reached"); return; }
            //   E N T R A   E N   S A L A
            sala.jugadores.push({
                "id": users[idJugador].id,
                "color": users[idJugador].color
            })
            // T O D O S   R E C I B E N   E L   A V A T A R   D E L   N U E V O JOINED
            updateMiAvatarAlResto(idJugador, idSala);
            borraMiAvatarEnRestoConectados(idJugador);
            //   S I   A D E M Á S   H A Y   D O S   E N   S A L A   S T A R T   T H E   G A M E
            if (sala.getNumeroJugadores() === 2) {
              // A   T O D O S   L O S   D E   L A   S A L A,   Y   A   É L
              // PONE SU COLOR Y DIBUJAR TABLERO VACÍO
                const payLoad = { "method": "joined", "sala": sala, "color": "-1" }
                sala.jugadores.forEach(j => {
                    payLoad.color = j.color;
                    clients[j.id].connection.emit("message", JSON.stringify(payLoad));
                })
            }
        }
        //   U N   J U G A D O R   J U E G A
        if (result.method === "play") {
          const idJugador = result.idJugador;
          const idSala = Number(result.idSala);
          const idBall = result.idBall;
          const color = result.color; // color bola o sala.jugadores[index].color

          const sala = salas.get(idSala);
          let state = sala.estados; // estados ={}
          if (!state)  // state es un objeto  con keys {1, 2,...} {1: "Red"}. state.1 ó state[1] vale "Red"
            state = {}
          state[idBall] = color; // añade nuevo color
          sala.estados = state;

          // A C T U A L I Z O   E S T A D O S   y   B A R R A S   D E   P R O G R E S O   A   T O D O S
          updateGameState(sala, idJugador); // sala tiene dos jugadres, necesito uno

          let points = 0;
          points=sala.getColoresPorJugador(color); // puntos que tiene esta sala de color=color
          // A   T O D O S LOS DE ESA SALA:   idJugador   H A   G A N A D O
          if (points > 7) {
            console.log("Gana el jugador: " + idJugador);
            const payLoad = { "method": "win", "idJugador": idJugador, }
            sala.jugadores.forEach(j => {
              clients[j.id].connection.emit("message", JSON.stringify(payLoad))
            })
          }
        }
    })   //   F I N   P L A Y   F R O M   J U G A D O R
})

// A   T O D O S   L O S   U S U A R I O S   E N V I A M O S   E L   J U E G O   C O M P L E T O
// CADA 0,5 SEG.
function updateGameState(sala, idJugador){
  let index = -1;
  const isElement = (j) => j.id ===idJugador;
  index=sala.jugadores.findIndex(isElement);
  let porcentaje=0;
  porcentaje=5*sala.getColoresPorJugador(sala.jugadores[index].color);
  const payLoad = { "method": "update", "sala": sala, "index": index, "porcentaje": porcentaje }
  io.emit("message", JSON.stringify(payLoad))
  //setTimeout(updateGameState(), 500);
}

//   MÉTODOS   C O N E C T
// tengo A y se conecta B
// A envía a B su avatar A BA
// B envía a A su avatar AB BA

// si tengo tres A B C y C acaba de conectarse: AB BA C
// B mete el avatar de C    AB BAC C
// C mete el avatar de B    AB BAC CB
// A mete el avatar de C    ABC BAC CB
// C mete el avatar de A    ABC BAC CBA luego funciona...
function updateAvatarEnConectados(idNuevoConectado) {
    conectados.getArray().forEach(idResto=> {
        if (idNuevoConectado != idResto) {
            sendPayLoad("updateAvatarEnConectados",idResto,idNuevoConectado, false);
            sendPayLoad("updateAvatarEnConectados",idNuevoConectado,idResto, false);
        }
    });
}
function updateAvatarEnConectadosV2(idNuevoConectado) { // también funciona
    const payLoad = { "method": "updateAvatarEnConectados", "idJugador": idNuevoConectado, "draggable":false }
    clients[idNuevoConectado].connection.broadcast.emit("message", JSON.stringify(payLoad))
    conectados.getArray().forEach(idResto=> {
        if (idNuevoConectado != idResto) {
            payLoad.idJugador=idResto;
            clients[idNuevoConectado].connection.emit("message", JSON.stringify(payLoad))
        }
    });
}

// si tengo dos A y B que están en salas (jugando) y C acaba de conectarse:
// C debe recibir A en su sala
// C debe recibir B en su sala
function recibirAvatarJugador(idReceptor){
    for (const [key, value] of salas) {
        const sala = salas.get(key);
        sala.jugadores.forEach(e=> { // elemento del array
            const payLoad = { "method": "recibirAvatarJugador", "idJugador": e.id, "idSala": key, }
            clients[idReceptor].connection.emit("message", JSON.stringify(payLoad))
        });
    }
}
// entra a jugar a la sala, sale de su barra de conectados don Drag&drop y el resto de usuarios
// debe saberlo para borrarlo también

//   MÉTODOS   J O I N
// entra a join a la sala, las salas de los otros deben tener este avatar
function updateMiAvatarAlResto(idJugador,idSala) {
    // el 1 es el idJugador, se lo tiene que decir al 0
    const payLoad = {
        "method": "updateMiAvatarAlResto",
        "idJugador": idJugador,
        "idSala": idSala,
    }
    // a todos los clientes en el espacio de nombres actual excepto el remitente
    clients[idJugador].connection.broadcast.emit("message", JSON.stringify(payLoad));

    /*conectados.getArray().forEach(idContrario=> {
        if (idJugador != idContrario) {

            // al contrario le pongo mi avatar en la sala
            const s="message";
            clients[idContrario].connection.emit(s, JSON.stringify(payLoad))
            //clients[idContrario].connection.send(JSON.stringify(payLoad))
            console.log("updateAvatar mio en el contrario " + idContrario);
        }
    });*/
}
// entra a join a la sala, sale de su barra de conectados con Drag&drop pero el resto de usuarios
// debe saberlo para borrarlo también
function borraMiAvatarEnRestoConectados(idJugador) {
    conectados.getArray().forEach(idContrario=> {
        if (idJugador != idContrario) {
            sendPayLoad("borraMiAvatarEnRestoConectados",idContrario,idJugador, false);
        }
    });
}

//   MÉTODOS   G L O B A L E S   D E   A Y U D A
function sendPayLoad(method, whom, who,draggable) {
    const payLoad = { "method": method, "idJugador": who, "draggable":draggable }
    //clients[who].connection.send(JSON.stringify(payLoad))
    clients[whom].connection.emit("message", JSON.stringify(payLoad))
    console.log(method + " "+whom);
}

