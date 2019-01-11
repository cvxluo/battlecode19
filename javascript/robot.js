import {BCAbstractRobot, SPECS} from 'battlecode';

import getPath from './astarPath.js'

// bc19run -b javascript -r javascript --replay "replay.bc19"
// --chi 1000


var built = false;
var step = -1;

var hasPath = false;
var path = [];

class MyRobot extends BCAbstractRobot {
    turn() {
        step++;

        if (this.me.unit === SPECS.CASTLE) {
          /*
          this.log("Karbonite: " + this.karbonite);
          this.log("Fuel: " + this.fuel);
          */

          if (step % 100 == 0) {
            this.log("Building Pilgrim");
            return this.buildUnit(SPECS.PILGRIM, 1, 1);
          }
          /*
          if (this.karbonite > 10 && this.fuel > 50) {
            this.log("Building Pilgrim");
            return this.buildUnit(SPECS.PILGRIM, 1, 1);
          }
          /*
            if (step % 10 === 0) {
                this.log("Building a crusader at " + (this.me.x+1) + ", " + (this.me.y+1));
                return this.buildUnit(SPECS.CRUSADER, 1, 1);
            } else {
                return // this.log("Castle health: " + this.me.health);
            }
            */
        }

        else if (this.me.unit === SPECS.PILGRIM) {
          if (!hasPath) {
            const location = [this.me.x, this.me.y];
            const destination = [0, 0];
            const passMap = this.overlapPassableMaps(this.map, this.getVisibleRobotMap());
            path = getPath(location, destination, passMap);
            hasPath = true;
          }

          this.log(this.map[3][6]);

          const pathStep = path.shift();
          const nextStep = path[0];

          this.log("PATHSTEP " + pathStep);
          this.log("NEXTSTEP " + nextStep);


          const choice = pathStep.getMovement(nextStep);
          //this.log("PATHLENGTH " + path.length);
          // if (path.length == 0) hasPath = false;
          //this.log(choice);
          return this.move(...choice);
        }

        else if (this.me.unit === SPECS.CRUSADER) {
            // this.log("Crusader health: " + this.me.health);
            const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
            const choice = choices[Math.floor(Math.random()*choices.length)]
            return this.move(...choice);
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
            if (newMap[x][y] && robot[y][x] > 0) newMap[x][y] = false;
        }
      }

      return newMap;

    }

    buildAround(loc, fullPassMap) {
      for (var x = -1; x < 2; x++) {
        for (var y = -1; y < 2; y++) {
          const dX = x + this.x;
          const dY = y + this.y;
          if ((dX >= 0 && dX < fullPassMap.length && dY >= 0 && dY < fullPassMap.length) && fullPassMap[dX][dY]) {
            return [x, y];
          }
        }
      }


    }


}

var robot = new MyRobot();
