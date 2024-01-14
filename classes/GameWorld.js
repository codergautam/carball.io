const Matter = require("matter-js");

module.exports = class GameWorld {
    constructor(width = 3000, height = 1500) {
        this.width = width;
        this.height = height;
        this.engine = Matter.Engine.create();
        this.engine.world.gravity.y = 0;

        //add le border with chamfer for smoother bounces
        // const chamferValue = 10; // Change as needed
        let borderTop = Matter.Bodies.rectangle(width / 2, -25, width + 100, 50, { isStatic: true, restitution: 0 });
        let borderBottom = Matter.Bodies.rectangle(width / 2, height + 25, width + 100, 50, { isStatic: true, restitution: 0 });
        let borderLeft = Matter.Bodies.rectangle(-25, height / 2, 50, height + 100, { isStatic: true, restitution: 0 });
        let borderRight = Matter.Bodies.rectangle(width + 25, height / 2, 50, height + 100, { isStatic: true, restitution: 0 });
        Matter.Composite.add(this.engine.world, [borderTop, borderBottom, borderLeft, borderRight]);
    }

    isOutOfBoundsX(x, halfSize) {
        return x - halfSize < 0 || x + halfSize > this.width;
    }

    isOutOfBoundsY(y, halfSize) {
        return y - halfSize < 0 || y + halfSize > this.height;
    }
}