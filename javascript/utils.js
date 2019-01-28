
import getPath from './astarPath.js'


function buildAround(loc, fullPassMap) {
  for (var x = -1; x < 2; x++) {
    for (var y = -1; y < 2; y++) {
      const dX = x + loc[0];
      const dY = y + loc[1];
      if (validCoords(dX, dY, fullPassMap) && fullPassMap[dY][dX]) {
        return [x, y];
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

  var min = [];
  if (paths[0] != null) {
    min = paths[0];
  }

  for (var i = 0; i < paths.length; i++) {
    if (paths[i] != null && paths[i].length <= min.length && paths[i].length != 0) { min = paths[i]; }
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

function validCoords(x, y, map) {
  if (x >= 0 && x < map.length) {
    if (y >= 0 && y < map.length) {
      return true;
    }
  }
  return false;
}

export { buildAround,
  findNearestPath,
  overlapPassableMaps,
  overlapResourceMaps,
  passableMapsNoResources,
  getSymmetry,
  countResources,
  makeMapCopy,
  validCoords,
}
