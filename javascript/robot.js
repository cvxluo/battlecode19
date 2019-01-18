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


const MODE_LISTEN = 1;
const MODE_TOMINE = 2;
const MODE_MINING = 3;
const MODE_TOHOME = 4;

var step = -1;

var path = [];
var destination = [];

var home = [];

var mode = MODE_LISTEN;

// Only to be used by castles making lattices
var radius = 1;
var lattice = [];

var resourcesOccupied = [];

// Castles and churches modify this when they build an unit, units modify right after they are created
var justBuiltUnit = false;


class MyRobot extends BCAbstractRobot {
    turn() {
        step++;

        if (this.me.unit === SPECS.CASTLE) {

          const visRobots = this.getVisibleRobots();

          for (var i = 0; i < visRobots.length; i++) {
            if (visRobots[i].team != this.me.team) {
              var dX = visRobots[i].x - this.me.x;
              var dY = visRobots[i].y - this.me.y;
              return this.attack(dX, dY);
            }
          }

          if (justBuiltUnit) {
            switch (justBuiltUnit) {
              case SPECS.PILGRIM :
                const resources = this.karbonite_map;
                var nearPath = findNearestPath([this.me.x, this.me.y], resources, overlapPassableMaps(this.map, this.getVisibleRobotMap()), resourcesOccupied);
                const nearTile = nearPath.pop();
                var signalValue = nearTile.x.toString();
                if (nearTile.y < 10) signalValue += "0" + nearTile.y.toString();
                else signalValue += nearTile.y.toString();
                signalValue = parseInt(signalValue);

                resourcesOccupied.push([nearTile.x, nearTile.y]);

                this.signal(signalValue, 3);
                break;

              case SPECS.PROPHET :
                const tileMap = passableMapsNoResources(this.map, this.getVisibleRobotMap(), this.karbonite_map, this.fuel_map);
                var signalValue = null;
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
                      if (tileMap[s][r] && !lattice.includes([r,s])) {
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

            }

            justBuiltUnit = false;

          }

          else {
            if (step == 0 || step == 20) {
              this.log("Building Pilgrim");
              const passMap = overlapPassableMaps(this.map, this.getVisibleRobotMap());
              const buildCoords = buildAround([this.me.x, this.me.y], passMap);

              justBuiltUnit = SPECS.PILGRIM;
              return this.buildUnit(SPECS.PILGRIM, buildCoords[0], buildCoords[1]);
            }

            else if (this.karbonite >= 25 && this.fuel >= 50){
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
              if (visRobots[i].unit == SPECS.CASTLE && this.isRadioing(visRobots[i])) {
                signal = visRobots[i].signal;
              }
            }

            if (signal) {
              const x = Math.floor(signal / 100);
              const y = signal % 100;
              destination = [x, y];

              this.log("DESTINATION " + destination);

              mode = MODE_TOMINE;
            }

          }

          else if (mode == MODE_TOMINE && this.me.x == destination[0] && this.me.y == destination[1]) {
            mode = MODE_MINING;
          }

          else if (mode == MODE_MINING) {
            if (this.me.karbonite == 20) {
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
                  return this.give(dX, dY, this.me.karbonite, 0);
                }
              }
            }
          }

          const location = [this.me.x, this.me.y];
          const passMap = overlapPassableMaps(this.map, this.getVisibleRobotMap());
          path = getPath(location, destination, passMap);


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

          if (choice[0] != 0 || choice[1] != 0) { return this.move(...choice); }

        }

        else if (this.me.unit === SPECS.PROPHET) {

          const visRobots = this.getVisibleRobots();

          if (step == 1) {

            var signal = null;
            for (var i = 0; i < visRobots.length; i++) {
              if (visRobots[i].unit == SPECS.CASTLE && this.isRadioing(visRobots[i])) {
                signal = visRobots[i].signal;
              }
            }

            const x = Math.floor(signal / 100);
            const y = signal % 100;
            destination = [x, y];

          }

          else if (step != 1) {

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


            return this.move(...choice);
          }

        }

    }

    getEnemyCastles() {

    }

}

var robot = new MyRobot();
