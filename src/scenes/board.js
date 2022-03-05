import Phaser from 'phaser';

import { StateMachine, State } from 'gateball/util';

export default class BoardScene extends Phaser.Scene {
  constructor() {
    super({
      key: 'board',
    });
  }

  preload() {
    Player.preload(this);

    this.load.tilemapTiledJSONExternal('basic', `tilemaps/basic.json`);
    this.load.spritesheet('tileset_basic', 'img/tileset_basic.png', { frameWidth: 16, frameHeight: 16 });
  }

  create() {
    Player.create(this);

    // Keyboard
    this.keys = {
      ...this.input.keyboard.createCursorKeys(),
      ...this.input.keyboard.addKeys('S,D,F,ENTER,SHIFT'),
    };

    this.solid = this.add.group(); // Objects the player is blocked by

    this.board = new Board(this, 'basic');

    const start = this.board.getStart();
    this.player = new Player(this, start.x, start.y);

    this.cameras.main.startFollow(this.player);

    this.stateMachine = new StateMachine(
      'running',
      {
        running: new RunningState(),
      },
      [this]
    );
  }

  update(time, delta) {
    this.stateMachine.step(time, delta);
  }
}

class RunningState extends State {
  execute(scene, time, delta) {
    scene.player.update(time, delta);
  }
}

class Board {
  constructor(scene, key) {
    this.tilemap = scene.make.tilemap({ key, insertNull: true });

    this.tilesets = [];
    const tilemapData = scene.cache.tilemap.get(key).data;
    for (const { name, tilewidth, tileheight } of tilemapData.tilesets) {
      this.tilesets.push(this.tilemap.addTilesetImage(name, `tileset_${name}`, tilewidth, tileheight));
    }

    this.mainLayer = this.tilemap.createLayer('main', this.tilesets, 0, 0);
    this.mainLayer.setCollisionFromCollisionGroup(true);
    scene.solid.add(this.mainLayer);

    this.objectLayer = this.tilemap.getObjectLayer('objects');
  }

  getStart(name = 'default') {
    return this.objectLayer.objects.find((o) => o.type === 'start' && o.name === name);
  }
}

const PLAYER_VELOCITY = 80;
const PLAYER_JUMP_VELOCITY = -190;

class Player extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Player sprite
    this.sprite = scene.add.sprite(16, 16, 'player', 0);
    this.add(this.sprite);

    // Physics
    this.body.setSize(16, 16).setOffset(8, 8);
    scene.physics.add.collider(this, scene.solid);

    this.direction = 'right';

    this.stateMachine = new StateMachine(
      'idle',
      {
        idle: new IdleState(),
        walk: new WalkingState(),
        jump: new JumpingState(),
      },
      [scene, this]
    );
  }

  set direction(direction) {
    this._direction = direction;
    this.sprite.setFlipX(direction === 'left' ? true : false);
  }

  get direction() {
    return this._direction;
  }

  static preload(scene) {
    scene.load.spritesheet('player', 'img/player.png', { frameWidth: 16, frameHeight: 16 });
  }

  static create(scene) {
    scene.anims.create({
      key: 'playerRun',
      frames: scene.anims.generateFrameNumbers('player', {
        frames: [2, 3, 4, 5, 6, 7],
      }),
      frameRate: 10,
      repeat: -1,
    });
    scene.anims.create({
      key: 'playerSpinJump',
      frames: scene.anims.generateFrameNumbers('player', {
        frames: [8, 9, 10, 11, 12, 13],
      }),
      frameRate: 10,
      repeat: -1,
    });
  }

  update(time, delta) {
    this.stateMachine.step(time, delta);
  }
}

class IdleState extends State {
  handleEntered(scene, player) {
    player.body.setVelocity(0);
    player.sprite.stop().setFrame(0);
  }

  execute(scene) {
    const { right, left, D } = scene.keys;
    if (D.isDown) {
      return 'jump';
    } else if (right.isDown || left.isDown) {
      return 'walk';
    }
  }
}

class WalkingState extends State {
  handleEntered(scene, player) {
    player.sprite.play('playerRun');
  }

  execute(scene, player) {
    const { right, left, D } = scene.keys;

    if (D.isDown) {
      return 'jump';
    }

    let dx = 0;
    let dy = 0;

    if (right.isDown && !left.isDown) {
      dx = PLAYER_VELOCITY;
      player.direction = 'right';
    } else if (left.isDown && !right.isDown) {
      dx = -PLAYER_VELOCITY;
      player.direction = 'left';
    }

    // Exit to idle state if we're not moving
    if (dx === 0 && dy === 0) {
      return 'idle';
    }

    player.body.setVelocityX(dx);
  }
}

class JumpingState extends State {
  handleEntered(scene, player) {
    player.sprite.play('playerSpinJump');
    player.body.setVelocityY(PLAYER_JUMP_VELOCITY);
  }

  execute(scene, player) {
    const { right, left } = scene.keys;
    let dx = 0;
    let dy = 0;

    if (right.isDown && !left.isDown) {
      dx = PLAYER_VELOCITY;
      player.direction = 'right';
    } else if (left.isDown && !right.isDown) {
      dx = -PLAYER_VELOCITY;
      player.direction = 'left';
    }

    // Exit to idle state if we're standing on something
    if (player.body.blocked.down) {
      return 'idle';
    }

    player.body.setVelocityX(dx);
  }
}
