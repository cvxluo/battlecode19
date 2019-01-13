import {BCAbstractRobot, SPECS} from 'battlecode';

import Tile from './Tile.js'
import MinPQ from './MinPQ.js'
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
            const passMap = this.overlapPassableMaps(this.map, this.getVisibleRobotMap());
            const buildCoords = this.buildAround([this.me.x, this.me.y], passMap);

            return this.buildUnit(SPECS.PILGRIM, buildCoords[0], buildCoords[1]);
          }
          /*
          if (this.karbonite > 10 && this.fuel > 50) {
            this.log("Building Pilgrim");
            return this.buildUnit(SPECS.PILGRIM, 1, 1);
          }
          */
        }

        else if (this.me.unit === SPECS.PILGRIM) {
          if (!hasPath) {
            const location = [this.me.x, this.me.y];
            const destination = [0, 37];
            const passMap = this.overlapPassableMaps(this.map, this.getVisibleRobotMap());
            //this.log(passMap);
            path = getPath(location, destination, passMap);
            hasPath = true;
          }

          // To be modified - combine multiple movements that don't exceed r^2, which, for pilgrims, is 4
          var choice = [0, 0];
          for (var i = 0; i < 1; i++) {
            const pathStep = path.shift();
            const nextStep = path[0];
            const nextStepMove = pathStep.getMovement(nextStep);
            choice[0] += nextStepMove[0];
            choice[1] += nextStepMove[1];

          }

          if (path.length == 0) hasPath = false;
          this.log(choice);
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
            if (newMap[y][x] && robot[y][x] > 0) newMap[y][x] = false;
        }
      }

      return newMap;

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
