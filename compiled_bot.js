'use strict';

var SPECS = {"COMMUNICATION_BITS":16,"CASTLE_TALK_BITS":8,"MAX_ROUNDS":1000,"TRICKLE_FUEL":25,"INITIAL_KARBONITE":100,"INITIAL_FUEL":500,"MINE_FUEL_COST":1,"KARBONITE_YIELD":2,"FUEL_YIELD":10,"MAX_TRADE":1024,"MAX_BOARD_SIZE":64,"MAX_ID":4096,"CASTLE":0,"CHURCH":1,"PILGRIM":2,"CRUSADER":3,"PROPHET":4,"PREACHER":5,"RED":0,"BLUE":1,"CHESS_INITIAL":100,"CHESS_EXTRA":20,"TURN_MAX_TIME":200,"MAX_MEMORY":50000000,"UNITS":[{"CONSTRUCTION_KARBONITE":null,"CONSTRUCTION_FUEL":null,"KARBONITE_CAPACITY":null,"FUEL_CAPACITY":null,"SPEED":0,"FUEL_PER_MOVE":null,"STARTING_HP":100,"VISION_RADIUS":100,"ATTACK_DAMAGE":null,"ATTACK_RADIUS":null,"ATTACK_FUEL_COST":null,"DAMAGE_SPREAD":null},{"CONSTRUCTION_KARBONITE":50,"CONSTRUCTION_FUEL":200,"KARBONITE_CAPACITY":null,"FUEL_CAPACITY":null,"SPEED":0,"FUEL_PER_MOVE":null,"STARTING_HP":50,"VISION_RADIUS":100,"ATTACK_DAMAGE":null,"ATTACK_RADIUS":null,"ATTACK_FUEL_COST":null,"DAMAGE_SPREAD":null},{"CONSTRUCTION_KARBONITE":10,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":1,"STARTING_HP":10,"VISION_RADIUS":100,"ATTACK_DAMAGE":null,"ATTACK_RADIUS":null,"ATTACK_FUEL_COST":null,"DAMAGE_SPREAD":null},{"CONSTRUCTION_KARBONITE":20,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":9,"FUEL_PER_MOVE":1,"STARTING_HP":40,"VISION_RADIUS":36,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[1,16],"ATTACK_FUEL_COST":10,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":25,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":2,"STARTING_HP":20,"VISION_RADIUS":64,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[16,64],"ATTACK_FUEL_COST":25,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":30,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":3,"STARTING_HP":60,"VISION_RADIUS":16,"ATTACK_DAMAGE":20,"ATTACK_RADIUS":[1,16],"ATTACK_FUEL_COST":15,"DAMAGE_SPREAD":3}]};

function insulate(content) {
    return JSON.parse(JSON.stringify(content));
}

class BCAbstractRobot {
    constructor() {
        this._bc_reset_state();
    }

    // Hook called by runtime, sets state and calls turn.
    _do_turn(game_state) {
        this._bc_game_state = game_state;
        this.id = game_state.id;
        this.karbonite = game_state.karbonite;
        this.fuel = game_state.fuel;
        this.last_offer = game_state.last_offer;

        this.me = this.getRobot(this.id);

        if (this.me.turn === 1) {
            this.map = game_state.map;
            this.karbonite_map = game_state.karbonite_map;
            this.fuel_map = game_state.fuel_map;
        }

        try {
            var t = this.turn();
        } catch (e) {
            t = this._bc_error_action(e);
        }

        if (!t) t = this._bc_null_action();

        t.signal = this._bc_signal;
        t.signal_radius = this._bc_signal_radius;
        t.logs = this._bc_logs;
        t.castle_talk = this._bc_castle_talk;

        this._bc_reset_state();

        return t;
    }

    _bc_reset_state() {
        // Internal robot state representation
        this._bc_logs = [];
        this._bc_signal = 0;
        this._bc_signal_radius = 0;
        this._bc_game_state = null;
        this._bc_castle_talk = 0;
        this.me = null;
        this.id = null;
        this.fuel = null;
        this.karbonite = null;
        this.last_offer = null;
    }

