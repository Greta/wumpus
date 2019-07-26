class Map {
  constructor(cols, rows, $scope) {
    this.cols = cols
    this.rows = rows
    this.$scope = $scope
    this.map = []
    this.lastDir = ''
    this.dirs = {
      north: [0, -1],
      south: [0, 1],
      east: [1, 0],
      west: [-1, 0]
    }

    // Create the map grid
    this.buildMap(cols, rows)
  }

  buildMap(cols, rows) {
    // Build the map matrix (it's empty for now)
    let map = [],
      emptyRooms = []

    _.map([...Array(rows).keys()], (y) => {
      map[y] = []
      _.map([...Array(cols).keys()], (x) => {
        map[y][x] = []
        emptyRooms.push({x, y})
      })
    })

    // Get all the empty squares
    emptyRooms = _.shuffle(emptyRooms);

    // Choose the squares for points of interest
    const pois = {
      tunnels: emptyRooms.splice(0, _.random(7,10)),
      wumpus: emptyRooms.pop(),
      pitfalls: emptyRooms.splice(0, 2),
      bats: emptyRooms.splice(0, 2),
      player: emptyRooms.pop()
    }

    // Map the POIs to the map matrix
    // Tunnels can be north to west (nw) or north to east (ne)
    _.each(pois.tunnels, room => {
      map[room.y][room.x].push(_.sample(['nw', 'ne']))
    })

    // Bat rooms
    _.each(pois.bats, room => {
      map[room.y][room.x].push('bat')
    })

    // Pitfall rooms
    _.each(pois.pitfalls, room => {
      map[room.y][room.x].push('pitfall')
    })

    // Player starting room
    map[pois.player.y][pois.player.x].push('player', 'explored', 'start')
    this.player = pois.player

    // The Wumpus Room!
    map[pois.wumpus.y][pois.wumpus.x].push('wumpus')

    this.map = map

    // Wumpus (blood) and Pitfall (slime) areas
    this.markAreas(pois)
  }

  markAreas(pois) {
    this.markNearby(pois.wumpus, 'blood')
    _.each(pois.pitfalls, room => {
      this.markNearby(room, 'slime')
    })
  }

  markNearby(coords, type, from) {
    let dirs = _.clone(this.dirs)

    // No need to mark the room we came from
    if (from) {
      delete dirs[this.oppositeDir(from)]
    }

    // Mark each adjacent room
    _.forEach(dirs, (travel, dir) => {
      const room = this.getRoomCoords(coords, dir, true),
        roomAttrs = this.map[room.y][room.x]

      if (!roomAttrs.includes(type)) {
        this.map[room.y][room.x].push(type, type + '-' + _.random(1,10))
      }

      // For the blood (wumpus) we mark two rooms away
      if (!from && type == 'blood') {
        this.markNearby(room, type, dir)
      }
    })
  }

  oppositeDir(dir) {
    if (dir == 'north') return 'south'
    if (dir == 'south') return 'north'
    if (dir == 'west') return 'east'
    return 'west'
  }

  tunnelDir(dir, tunnel) {
    if (tunnel == 'ne') {
      if (dir == 'north') return 'west'
      if (dir == 'south') return 'east'
      if (dir == 'west') return 'north'
      return 'south'
    }
    if (dir == 'north') return 'east'
    if (dir == 'south') return 'west'
    if (dir == 'west') return 'south'
    return 'north'
  }

  getRoomCoords(location, dir, getEndofTunnel) {
    let x = location.x + this.dirs[dir][0],
      y = location.y + this.dirs[dir][1]

    // Wrap the location around if
    // we've reached the edge of the map
    x = x < 0 ? this.cols + x : x % this.cols
    y = y < 0 ? this.rows + y : y % this.rows

    let coords = { x, y }

    if (getEndofTunnel) {
      _.forEach(['ne', 'nw'], tunnel => {
        if (this.map[y][x].includes(tunnel)) {
          coords = this.getRoomCoords({x, y}, this.tunnelDir(dir, tunnel), true)
        }
      })
    }

    return coords
  }

  movePlayer(dir) {
    if (!this.checkMovement(dir)) return

    const newCoords = this.getRoomCoords(this.player, dir),
      room = this.map[newCoords.y][newCoords.x]

    // If aiming, shoot!
    if (_.includes(this.map[this.player.y][this.player.x], 'aiming')) {
      if (this.checkRoom(room, true) == 'wumpus') {
        this.mapComplete('player', 'YOU DID IT.',
          'The wumpus\'s thick hide was pierced by your arrow. ' +
          'The smell of it\'s liberated viscera slowly fills the air.  You smile.'
        )
      } else {
        this.mapComplete('wumpus', 'YOU DIED.',
          'You have loosed your only arrow and you cannot find it in the darkness. ' +
          'Your panicked stumbling summons the wumpus.  It leaves nothing to waste.'
        )
      }
      return
    }

    _.remove(this.map[this.player.y][this.player.x], item => _.includes(item, 'player'))
    this.player = newCoords

    // Exploration
    let explore = ['player', 'explored']
    if (_.includes(room, 'ne')) {
      const tunnel = dir == 'east' || dir == 'north' ? 'south' : 'north'
      explore.push('explored-' + tunnel, 'player-' + tunnel)
    } else if (_.includes(room, 'nw')) {
      const tunnel = dir == 'west' || dir == 'north' ? 'south' : 'north'
      explore.push('explored-' + tunnel, 'player-' + tunnel)
    }

    this.map[newCoords.y][newCoords.x] = _.union(room, explore)
    this.lastDir = dir
    this.checkRoom(room)
  }

  placePlayer(coords) {
    const room = this.map[coords.y][coords.x]

    _.remove(this.map[this.player.y][this.player.x], item => item == 'player')
    this.player = coords
    this.map[coords.y][coords.x] = _.union(room, ['player', 'explored'])
    this.lastDir = ''

    this.checkRoom(room)
  }

  checkMovement(dir) {
    const tunnel = _.intersection(this.map[this.player.y][this.player.x], ['ne', 'nw'])
    if (
      tunnel.length &&
      (dir == this.lastDir || dir == this.oppositeDir(this.tunnelDir(this.lastDir, tunnel.join(''))))
    ) return false
    return true
  }

  checkRoom(room, aiming) {
    const object = _.intersection(room, ['wumpus', 'bat', 'pitfall']).join('')
    if (aiming) {
      return object
    }
    switch(object) {
      case 'bat':
        this.bat()
        break
      case 'wumpus':
        this.mapComplete('wumpus', 'YOU DIED',
          'The fashion of your death can only be matched by ' +
          'the most vivid of childhood nightmares.'
        )
        break
      case 'pitfall':
        this.mapComplete('pitfall', 'YOU DIED.',
          'The last thing you hear is the sickening crunch of your bones, ' +
          'when the floor of the pit rushes up to greet you.'
        )
    }
  }

  getRandomCoords() {
    const coords = {
      x: _.random(0, this.cols - 1),
      y: _.random(0, this.rows - 1)
    }
    if (_.includes(this.map[coords.y][coords.x], 'ne', 'nw')) {
      return this.getRandomCoords()
    }
    return coords
  }

  bat() {
    if (_.random(1,100) > 50) {
      this.disableMovement = true
      this.map[this.player.y][this.player.x].push('caught')
      setTimeout(() => { this.batDrop() }, 1000)
    }
  }

  batDrop() {
    this.disableMovement = false
    _.remove(this.map[this.player.y][this.player.x], item => item == 'bat' || item == 'caught')
    this.placePlayer(this.getRandomCoords())
    this.$scope.$apply()
  }

  takeAim() {
    const x = this.player.x,
          y = this.player.y,
          room = this.map[y][x]

    this.map[y][x] = _.xor(room, ['aiming'])
  }

  mapComplete(result, messageTitle, message) {
    this.$scope.score[result]++
    this.$scope.result = result === 'player' ? 'win' : 'loss'
    this.disableMovement = true
    setTimeout(() => {
      this.$scope.messageTitle = messageTitle
      this.$scope.message = message
      this.$scope.$apply()
    }, 100)
  }
}
