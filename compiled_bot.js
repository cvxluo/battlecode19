'use strict';

var SPECS = {"COMMUNICATION_BITS":16,"CASTLE_TALK_BITS":8,"MAX_ROUNDS":1000,"TRICKLE_FUEL":25,"INITIAL_KARBONITE":100,"INITIAL_FUEL":500,"MINE_FUEL_COST":1,"KARBONITE_YIELD":2,"FUEL_YIELD":10,"MAX_TRADE":1024,"MAX_BOARD_SIZE":64,"MAX_ID":4096,"CASTLE":0,"CHURCH":1,"PILGRIM":2,"CRUSADER":3,"PROPHET":4,"PREACHER":5,"RED":0,"BLUE":1,"CHESS_INITIAL":100,"CHESS_EXTRA":20,"TURN_MAX_TIME":200,"MAX_MEMORY":50000000,"UNITS":[{"CONSTRUCTION_KARBONITE":null,"CONSTRUCTION_FUEL":null,"KARBONITE_CAPACITY":null,"FUEL_CAPACITY":null,"SPEED":0,"FUEL_PER_MOVE":null,"STARTING_HP":200,"VISION_RADIUS":100,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[1,64],"ATTACK_FUEL_COST":10,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":50,"CONSTRUCTION_FUEL":200,"KARBONITE_CAPACITY":null,"FUEL_CAPACITY":null,"SPEED":0,"FUEL_PER_MOVE":null,"STARTING_HP":100,"VISION_RADIUS":100,"ATTACK_DAMAGE":0,"ATTACK_RADIUS":0,"ATTACK_FUEL_COST":0,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":10,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":1,"STARTING_HP":10,"VISION_RADIUS":100,"ATTACK_DAMAGE":null,"ATTACK_RADIUS":null,"ATTACK_FUEL_COST":null,"DAMAGE_SPREAD":null},{"CONSTRUCTION_KARBONITE":15,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":9,"FUEL_PER_MOVE":1,"STARTING_HP":40,"VISION_RADIUS":49,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[1,16],"ATTACK_FUEL_COST":10,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":25,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":2,"STARTING_HP":20,"VISION_RADIUS":64,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[16,64],"ATTACK_FUEL_COST":25,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":30,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":3,"STARTING_HP":60,"VISION_RADIUS":16,"ATTACK_DAMAGE":20,"ATTACK_RADIUS":[1,16],"ATTACK_FUEL_COST":15,"DAMAGE_SPREAD":3}]};

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
        
        var fuelNeeded = Math.ceil(Math.sqrt(radius));
        if (this.fuel < fuelNeeded) throw "Not enough fuel to signal given radius.";
        if (!Number.isInteger(value) || value < 0 || value >= Math.pow(2,SPECS.COMMUNICATION_BITS)) throw "Invalid signal, must be int within bit range.";
        if (radius > 2*Math.pow(SPECS.MAX_BOARD_SIZE-1,2)) throw "Signal radius is too big.";

        this._bc_signal = value;
        this._bc_signal_radius = radius;

        this.fuel -= fuelNeeded;
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
        if (this.me.unit === SPECS.CHURCH) throw "Churches cannot attack.";
        if (this.fuel < SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) throw "Not enough fuel to attack.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't attack off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === -1) throw "Cannot attack outside of vision range.";

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
        return ('unit' in robot);
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
            var tile = new Tile(dX, dY, this.distance + 1, this);
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
      pathMap[x] = passMap[x].slice();
  }

  const destX = dest[0];
  const destY = dest[1];

  /*
  if (!passMap[destY][destX]) {
    pathMap[destY][destX] = true;
  }
  */

  var distance = 0;

  var minPQ = new MinPQ();

  var tile = new Tile(loc[0], loc[1], distance, null);
  minPQ.push(tile);
  passMap[loc[1]][loc[0]] = false;

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

function buildAround(loc, fullPassMap) {
  for (var x = -1; x < 2; x++) {
    for (var y = -1; y < 2; y++) {
      const dX = x + loc[0];
      const dY = y + loc[1];
      if ((dX >= 0 && dX < fullPassMap.length && dY >= 0 && dY < fullPassMap.length) && fullPassMap[dY][dX]) {
        return [y, x];
      }
    }
  }
  return [0, 0];
}