    // Action template
    _bc_null_action() {
        return {
            'signal': this._bc_signal,
            'signal_radius': this._bc_signal_radius,
            'logs': this._bc_logs,
            'castle_talk': this._bc_castle_talk
        };
    }

    _bc_error_action(e) {
        var a = this._bc_null_action();
        
        if (e.stack) a.error = e.stack;
        else a.error = e.toString();

        return a;
    }

    _bc_action(action, properties) {
        var a = this._bc_null_action();
        if (properties) for (var key in properties) { a[key] = properties[key]; }
        a['action'] = action;
        return a;
    }

    _bc_check_on_map(x, y) {
        return x >= 0 && x < this._bc_game_state.shadow[0].length && y >= 0 && y < this._bc_game_state.shadow.length;
    }
    
    log(message) {
        this._bc_logs.push(JSON.stringify(message));
    }

    // Set signal value.
    signal(value, radius) {
        // Check if enough fuel to signal, and that valid value.

        if (this.fuel < radius) throw "Not enough fuel to signal given radius.";
        if (!Number.isInteger(value) || value < 0 || value >= Math.pow(2,SPECS.COMMUNICATION_BITS)) throw "Invalid signal, must be int within bit range.";
        if (radius > 2*Math.pow(SPECS.MAX_BOARD_SIZE-1,2)) throw "Signal radius is too big.";

        this._bc_signal = value;
        this._bc_signal_radius = radius;

        this.fuel -= radius;
    }

    // Set castle talk value.
    castleTalk(value) {
        // Check if enough fuel to signal, and that valid value.

        if (!Number.isInteger(value) || value < 0 || value >= Math.pow(2,SPECS.CASTLE_TALK_BITS)) throw "Invalid castle talk, must be between 0 and 2^8.";

        this._bc_castle_talk = value;
    }

    proposeTrade(karbonite, fuel) {
        if (this.me.unit !== SPECS.CASTLE) throw "Only castles can trade.";
        if (!Number.isInteger(karbonite) || !Number.isInteger(fuel)) throw "Must propose integer valued trade."
        if (Math.abs(karbonite) >= SPECS.MAX_TRADE || Math.abs(fuel) >= SPECS.MAX_TRADE) throw "Cannot trade over " + SPECS.MAX_TRADE + " in a given turn.";

        return this._bc_action('trade', {
            trade_fuel: fuel,
            trade_karbonite: karbonite
        });
    }

    buildUnit(unit, dx, dy) {
        if (this.me.unit !== SPECS.PILGRIM && this.me.unit !== SPECS.CASTLE && this.me.unit !== SPECS.CHURCH) throw "This unit type cannot build.";
        if (this.me.unit === SPECS.PILGRIM && unit !== SPECS.CHURCH) throw "Pilgrims can only build churches.";
        if (this.me.unit !== SPECS.PILGRIM && unit === SPECS.CHURCH) throw "Only pilgrims can build churches.";
        
        if (!Number.isInteger(dx) || !Number.isInteger(dx) || dx < -1 || dy < -1 || dx > 1 || dy > 1) throw "Can only build in adjacent squares.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't build units off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] > 0) throw "Cannot build on occupied tile.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot build onto impassable terrain.";
        if (this.karbonite < SPECS.UNITS[unit].CONSTRUCTION_KARBONITE || this.fuel < SPECS.UNITS[unit].CONSTRUCTION_FUEL) throw "Cannot afford to build specified unit.";

        return this._bc_action('build', {
            dx: dx, dy: dy,
            build_unit: unit
        });
    }

