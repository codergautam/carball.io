const Matter = require("matter-js");

module.exports = class GoalPost {
  constructor(x, y, width, height, flip = false, gameWorld) {
    // const segmentLength = 20; // Length of each segment in the chain
    // const segmentHeight = 5; // Height of each segment in the chain
    // const numberOfSegments = Math.ceil(width / segmentLength); // Number of segments based on the total width
    // const chain = []; // Array to store chain segments

    // Adjust the vertical lines to be straight up without any angle
    if(flip) {
      height = -height;
    }

    // Create each segment of the chain and constraints between them
    // for (let i = 0; i < numberOfSegments; i++) {
    //   let segment = Matter.Bodies.rectangle(x - width / 2 + segmentLength * i + segmentLength / 2, y, segmentLength, segmentHeight, {
    //     collisionFilter: { group: Matter.Body.nextGroup(true) },
    //     density: 0.01,
    //     isStatic: i === 0 || i === numberOfSegments - 1 // Make the first and last segment static to anchor the chain
    //   });
    //   chain.push(segment);

    //   if (i > 0) {
    //     let previousSegment = chain[i - 1];
    //     let constraint = Matter.Constraint.create({
    //       bodyA: previousSegment,
    //       pointA: { x: segmentLength / 2, y: 0 },
    //       bodyB: segment,
    //       pointB: { x: -segmentLength / 2, y: 0 },
    //       stiffness: 0.98,
    //       length: 0
    //     });
    //     Matter.World.add(gameWorld.engine.world, constraint);
    //   }
    // }

    // this.base = chain; // Store the chain as the base

    this.base = Matter.Bodies.rectangle(x, y, width, 10, { isStatic: true });

    this.leftSlant = Matter.Bodies.rectangle(x - width / 2, y - height / 2, 10, height, {
      isStatic: true
    });
    this.rightSlant = Matter.Bodies.rectangle(x + width / 2, y - height / 2, 10, height, {
      isStatic: true
    });

    // Combine the lines and the base chain into a single composite
    // this.body = Matter.Composite.create({
    //   bodies: [this.leftSlant, this.rightSlant].concat(this.base),
    // });

    this.body = Matter.Body.create({
      parts: [this.leftSlant, this.rightSlant, this.base],
      isStatic: true
    });
    // Rotate everything by 45 degrees with the base to point it right
    // Matter.Composite.rotate(this.body, Math.PI / 2, { x, y });
    Matter.Body.rotate(this.body, Math.PI /2, { x: this.base.position.x, y: this.base.position.y });
  }


  checkGoal(ball) {
    const ballData = { x: ball.x, y: ball.y, radius: ball.radius };

    return Matter.Vertices.contains(this.body.vertices, ballData);
  }

  exportJSON() {
    // Get edges of base
    // let baseEdges = this.base.parts[0].vertices.map(vertex => {
    //   return { x: vertex.x, y: vertex.y };
    // });
    // Get edges of left slant
    let leftSlantEdges = this.leftSlant.parts[0].vertices.map(vertex => {
      return { x: vertex.x, y: vertex.y };
    });
    // Get edges of right slant
    let rightSlantEdges = this.rightSlant.parts[0].vertices.map(vertex => {
      return { x: vertex.x, y: vertex.y };
    });
    // Get edges of base
    let baseEdges = this.base.parts[0].vertices.map(vertex => {
      return { x: vertex.x, y: vertex.y };
    });


    // log each point of the base
    // this.base.forEach((segment, index) => {
    //   let edges = segment.parts[0].vertices.map(vertex => {
    //     return { x: vertex.x, y: vertex.y };
    //   });
    //   console.log(`Base segment ${index}: `, edges);
    // });


    return {
      leftSlant: leftSlantEdges,
      rightSlant: rightSlantEdges,
      base: baseEdges
    };
  };

  // exportVerts() {
  //   let verts = [];
  //   this.base.forEach((segment, index) => {
  //     let edges = segment.parts[0].vertices.map(vertex => {
  //       return { x: vertex.x, y: vertex.y };
  //     });
  //     verts.push(edges);
  //   });
  //   return verts;
  // }
}
