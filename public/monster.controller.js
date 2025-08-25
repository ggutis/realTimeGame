class Monster {

   constructor(ctx, width, height, speed, scaleRatio) {
        this.ctx = ctx;
        this.canvas = ctx.canvas;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.scaleRatio = scaleRatio;

        this.x = 0;
        this.y = this.canvas.height - this.height;

        this.MonsterImg = new Image();
        this.MonsterImg.src = "images/${monster.name}.png";
    }

}