    move(dx, dy) {
        if (this.me.unit === SPECS.CASTLE || this.me.unit === SPECS.CHURCH) throw "Churches and Castles cannot move.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't move off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === -1) throw "Cannot move outside of vision range.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] !== 0) throw "Cannot move onto occupied tile.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot move onto impassable terrain.";

        var r = Math.pow(dx,2) + Math.pow(dy,2);  // Squared radius
        if (r > SPECS.UNITS[this.me.unit]['SPEED']) throw "Slow down, cowboy.  Tried to move faster than unit can.";
        if (this.fuel < r*SPECS.UNITS[this.me.unit]['FUEL_PER_MOVE']) throw "Not enough fuel to move at given speed.";

        return this._bc_action('move', {
            dx: dx, dy: dy
        });
    }

    mine() {
        if (this.me.unit !== SPECS.PILGRIM) throw "Only Pilgrims can mine.";
        if (this.fuel < SPECS.MINE_FUEL_COST) throw "Not enough fuel to mine.";
        
        if (this.karbonite_map[this.me.y][this.me.x]) {
            if (this.me.karbonite >= SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY) throw "Cannot mine, as at karbonite capacity.";
        } else if (this.fuel_map[this.me.y][this.me.x]) {
            if (this.me.fuel >= SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY) throw "Cannot mine, as at fuel capacity.";
        } else throw "Cannot mine square without fuel or karbonite.";

        return this._bc_action('mine');
    }

    give(dx, dy, karbonite, fuel) {
        if (dx > 1 || dx < -1 || dy > 1 || dy < -1 || (dx === 0 && dy === 0)) throw "Can only give to adjacent squares.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't give off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] <= 0) throw "Cannot give to empty square.";
        if (karbonite < 0 || fuel < 0 || this.me.karbonite < karbonite || this.me.fuel < fuel) throw "Do not have specified amount to give.";

        return this._bc_action('give', {
            dx:dx, dy:dy,
            give_karbonite:karbonite,
            give_fuel:fuel
        });
    }

    attack(dx, dy) {
        if (this.me.unit !== SPECS.CRUSADER && this.me.unit !== SPECS.PREACHER && this.me.unit !== SPECS.PROPHET) throw "Given unit cannot attack.";
        if (this.fuel < SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) throw "Not enough fuel to attack.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't attack off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === -1) throw "Cannot attack outside of vision range.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot attack impassable terrain.";

        var r = Math.pow(dx,2) + Math.pow(dy,2);
        if (r > SPECS.UNITS[this.me.unit]['ATTACK_RADIUS'][1] || r < SPECS.UNITS[this.me.unit]['ATTACK_RADIUS'][0]) throw "Cannot attack outside of attack range.";

        return this._bc_action('attack', {
            dx:dx, dy:dy
        });
        
    }


    // Get robot of a given ID
    getRobot(id) {
        if (id <= 0) return null;
        for (var i=0; i<this._bc_game_state.visible.length; i++) {
            if (this._bc_game_state.visible[i].id === id) {
                return insulate(this._bc_game_state.visible[i]);
            }
        } return null;
    }

    // Check if a given robot is visible.
    isVisible(robot) {
        return ('x' in robot);
    }

    // Check if a given robot is sending you radio.
    isRadioing(robot) {
        return robot.signal >= 0;
    }

    // Get map of visible robot IDs.
    getVisibleRobotMap() {
        return this._bc_game_state.shadow;
    }

    // Get boolean map of passable terrain.
    getPassableMap() {
        return this.map;
    }

    // Get boolean map of karbonite points.
    getKarboniteMap() {
        return this.karbonite_map;
    }

    // Get boolean map of impassable terrain.
    getFuelMap() {
        return this.fuel_map;
    }

    // Get a list of robots visible to you.
    getVisibleRobots() {
        return this._bc_game_state.visible;
    }

    turn() {
        return null;
    }
}

class Tile {
  constructor(x, y, distance, previousTile) {
    this.x = x;
    this.y = y;
    this.distance = distance;
    this.previousTile = previousTile;
  }

  getXY() {
    return [this.x, this.y];
  }

  getNeighbors(map) {
    var tiles = [];
    for (var x = -1; x < 2; x++) {
      for (var y = -1; y < 2; y++) {
        const dX = x + this.x;
        const dY = y + this.y;
        if ((dX >= 0 && dX < map.length && dY >= 0 && dY < map.length) && map[dY][dX]) {
          if (x != 0 || y != 0) {
            var tile = new Tile(x + this.x, y + this.y, this.distance + 1, this);
            tiles.push(tile);
          }
          map[dY][dX] = false;
        }
      }
    }

    return [tiles, map];
  }