function findNearestPath(location, resourceMap, passMap, excludes) {

  var resourceCopy = [];
  for (var x = 0; x < resourceMap.length; x++) {
      resourceCopy[x] = resourceMap[x].slice();
  }

  for (var i = 0; i < excludes.length; i++) {
    const exclude = excludes[i];
    resourceCopy[exclude[1]][exclude[0]] = false;
  }

  /*
  for (var x = 0; x < resourceCopy.length; x++) {
    for (var y = 0; y < resourceCopy[x].length; y++) {
      if (resourceCopy[y][x] && excludes.includes([x, y])) {
        resourceCopy[y][x] = false;
      }
    }
  }
  */

  const loc = [location[0], location[1]];
  var paths = [];

  for (var x = 0; x < resourceCopy.length; x++) {
    for (var y = 0; y < resourceCopy[x].length; y++) {
      if (resourceCopy[y][x]) {
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
    if (paths[i].length <= min.length && paths[i].length != 0) { min = paths[i]; }
  }

  // TODO: Sometimes an empty path is being returned
  return min;

}

function overlapPassableMaps(passable, robot) {
  var newMap = makeMapCopy(passable);

  for (var x = 0; x < robot.length; x++) {
    for (var y = 0; y < robot[x].length; y++) {
        if (newMap[y][x] && robot[y][x] > 0) newMap[y][x] = false;
    }
  }

  return newMap;

}

function overlapResourceMaps(resource1, resource2) {
  var newMap = makeMapCopy(resource1);

  for (var x = 0; x < resource2.length; x++) {
    for (var y = 0; y < resource2[x].length; y++) {
        if (resource2[y][x]) newMap[y][x] = true;
    }
  }

  return newMap;

}

function passableMapsNoResources(passable, robot, resource1, resource2) {
  const passMap = overlapPassableMaps(passable, robot);
  const resources = overlapResourceMaps(resource1, resource2);

  var newMap = makeMapCopy(passMap);

  for (var x = 0; x < resources.length; x++) {
    for (var y = 0; y < resources[x].length; y++) {
        if (resources[y][x]) newMap[y][x] = false;
    }
  }

  return newMap;

}

// Returns false if horizontally symmetric, true if vertically
function getSymmetry(resourceMap) {
  for (var x = 0; x < resourceMap.length; x++) {
    for (var y = 0; y < resourceMap[x].length; y++) {
      if (resourceMap[y][x]) {

        if (resourceMap[(resourceMap.length - y - 1)][x]) {
          return true;
        }
        else {
          return false;
        }

      }
    }
  }
}

function countResources(resourceMap) {
  var count = 0;
  for (var x = 0; x < resourceMap.length; x++) {
    for (var y = 0; y < resourceMap[x].length; y++) {
      if (resourceMap[y][x]) {
        count++;
      }
    }
  }
  return count;
}

function makeMapCopy(toCopy) {

  var newMap = [];
  for (var x = 0; x < toCopy.length; x++) {
      newMap.push(toCopy[x].slice());
  }

  return newMap;
}

// bc19run -b javascript -r javascript --replay "replay.bc19" --seed 1
// --chi 1000

const CHURCH_DIST = 6;

const MODE_LISTEN = 1;
const MODE_TOMINE = 2;
const MODE_MINING = 3;
const MODE_TOHOME = 4;

const MODE_BUILDCHURCH = 5;
const MODE_FINDINGCHURCHLOC = 6;

const MODE_LATTICE = 7;

const MODE_DEFEND = 8;

var step = -1;

var path = [];
var destination = [];

var home = [];

var mode = MODE_LISTEN;

// Only to be used by castles making lattices
var radius = 1;
var lattice = [];

var resourcesOccupied = [];
var pilgrims = [];

// Give a list of resources a castle or church should just immediately pilgrim
const CLOSE_RESOURCE = 4;
var closeResources = [];

var shortPreachersBuilt = 0;
const SHORT_PREACHERS = 4;


// Castles and churches modify this when they build an unit, units modify right after they are created
var justBuiltUnit = false;


class MyRobot extends BCAbstractRobot {
    turn() {
        step++;

        if (this.me.unit === SPECS.CASTLE) {

          const visRobots = this.getVisibleRobots();

          /*
          for (var i = 0; i < visRobots.length; i++) {
            if (visRobots[i].castle_talk > PANIC_MODE) {

              if (shortPreachersBuilt < SHORT_PREACHERS) {

                shortPreachersBuilt++;
                const passMap = overlapPassableMaps(this.map, this.getVisibleRobotMap());
                const buildCoords = buildAround([this.me.x, this.me.y], passMap);

                justBuiltUnit = SPECS.PREACHER;
                this.log("Building Preacher");

                return this.buildUnit(SPECS.PREACHER, buildCoords[0], buildCoords[1]);
                /*
                for (var j = 0; j < pilgrims.length; j++) {
                  if (visRobots[i].id == pilgrims[j][0]) {

                  }
                }
                */
                //enemyResources.push()
                /*

              }
              else {
                if (shortPreachersBuilt > 0) {
                  shortPreachersBuilt--;
                }
              }
            }
          }
          */


          for (var i = 0; i < visRobots.length; i++) {
            if (visRobots[i].team != this.me.team && visRobots[i].x != undefined) {
              var dX = visRobots[i].x - this.me.x;
              var dY = visRobots[i].y - this.me.y;

              if (Math.abs(dX) + Math.abs(dY) > 8 && step > 60) {
                if (shortPreachersBuilt < SHORT_PREACHERS) {

                  const passMap = overlapPassableMaps(this.map, this.getVisibleRobotMap());
                  const buildCoords = buildAround([this.me.x, this.me.y], passMap);

                  shortPreachersBuilt++;
                  justBuiltUnit = SPECS.PREACHER;
                  this.log("Building Preacher");

                  return this.buildUnit(SPECS.PREACHER, buildCoords[0], buildCoords[1]);

                }
                else {
                  if (shortPreachersBuilt > 0) {
                    shortPreachersBuilt--;
                  }
                  justBuiltUnit = false;
                }
              }
              else {
                return this.attack(dX, dY);
              }
            }
          }

          if (justBuiltUnit) {
            switch (justBuiltUnit) {
              case SPECS.PILGRIM :

                const resources = this.karbonite_map;
                var signalValue = "";

                if (closeResources.length != 0) {
                  const close = closeResources.shift();

                  if (close[0] < 10) signalValue += "0" + close[0].toString();
                  else signalValue += close[0].toString();
                  if (close[1] < 10) signalValue += "0" + close[1].toString();
                  else signalValue += close[1].toString();
                  signalValue = parseInt(signalValue);

                  justBuiltUnit = false;

                  // TODO: Push many coords next to the karbonite node, to ensure 2 bots don't try to build churches at the same node
                  resourcesOccupied.push(close);

                  for (var i = 0; i < visRobots.length; i++) {
                    if (visRobots[i].team == this.me.team && visRobots[i].unit == SPECS.PILGRIM) {

                      var isNotIncluded = true;
                      for (var j = 0; j < pilgrims.length; j++) {
                        if (visRobots[i].id == pilgrims[j][0]) {
                          isNotIncluded = false;
                        }
                      }

                      if (isNotIncluded) {
                        pilgrims.push([visRobots[i].id, signalValue]);
                      }
                    }
                  }

                  return this.signal(signalValue, 3);
                }

                var nearPath = findNearestPath([this.me.x, this.me.y], resources, overlapPassableMaps(this.map, this.getVisibleRobotMap()), resourcesOccupied);

                if (nearPath.length > CHURCH_DIST) {
                  // Signal to pilgrim it should make a church
                  signalValue += "1";
                }

                const nearTile = nearPath.pop();


                if (nearTile.x < 10) signalValue += "0" + nearTile.x.toString();
                else signalValue += nearTile.x.toString();
                if (nearTile.y < 10) signalValue += "0" + nearTile.y.toString();
                else signalValue += nearTile.y.toString();
                signalValue = parseInt(signalValue);

                // TODO: Push many coords next to the karbonite node, to ensure 2 bots don't try to build churches at the same node
                resourcesOccupied.push([nearTile.x, nearTile.y]);

                // Keeping track of where pilgrims are assigned
                for (var i = 0; i < visRobots.length; i++) {
                  if (visRobots[i].team == this.me.team && visRobots[i].unit == SPECS.PILGRIM) {

                    var isNotIncluded = true;
                    for (var j = 0; j < pilgrims.length; j++) {
                      if (visRobots[i].id == pilgrims[j][0]) {
                        isNotIncluded = false;
                      }
                    }

                    if (isNotIncluded) {
                      pilgrims.push([visRobots[i].id, signalValue]);
                    }
                  }
                }

                justBuiltUnit = false;

                this.signal(signalValue, 3);
                break;

              case SPECS.PROPHET :
                var tileMap = passableMapsNoResources(this.map, this.getVisibleRobotMap(), this.karbonite_map, this.fuel_map);
                var signalValue = null;

                for (var i = 0; i < visRobots.length; i++) {
                  if (visRobots[i].unit == SPECS.PROPHET && visRobots[i].mode == MODE_LISTEN) {
                    tileMap[visRobots[i].y][visRobots[i].x] = true;
                  }
                }

                for (var i = 0; i < lattice.length; i++) {
                  const lat = lattice[i];
                  tileMap[lat[1]][lat[0]] = false;
                }
                /*
                4 situations
                1. Red, horz - lattice to the right
                2. Red, vert - lattice down
                3. Blue, horz - lattice to the left
                4. Blue, vert - lattice up

                For now, lattice hugs castle
                */
                while (!signalValue) {
                  for (var r = this.me.x - radius; r <= this.me.x + radius; r += 2) {
                    for (var s = this.me.y - radius; s <= this.me.y + radius; s += 2) {
                      if (r >= 0 && r < tileMap.length && s >= 0 && s < tileMap.length) {
                        if (tileMap[s][r]) {
                          signalValue = r.toString();
                          if (s < 10) signalValue += "0" + s.toString();
                          else signalValue += s.toString();
                          signalValue = parseInt(signalValue);
                          lattice.push([r, s]);

                          justBuiltUnit = false;

                          return this.signal(signalValue, 3);
                        }
                      }
                    }
                  }

                  if (!signalValue) { radius++; }

                }

            }

            justBuiltUnit = false;

          }

          else {

            if (step == 0) {
              const karboniteResources = this.karbonite_map;
              for (var x = -CLOSE_RESOURCE; x <= CLOSE_RESOURCE; x++) {
                for (var y = -CLOSE_RESOURCE; y <= CLOSE_RESOURCE; y++) {
                  if (karboniteResources[y + this.me.y][x + this.me.x]) {
                    closeResources.push([x + this.me.x, y + this.me.y]);
                  }
                }
              }

              const fuelResources = this.fuel_map;
              for (var x = -CLOSE_RESOURCE; x <= CLOSE_RESOURCE; x++) {
                for (var y = -CLOSE_RESOURCE; y <= CLOSE_RESOURCE; y++) {
                  if (fuelResources[y + this.me.y][x + this.me.x]) {
                    closeResources.push([x + this.me.x, y + this.me.y]);
                  }
                }
              }

            }
            if ((step == 1) || ((countResources(this.karbonite_map) > pilgrims.length && step % 40 == 0 && step <= 300))) {
              this.log("Building Pilgrim");
              const passMap = overlapPassableMaps(this.map, this.getVisibleRobotMap());
              const buildCoords = buildAround([this.me.x, this.me.y], passMap);

              justBuiltUnit = SPECS.PILGRIM;

              return this.buildUnit(SPECS.PILGRIM, buildCoords[0], buildCoords[1]);
            }

            else if ((step > 15) && this.karbonite >= 75 && this.fuel >= 125 && this.karbonite >= lattice.length * 15) {
              this.log("Building Prophet");
              const passMap = overlapPassableMaps(this.map, this.getVisibleRobotMap());
              const buildCoords = buildAround([this.me.x, this.me.y], passMap);

              justBuiltUnit = SPECS.PROPHET;
              return this.buildUnit(SPECS.PROPHET, buildCoords[0], buildCoords[1]);
            }

          }
        }

        if (this.me.unit === SPECS.CHURCH) {

          const visRobots = this.getVisibleRobots();

          /*
          for (var i = 0; i < visRobots.length; i++) {
            if (visRobots[i].castle_talk > PANIC_MODE) {

              if (shortPreachersBuilt < SHORT_PREACHERS) {

                shortPreachersBuilt++;
                const passMap = overlapPassableMaps(this.map, this.getVisibleRobotMap());
                const buildCoords = buildAround([this.me.x, this.me.y], passMap);

                justBuiltUnit = SPECS.PREACHER;
                this.log("Building Preacher");

                return this.buildUnit(SPECS.PREACHER, buildCoords[0], buildCoords[1]);
                /*
                for (var j = 0; j < pilgrims.length; j++) {
                  if (visRobots[i].id == pilgrims[j][0]) {

                  }
                }
                */
                //enemyResources.push()
                /*
              }

              else {
                if (shortPreachersBuilt > 0) {
                  shortPreachersBuilt--;
                }
              }
            }
          }
          */

          for (var i = 0; i < visRobots.length; i++) {
            if (visRobots[i].team != this.me.team && visRobots[i].x != undefined) {
              var dX = visRobots[i].x - this.me.x;
              var dY = visRobots[i].y - this.me.y;

              if (Math.abs(dX) + Math.abs(dY) > 8) {
                if (shortPreachersBuilt < SHORT_PREACHERS) {

                  const passMap = overlapPassableMaps(this.map, this.getVisibleRobotMap());
                  const buildCoords = buildAround([this.me.x, this.me.y], passMap);

                  shortPreachersBuilt++;
                  justBuiltUnit = SPECS.PREACHER;
                  this.log("Building Preacher");

                  return this.buildUnit(SPECS.PREACHER, buildCoords[0], buildCoords[1]);

                }
                else {
                  if (shortPreachersBuilt > 0) {
                    shortPreachersBuilt--;
                  }
                  justBuiltUnit = false;
                }
              }
            }
          }



          if (justBuiltUnit) {
            switch (justBuiltUnit) {
              case SPECS.PILGRIM :

                const resources = this.karbonite_map;
                var signalValue = "";

                if (closeResources.length != 0) {
                  const close = closeResources.shift();

                  if (close[0] < 10) signalValue += "0" + close[0].toString();
                  else signalValue += close[0].toString();
                  if (close[1] < 10) signalValue += "0" + close[1].toString();
                  else signalValue += close[1].toString();
                  signalValue = parseInt(signalValue);

                  justBuiltUnit = false;

                  // TODO: Push many coords next to the karbonite node, to ensure 2 bots don't try to build churches at the same node
                  resourcesOccupied.push(close);

                  for (var i = 0; i < visRobots.length; i++) {
                    if (visRobots[i].team == this.me.team && visRobots[i].unit == SPECS.PILGRIM) {

                      var isNotIncluded = true;
                      for (var j = 0; j < pilgrims.length; j++) {
                        if (visRobots[i].id == pilgrims[j][0]) {
                          isNotIncluded = false;
                        }
                      }

                      if (isNotIncluded) {
                        pilgrims.push([visRobots[i].id, signalValue]);
                      }
                    }
                  }

                  return this.signal(signalValue, 3);
                }

                var nearPath = findNearestPath([this.me.x, this.me.y], resources, overlapPassableMaps(this.map, this.getVisibleRobotMap()), resourcesOccupied);

                if (nearPath.length > CHURCH_DIST) {
                  // Signal to pilgrim it should make a church
                  signalValue += "1";
                }

                const nearTile = nearPath.pop();


                if (nearTile.x < 10) signalValue += "0" + nearTile.x.toString();
                else signalValue += nearTile.x.toString();
                if (nearTile.y < 10) signalValue += "0" + nearTile.y.toString();
                else signalValue += nearTile.y.toString();
                signalValue = parseInt(signalValue);

                // TODO: Push many coords next to the karbonite node, to ensure 2 bots don't try to build churches at the same node
                resourcesOccupied.push([nearTile.x, nearTile.y]);

                // Keeping track of where pilgrims are assigned
                for (var i = 0; i < visRobots.length; i++) {
                  if (visRobots[i].team == this.me.team && visRobots[i].unit == SPECS.PILGRIM) {

                    var isNotIncluded = true;
                    for (var j = 0; j < pilgrims.length; j++) {
                      if (visRobots[i].id == pilgrims[j][0]) {
                        isNotIncluded = false;
                      }
                    }

                    if (isNotIncluded) {
                      pilgrims.push([visRobots[i].id, signalValue]);
                    }
                  }
                }

                justBuiltUnit = false;

                this.signal(signalValue, 3);
                break;

              case SPECS.PROPHET :
                var tileMap = passableMapsNoResources(this.map, this.getVisibleRobotMap(), this.karbonite_map, this.fuel_map);
                var signalValue = null;

                for (var i = 0; i < visRobots.length; i++) {
                  if (visRobots[i].unit == SPECS.PROPHET && visRobots[i].mode == MODE_LISTEN) {
                    tileMap[visRobots[i].y][visRobots[i].x] = true;
                  }
                }

                for (var i = 0; i < lattice.length; i++) {
                  const lat = lattice[i];
                  tileMap[lat[1]][lat[0]] = false;
                }
                /*
                4 situations
                1. Red, horz - lattice to the right
                2. Red, vert - lattice down
                3. Blue, horz - lattice to the left
                4. Blue, vert - lattice up

                For now, lattice hugs castle
                */
                while (!signalValue) {
                  for (var r = this.me.x - radius; r <= this.me.x + radius; r += 2) {
                    for (var s = this.me.y - radius; s <= this.me.y + radius; s += 2) {
                      if (r >= 0 && r < tileMap.length && s >= 0 && s < tileMap.length) {
                        if (tileMap[s][r]) {
                          signalValue = r.toString();
                          if (s < 10) signalValue += "0" + s.toString();
                          else signalValue += s.toString();
                          signalValue = parseInt(signalValue);
                          lattice.push([r, s]);

                          justBuiltUnit = false;

                          return this.signal(signalValue, 3);
                        }
                      }
                    }
                  }

                  if (!signalValue) { radius++; }

                }

            }

            justBuiltUnit = false;

          }

          else {

            if (step == 0) {
              const karboniteResources = this.karbonite_map;
              for (var x = -CLOSE_RESOURCE; x <= CLOSE_RESOURCE; x++) {
                for (var y = -CLOSE_RESOURCE; y <= CLOSE_RESOURCE; y++) {
                  if (karboniteResources[y + this.me.y][x + this.me.x]) {
                    closeResources.push([x + this.me.x, y + this.me.y]);
                  }
                }
              }

              const fuelResources = this.fuel_map;
              for (var x = -CLOSE_RESOURCE; x <= CLOSE_RESOURCE; x++) {
                for (var y = -CLOSE_RESOURCE; y <= CLOSE_RESOURCE; y++) {
                  if (fuelResources[y + this.me.y][x + this.me.x]) {
                    closeResources.push([x + this.me.x, y + this.me.y]);
                  }
                }
              }

            }
            if ((step == 1) || ((countResources(this.karbonite_map) > pilgrims.length && step % 40 == 0 && step <= 220))) {
              this.log("Building Pilgrim");
              const passMap = overlapPassableMaps(this.map, this.getVisibleRobotMap());
              const buildCoords = buildAround([this.me.x, this.me.y], passMap);

              justBuiltUnit = SPECS.PILGRIM;

              return this.buildUnit(SPECS.PILGRIM, buildCoords[0], buildCoords[1]);
            }

            else if (this.karbonite >= 75 && this.fuel >= 125 && this.karbonite >= lattice.length * 15) {
              this.log("Building Prophet");
              const passMap = overlapPassableMaps(this.map, this.getVisibleRobotMap());
              const buildCoords = buildAround([this.me.x, this.me.y], passMap);

              justBuiltUnit = SPECS.PROPHET;
              return this.buildUnit(SPECS.PROPHET, buildCoords[0], buildCoords[1]);
            }

          }
        }

        else if (this.me.unit === SPECS.PILGRIM) {

          const visRobots = this.getVisibleRobots();

          if (mode == MODE_LISTEN) {

            home = [this.me.x, this.me.y];

            var signal = null;
            for (var i = 0; i < visRobots.length; i++) {
              if ((visRobots[i].unit == SPECS.CASTLE || visRobots[i].unit == SPECS.CHURCH) && this.isRadioing(visRobots[i])) {
                signal = visRobots[i].signal;
              }
            }

            if (signal) {
              var x = Math.floor(signal / 100);
              if (x >= 100) {
                x %= 100;
                mode = MODE_BUILDCHURCH;
              }
              else {
                mode = MODE_TOMINE;
              }

              const y = signal % 100;
              destination = [x, y];

            }

          }

          else if (mode == MODE_TOMINE && this.me.x == destination[0] && this.me.y == destination[1]) {
            mode = MODE_MINING;
          }

          else if (mode == MODE_BUILDCHURCH && this.me.x == destination[0] && this.me.y == destination[1]) {
            mode = MODE_FINDINGCHURCHLOC;
          }

          else if (mode == MODE_FINDINGCHURCHLOC) {

            if (this.karbonite >= 50 && this.fuel >= 200) {
              const resources = overlapResourceMaps(this.karbonite_map, this.fuel_map);
              const passMap = overlapPassableMaps(this.map, this.getVisibleRobots());
              var possibleTiles = [];
              for (var x = -1; x < 2; x++) {
                for (var y = -1; y < 2; y++) {
                  const dX = this.me.x + x;
                  const dY = this.me.y + y;

                  if (passMap[dY][dX] && !resources[dY][dX]) {

                    var numResources = 0;
                    for (var a = -1; a < 2; a++) {
                      for (var b = -1; b < 2; b++) {
                        const ddX = dX + a;
                        const ddY = dY + b;
                        if (resources[ddY][ddX]) {
                          numResources++;
                        }
                      }
                    }

                    possibleTiles.push([dX, dY, numResources]);

                  }

                }
              }

              var min = possibleTiles[0];
              for (var i = 0; i < possibleTiles.length; i++) {
                if (possibleTiles[i][2] > min[2]) min = possibleTiles[i];
              }

              const dX = min[0] - this.me.x;
              const dY = min[1] - this.me.y;

              home = [this.me.x, this.me.y];

              mode = MODE_MINING;

              return this.buildUnit(SPECS.CHURCH, dX, dY);
            }
          }

          else if (mode == MODE_MINING) {
            if (this.me.karbonite == 20 || this.me.fuel == 100) {
              mode = MODE_TOHOME;
              const k = home.slice();
              home = destination;
              destination = k;
             }
            else {
              return this.mine();
            }
          }

          // Note that this is not else if- hacky solution, ensuring that if the pilgrim is next to the castle, it doesn't bother moving back to home
          if (mode == MODE_TOHOME) {
            const loc = [this.me.x, this.me.y];

            for (var i = 0; i < visRobots.length; i++) {
              if (visRobots[i].unit == SPECS.CASTLE || visRobots[i].unit == SPECS.CHURCH) {
                var dX = visRobots[i].x - this.me.x;
                var dY = visRobots[i].y - this.me.y;
                if ((Math.abs(dX) == 0 || Math.abs(dX) == 1) && (Math.abs(dY) == 0 || Math.abs(dY) == 1)) {
                  mode = MODE_TOMINE;
                  const k = home.slice();
                  home = destination;
                  destination = k;
                  return this.give(dX, dY, this.me.karbonite, this.me.fuel);
                }
              }
            }
          }

          const location = [this.me.x, this.me.y];
          var passMap = overlapPassableMaps(this.map, this.getVisibleRobotMap());
          if (destination) {
            path = getPath(location, destination, passMap);

            if (path == null) {
              const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
              const choice = choices[Math.floor(Math.random()*choices.length)];
              return this.move(...choice);
            }


            // To be modified - combine multiple movements that don't exceed r^2, which, for pilgrims, is 4
            var choice = [0, 0];
            var pathStep = path.shift();
            if (path[0] != null) {
              const nextStep = path[0];
              const nextStepMove = pathStep.getMovement(nextStep);
              choice[0] += nextStepMove[0];
              choice[1] += nextStepMove[1];
            }

            if (path[0] != null && path[1] != null) {
              const maybeStep = path[0].getMovement(path[1]);
              if (Math.abs(choice[0] + maybeStep[0]) + Math.abs(choice[1] + maybeStep[1]) <= 2) {
                pathStep = path.shift();
                const nextStep = path[0];
                const nextStepMove = pathStep.getMovement(nextStep);
                choice[0] += nextStepMove[0];
                choice[1] += nextStepMove[1];

              }
            }

            //if (!passMap[this.me.y + choice[1]][this.me.x + choice[0]]) {          }

            if (choice[0] != 0 || choice[1] != 0) { return this.move(...choice); }

          }

        }

        else if (this.me.unit === SPECS.PROPHET) {

          const visRobots = this.getVisibleRobots();

          if (mode == MODE_LISTEN) {

            var signal = null;
            for (var i = 0; i < visRobots.length; i++) {
              if ((visRobots[i].unit == SPECS.CASTLE || visRobots[i].unit == SPECS.CHURCH) && this.isRadioing(visRobots[i])) {
                signal = visRobots[i].signal;
              }
            }

            const x = Math.floor(signal / 100);
            const y = signal % 100;
            destination = [x, y];

            if (signal) { mode = MODE_LATTICE; }

          }

          else if (mode != MODE_LISTEN) {

            //Attack on sight
            for (var i = 0; i < visRobots.length; i++) {
              if (visRobots[i].team != this.me.team) {
                var dX = visRobots[i].x - this.me.x;
                var dY = visRobots[i].y - this.me.y;
                return this.attack(dX, dY);
              }
            }


            const location = [this.me.x, this.me.y];
            const passMap = overlapPassableMaps(this.map, this.getVisibleRobotMap());
            //this.log(passMap);
            if (destination) {
              path = getPath(location, destination, passMap);

              var choice = [0, 0];

              var pathStep = path.shift();
              if (path[0] != null) {
                const nextStep = path[0];
                const nextStepMove = pathStep.getMovement(nextStep);
                choice[0] += nextStepMove[0];
                choice[1] += nextStepMove[1];
              }

              if (path[0] != null && path[1] != null) {
                const maybeStep = path[0].getMovement(path[1]);
                if (Math.abs(choice[0] + maybeStep[0]) + Math.abs(choice[1] + maybeStep[1]) <= 2) {
                  pathStep = path.shift();
                  const nextStep = path[0];
                  const nextStepMove = pathStep.getMovement(nextStep);
                  choice[0] += nextStepMove[0];
                  choice[1] += nextStepMove[1];

                }
              }

              if (choice[0] != 0 || choice[1] != 0) { return this.move(...choice); }
            }


          }
        }



        else if (this.me.unit === SPECS.PREACHER) {

          const visRobots = this.getVisibleRobots();


          if (mode == MODE_LISTEN) {
            home = [this.me.x, this.me.y];
            mode = MODE_DEFEND;
          }

          /*
          if (mode == MODE_LISTEN) {

            var signal = null;
            for (var i = 0; i < visRobots.length; i++) {
              if ((visRobots[i].unit == SPECS.CASTLE || visRobots[i].unit == SPECS.CHURCH) && this.isRadioing(visRobots[i])) {
                signal = visRobots[i].signal;
              }
            }

            const x = Math.floor(signal / 100);
            const y = signal % 100;
            destination = [x, y];

            if (signal) { mode = MODE_LATTICE; }

          }
          */

          if (mode == MODE_DEFEND) {

            //Attack on sight
            for (var i = 0; i < visRobots.length; i++) {
              if (visRobots[i].team != this.me.team) {
                var dX = visRobots[i].x - this.me.x;
                var dY = visRobots[i].y - this.me.y;
                return this.attack(dX, dY);
              }
            }

            destination = this.getEnemyCastles(home);

            const location = [this.me.x, this.me.y];
            const passMap = overlapPassableMaps(this.map, this.getVisibleRobotMap());
            //this.log(passMap);
            if (destination) {
              path = getPath(location, destination, passMap);

              var choice = [0, 0];

              var pathStep = path.shift();
              if (path[0] != null) {
                const nextStep = path[0];
                const nextStepMove = pathStep.getMovement(nextStep);
                choice[0] += nextStepMove[0];
                choice[1] += nextStepMove[1];
              }

              if (path[0] != null && path[1] != null) {
                const maybeStep = path[0].getMovement(path[1]);
                if (Math.abs(choice[0] + maybeStep[0]) + Math.abs(choice[1] + maybeStep[1]) <= 2) {
                  pathStep = path.shift();
                  const nextStep = path[0];
                  const nextStepMove = pathStep.getMovement(nextStep);
                  choice[0] += nextStepMove[0];
                  choice[1] += nextStepMove[1];

                }
              }


              if (choice[0] != 0 || choice[1] != 0) { return this.move(...choice); }
            }
          }

        }

    }


    getEnemyCastles(loc) {
      const symmetry = getSymmetry(this.karbonite_map);
      // False if horz

      const x = loc[0];
      const y = loc[1];

      if (symmetry) {
        return [x, this.map.length - y];
      }
      else return [this.map.length - x, y];

    }

}

var robot = new MyRobot();

var robot = new MyRobot();
