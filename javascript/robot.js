import {BCAbstractRobot, SPECS} from 'battlecode';

import Tile from './Tile.js'
import MinPQ from './MinPQ.js'
import getPath from './astarPath.js'

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