  getMovement(other) {
    var dX = other.x - this.x;
    var dY = other.y - this.y;
    if (dX != 0) dX /= Math.abs(dX);
    if (dY != 0) dY /= Math.abs(dY);

    return [dX, dY];
  }

  toString() {
    return "x: " + this.x + " y: " + this.y;
  }

}

// https://github.com/mourner/tinyqueue

class MinPQ {
    constructor(data = [], compare = defaultCompare) {
        this.data = data;
        this.length = this.data.length;
        this.compare = compare;

        if (this.length > 0) {
            for (let i = (this.length >> 1) - 1; i >= 0; i--) this._down(i);
        }
    }

    push(item) {
        this.data.push(item);
        this.length++;
        this._up(this.length - 1);
    }

    pop() {
        if (this.length === 0) return undefined;

        const top = this.data[0];
        const bottom = this.data.pop();
        this.length--;

        if (this.length > 0) {
            this.data[0] = bottom;
            this._down(0);
        }

        return top;
    }

    peek() {
        return this.data[0];
    }

    size() {
      return this.length;
    }

    _up(pos) {
        const {data, compare} = this;
        const item = data[pos];

        while (pos > 0) {
            const parent = (pos - 1) >> 1;
            const current = data[parent];
            if (compare(item, current) >= 0) break;
            data[pos] = current;
            pos = parent;
        }

        data[pos] = item;
    }

    _down(pos) {
        const {data, compare} = this;
        const halfLength = this.length >> 1;
        const item = data[pos];

        while (pos < halfLength) {
            let left = (pos << 1) + 1;
            let best = data[left];
            const right = left + 1;

            if (right < this.length && compare(data[right], best) < 0) {
                left = right;
                best = data[right];
            }
            if (compare(best, item) >= 0) break;

            data[pos] = best;
            pos = left;
        }

        data[pos] = item;
    }
}

function defaultCompare(a, b) {
    return a.distance < b.distance ? -1 : a.distance > b.distance ? 1 : 0;
}

function getPath(loc, dest, passMap) {
  var pathMap = [];
  for (var x = 0; x < passMap.length; x++) {
    for (var y = 0; y < passMap[x].length; y++) {
        pathMap[x] = passMap[x].slice();
    }
  }

  const destX = dest[0];
  const destY = dest[1];
  var distance = 0;

  var minPQ = new MinPQ();

  var tile = new Tile(loc[0], loc[1], distance, null);
  pathMap[loc[1]][loc[0]] = false;
  minPQ.push(tile);

  while (minPQ.size() != 0 && (minPQ.peek().x != destX || minPQ.peek().y != destY)) {
    var minTile = minPQ.pop();
    var neighbors = minTile.getNeighbors(pathMap);
    for (var i = 0; i < neighbors[0].length; i++) {
      minPQ.push(neighbors[0][i]);
    }
    pathMap = neighbors[1];
  }

  var path = [];
  var pathTile = minPQ.peek();

  while (pathTile != null) {
    path.unshift(pathTile);
    pathTile = pathTile.previousTile;
  }

  /*
  for (var i = 0; i < path.length; i++) {
    this.log(path[i].toString());
  }
  */

  return path;
}

// bc19run -b javascript -r javascript --replay "replay.bc19" --seed 1
// --chi 1000


var step = -1;

var path = [];
var destination = [];

var home = false;

var mode = "";

// Only to be used by castles making lattices
var radius = 3;
var lattice = [];

// Castles and churches modify this when they build an unit, units modify right after they are created
var justBuiltUnit = false;
var justBuilt = true;

