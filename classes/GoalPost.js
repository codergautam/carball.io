const Matter = require("matter-js");

module.exports = class GoalPost {
  constructor(x, y, width, height, flip = false) {
    // Define the dimensions and positions of the goal post lines
    this.base = Matter.Bodies.rectangle(x, y, width, 10, { isStatic: true });

    // Adjust the vertical lines to be straight up without any angle
    if(flip) {
      height = -height;
    }
    this.leftSlant = Matter.Bodies.rectangle(x - width / 2, y - height / 2, 10, height, {
      isStatic: true
    });
    this.rightSlant = Matter.Bodies.rectangle(x + width / 2, y - height / 2, 10, height, {
      isStatic: true
    });


    // Combine the lines into a single composite
    this.body = Matter.Body.create({
      parts: [this.base, this.leftSlant, this.rightSlant],
      isStatic: true
    });
    // Rotate everything by 45 degrees
    Matter.Body.rotate(this.body, Math.PI /2, { x: this.base.position.x, y: this.base.position.y });
  }


  checkGoal(ball) {
    const ballData = { x: ball.x, y: ball.y, radius: ball.radius };

    return Matter.Vertices.contains(this.body.vertices, ballData);
  }

  exportJSON() {
    // Get edges of base
    let baseEdges = this.base.parts[0].vertices.map(vertex => {
      return { x: vertex.x, y: vertex.y };
    });
    // Get edges of left slant
    let leftSlantEdges = this.leftSlant.parts[0].vertices.map(vertex => {
      return { x: vertex.x, y: vertex.y };
    });
    // Get edges of right slant
    let rightSlantEdges = this.rightSlant.parts[0].vertices.map(vertex => {
      return { x: vertex.x, y: vertex.y };
    });


    return {
      base: baseEdges,
      leftSlant: leftSlantEdges,
      rightSlant: rightSlantEdges
    };
  };
}
