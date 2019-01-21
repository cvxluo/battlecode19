import {BCAbstractRobot, SPECS} from 'battlecode';

import getPath from './astarPath.js'

import {
  buildAround,
  findNearestPath,
  overlapPassableMaps,
  overlapResourceMaps,
  passableMapsNoResources,
  getSymmetry,
  countResources,
  makeMapCopy
 } from './utils.js'

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

var enemyResources = [];

var shortPreachersBuilt = 0;
const SHORT_PREACHERS = 4;

const PANIC_MODE = 6;


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
            if (visRobots[i].team != this.me.team && visRobots[i].x != undefined && visRobots.unit != SPECS.PILGRIM) {
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
              const choice = choices[Math.floor(Math.random()*choices.length)]
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
