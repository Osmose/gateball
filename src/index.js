import Phaser from 'phaser';
import registerTiledJSONExternalLoader from 'phaser-tiled-json-external-loader';

import BoardScene from 'gateball/scenes/board';

registerTiledJSONExternalLoader(Phaser);

window.addEventListener('load', () => {
  const game = (window.game = new Phaser.Game({
    type: Phaser.AUTO,
    height: 224,
    width: 256,
    zoom: 4,
    backgroundColor: '#000',
    parent: 'game',
    render: {
      pixelArt: true,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 320 },
      },
    },
    scene: [new BoardScene()],
  }));

  window.addEventListener('keydown', (e) => {
    if (e.key === '=') {
      if (game.loop.running) {
        game.loop.sleep();
      } else {
        game.loop.tick();
      }
    } else if (e.key === 'Escape') {
      if (!game.loop.running) {
        game.loop.wake();
      }
    }
  });
});
