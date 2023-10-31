class Sala {
  id;
  name;
  balls;
  jugadores=[];
  estados={};

  constructor(id, name, balls, jugadores, estados) {
    this.id = id;
    this.name = name;
    this.balls = balls;
    this.jugadores = jugadores;
    this.estados=estados;
  }
  getEstados() {
    return this.estados;
  }
  clearEstados() {
    this.estados={};
  }
  // puntos que lleva cada jugador en esta sala
  getColoresPorJugador(color) {
    let points=0;
    for (let i=0; i<this.balls; i++) {
      if (this.estados[i] === color) {
        points++;
      }
    }
    return points;
  }
  // en esta sala
  /*existeJugador(idJugador) {
    return (this.jugadores.indexOf(idJugador) !== -1)
  }*/
  contieneJugador(id) {
    var found = (this.jugadores.find((u) => u.id === id) != null);
    return found;
  }
  // en esta sala
  borrarJugador(idJugador){
    let i=0;
    this.jugadores.forEach(c=> { // req viene de juego.ejs
      if (c.id==idJugador) {
        this.jugadores.splice(i,1)
      } else { }
      i++;
    })
  }
  // en esta sala
  getNumeroJugadores(){
    return this.jugadores.length;
  }
  toString() {
    var str = "id " + this.id + " " + this.name + " " + this.balls + " "
        + this.jugadores.toString()
    +" "+estados.forEach(this.estadosToString());
    return str;
  }
}
module.exports = Sala;
