
import Tile from './Tile.js';
import MinPQ from './MinPQ.js';

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
  pathMap[loc[0]][loc[1]] = false;
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

export default getPath;