class MyRobot extends BCAbstractRobot {
    turn() {
        step++;

        if (this.me.unit === SPECS.CASTLE) {

          if (justBuiltUnit) {
            switch (justBuiltUnit) {
              case SPECS.PILGRIM :
                const resources = this.karbonite_map;
                var nearPath = this.findNearestPath(resources);
                const nearTile = nearPath.pop();
                var signalValue = nearTile.x.toString();
                if (nearTile.y < 10) signalValue += "0" + nearTile.y.toString();
                else signalValue += nearTile.y.toString();
                signalValue = parseInt(signalValue);
                this.signal(signalValue, 3);
                break;

              case SPECS.PROPHET :
                const passMap = this.overlapPassableMaps(this.map, this.getVisibleRobotMap());
                var signalValue = null;
                while (!signalValue) {
                  for (var r = this.me.x - radius; r <= this.me.x + radius; r += 2) {
                    for (var s = this.me.y - radius; s <= this.me.y + radius; s += 2) {
                      if (passMap[s][r] && !lattice.includes([r,s])) {
                        signalValue = r.toString();
                        if (s < 10) signalValue += "0" + s.toString();
                        else signalValue += s.toString();
                        signalValue = parseInt(signalValue);
                        lattice.push([r, s]);
                        this.signal(signalValue, 3);
                      }
                    }
                  }
                  if (!signalValue) { radius++; }
                }

                break;
            }

            justBuiltUnit = false;

          }

          else {
            if (step == 0) {
              this.log("Building Pilgrim");
              const passMap = this.overlapPassableMaps(this.map, this.getVisibleRobotMap());
              const buildCoords = this.buildAround([this.me.x, this.me.y], passMap);

              justBuiltUnit = SPECS.PILGRIM;
              return this.buildUnit(SPECS.PILGRIM, buildCoords[0], buildCoords[1]);
            }

            else if (this.karbonite >= 25 && this.fuel >= 50){
              this.log("Building Prophet");
              const passMap = this.overlapPassableMaps(this.map, this.getVisibleRobotMap());
              const buildCoords = this.buildAround([this.me.x, this.me.y], passMap);

              justBuiltUnit = SPECS.PROPHET;
              return this.buildUnit(SPECS.PROPHET, buildCoords[0], buildCoords[1]);
            }
          }
        }

        else if (this.me.unit === SPECS.PILGRIM) {

          if (!home) {
            home = [this.me.x, this.me.y];
          }

          const visRobots = this.getVisibleRobots();

          if (justBuilt == 2) {

            var signal = null;
            for (var i = 0; i < visRobots.length; i++) {
              if (visRobots[i].unit == SPECS.CASTLE && this.isRadioing(visRobots[i])) {
                signal = visRobots[i].signal;
              }
            }

            const x = Math.floor(signal / 100);
            const y = signal % 100;
            destination = [x, y];

            mode = "TOMINE";
            justBuilt++;
          }

          if (justBuilt == 3) {

            const location = [this.me.x, this.me.y];
            const passMap = this.overlapPassableMaps(this.map, this.getVisibleRobotMap());
            //this.log(passMap);
            path = getPath(location, destination, passMap);

            if (mode == "TOHOME") {
              const loc = [this.me.x, this.me.y];
              const visRobots = this.getVisibleRobots();

              for (var i = 0; i < visRobots.length; i++) {
                if (visRobots[i].unit == SPECS.CASTLE || visRobots[i].unit == SPECS.CHURCH) {
                  var dX = visRobots[i].x - this.me.x;
                  var dY = visRobots[i].y - this.me.y;
                  if ((Math.abs(dX) == 0 || Math.abs(dX) == 1) && (Math.abs(dY) == 0 || Math.abs(dY) == 1)) {
                    mode = "TOMINE";
                    const k = home.slice();
                    home = destination;
                    destination = k;
                    return this.give(dX, dY, this.me.karbonite, 0);
                  }
                }
              }
            }

            if (mode == "MINING") {
              if (this.me.karbonite == 20) { mode = "TOHOME"; }
              else {
                return this.mine();
              }
            }

            if (this.me.x == destination[0] && this.me.y == destination[1]) {
              if (mode == "TOMINE") {
                mode = "MINING";
                const k = home.slice();
                home = destination;
                destination = k;
              }
            }

            // To be modified - combine multiple movements that don't exceed r^2, which, for pilgrims, is 4
            var choice = [0, 0];
            for (var i = 0; i < 1; i++) {
              const pathStep = path.shift();
              if (path[0] != null) {
                const nextStep = path[0];
                const nextStepMove = pathStep.getMovement(nextStep);
                choice[0] += nextStepMove[0];
                choice[1] += nextStepMove[1];
              }
            }

            return this.move(...choice);



            /*
            var count = 0;
            for (var x = 0; x < resources.length; x++) {
              for (var y = 0; y < resources[x].length; y++) {
                if (resources[y][x] && count == signal) {
                  destination = [x, y];
                }
                else if (resources[y][x]) {
                  count++;
                }
              }
            }
            if (destination != null) {
              justBuilt = null;
            }
            */
          }

          if (justBuilt) {
            justBuilt += 1;
          }
        }

        else if (this.me.unit === SPECS.PROPHET) {

          const visRobots = this.getVisibleRobots();

          if (justBuilt == 2) {

            var signal = null;
            for (var i = 0; i < visRobots.length; i++) {
              if (visRobots[i].unit == SPECS.CASTLE && this.isRadioing(visRobots[i])) {
                signal = visRobots[i].signal;
              }
            }

            const x = Math.floor(signal / 100);
            const y = signal % 100;
            destination = [x, y];

            justBuilt = false;
          }

          else if (!justBuilt) {

            //Attack on sight
            for (var i = 0; i < visRobots.length; i++) {
              if (visRobots[i].team != this.me.team) {
                var dX = visRobots[i].x - this.me.x;
                var dY = visRobots[i].y - this.me.y;
                return this.attack(dX, dY);
              }
            }


            const location = [this.me.x, this.me.y];
            const passMap = this.overlapPassableMaps(this.map, this.getVisibleRobotMap());
            //this.log(passMap);
            path = getPath(location, destination, passMap);

            var choice = [0, 0];
            for (var i = 0; i < 1; i++) {
              const pathStep = path.shift();
              if (path[0] != null) {
                const nextStep = path[0];
                const nextStepMove = pathStep.getMovement(nextStep);
                choice[0] += nextStepMove[0];
                choice[1] += nextStepMove[1];
              }
            }

            return this.move(...choice);
          }


          if (justBuilt) {
            justBuilt = 2;
          }

        }


    }

