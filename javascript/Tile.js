
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

export default Tile;
