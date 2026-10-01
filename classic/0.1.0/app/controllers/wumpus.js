(function() {
  var WumpusController = function($scope) {
    $scope.map = new Map(8,6, $scope)
    $scope.showFullMap = false
    $scope.score = {
      wumpus: 0,
      pitfall: 0,
      player: 0
    }

    $scope.playerActions = event => {
      if ($scope.showFullMap) {
        $scope.showFullMap = false
        return
      }
      if ($scope.map.disableMovement) {
        if (event.code === 'Enter') $scope.restart()
        else if (event.code === 'KeyM') $scope.showFullMap = true
        else return
      }
      switch(event.code) {
        case 'ArrowUp':
        case 'Numpad8':
          $scope.map.movePlayer('north')
          break
        case 'ArrowDown':
        case 'Numpad2':
          $scope.map.movePlayer('south')
          break
        case 'ArrowLeft':
        case 'Numpad4':
          $scope.map.movePlayer('west')
          break
        case 'ArrowRight':
        case 'Numpad6':
          $scope.map.movePlayer('east')
          break
        case 'KeyF':
          $scope.map.takeAim()
      }
    }

    $scope.getRoomClasses = (room, fullMap) => {
      if (fullMap) {
        return room.join(' ') + ' explored-north explored-south'
      }
      return _.includes(room, 'explored') ? room.join(' ') : 'dark'
    }

    $scope.restart = () => {
      $scope.map.disableMovement = false
      $scope.map.buildMap($scope.map.cols, $scope.map.rows)
      $scope.message = ''
    }

    $scope.toggleFullMap = () => {
      $scope.showFullMap = !$scope.showFullMap
    }
  }

  angular.module('wumpusApp')
    .controller('WumpusController', WumpusController);
}())