    overlapPassableMaps(passable, robot) {
      var newMap = [];
      for (var x = 0; x < passable.length; x++) {
        for (var y = 0; y < passable[x].length; y++) {
            newMap[x] = passable[x].slice();
        }
      }

      for (var x = 0; x < robot.length; x++) {
        for (var y = 0; y < robot[x].length; y++) {
            if (newMap[y][x] && robot[y][x] > 0) newMap[y][x] = false;
        }
      }

      return newMap;

    }

    findNearestPath(resourceMap) {

      const passMap = this.overlapPassableMaps(this.map, this.getVisibleRobotMap());
      const location = [this.me.x, this.me.y];
      var paths = [];

      for (var x = 0; x < resourceMap.length; x++) {
        for (var y = 0; y < resourceMap[x].length; y++) {
          if (resourceMap[y][x]) {
            const d = [x, y];
            const path = getPath(location, d, passMap);
            //this.log(path);
            paths.push(path);
          }
        }
      }

      // Always will be at least 1 node for resources
      var min = paths[0];
      for (var i = 0; i < paths.length; i++) {
        if (paths[i].length < min.length) { min = paths[i]; }
      }

      return min;

    }

    buildAround(loc, fullPassMap) {
      for (var x = -1; x < 2; x++) {
        for (var y = -1; y < 2; y++) {
          const dX = x + loc[0];
          const dY = y + loc[1];
          if ((dX >= 0 && dX < fullPassMap.length && dY >= 0 && dY < fullPassMap.length) && fullPassMap[dY][dX]) {
            return [x, y];
          }
        }
      }
      return [0, 0];
    }


}

var robot = new MyRobot();

var robot = new MyRobot();
