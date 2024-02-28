import * as PIXI from 'pixi.js';

export default class GoalPostClient {
    constructor(app, goalPostData, right=false) {
        this.app = app;
        this.goalPostData = goalPostData;
        this.graphics = new PIXI.Graphics();
        this.graphics.parentLayer = app.pixiLayer;
      this.goalImg = null;
        this.graphics.zOrder = 1;

        this.baseVerts = [];
        this.right = right;
        this.draw();
    }

    draw() {
        const data = this.goalPostData;
      console.log("drawing a goal post")

        // Clear any previous graphics
        this.graphics.clear();
      // clear previous img
      if(this.goalImg) {
        this.goalImg.destroy();
        this.goalImg = null;
      }

        // Set the line style for drawing
        this.graphics.lineStyle(2, 0xFFFFFF, 1);

        // // Draw the left slant rectangle
        // this.drawRectangle(data.leftSlant);

        // // Draw the right slant rectangle
        // this.drawRectangle(data.rightSlant);

        // if(data.base) {
        //     this.drawRectangle(data.base);
        // }
        // // Draw the middle line
        // this.drawMiddleLine(data);

        // Draw base net vertices
    //     if(this.baseVerts?.length > 0) {
    //     this.graphics.lineStyle(8, 0xFFFFFF, 1);
    //         let connect =false;
    //         for (let i = 0; i < this.baseVerts.length; i++) {
    //         const start = this.baseVerts[i][0];
    //         const end = this.baseVerts[i][1];

    //         if(connect ) this.graphics.lineTo(start.x, start.y);
    //         else {
    //             connect = true;
    //             this.graphics.moveTo(start.x, start.y);
    //         }
    //         this.graphics.lineTo(end.x, end.y);
    //     }
    // }

        const points = {
            topLeft: data.base[0],
            bottomLeft: data.base[1],
            bottomRight: data.leftSlant[0],
            topRight: data.rightSlant[1],
        }

        this.goalImg = PIXI.Sprite.from('./goal.png');
        this.goalImg.parentLayer = this.app.pixiLayer;
        this.goalImg.zOrder = 10;
        // place the goal image correctly and scale it
        this.goalImg.x = points.topLeft.x;
        this.goalImg.y = points.topLeft.y;
        this.goalImg.width = (points.topRight.x - points.topLeft.x)*1.05;
        this.goalImg.height = (points.bottomLeft.y - points.topLeft.y)*1.05
        // rotate it 180 degrees around its center
        this.goalImg.anchor.set(1);
        this.goalImg.rotation = Math.PI;
        this.app.stage.addChild(this.goalImg);

        if(this.right) {
            this.goalImg.x = points.topRight.x;
            this.goalImg.anchor.set(0);
            this.goalImg.rotation = 0;
        }

        // Object.values(points).forEach(point => {
        //     // draw a large dot at the point
        //     this.graphics.beginFill(0xFFFFFF);
        //     this.graphics.drawCircle(point.x, point.y, 5);
        //     this.graphics.endFill();
        // });
        // this.graphics.beginFill(0xFFFFFF);
        // this.graphics.drawCircle(points.topLeft.x, points.topLeft.y, 5);
        // this.graphics.endFill();

        this.drawOuterLines(points);


        // Add the graphics to the Pixi stage
        this.app.stage.addChild(this.graphics);
    }

    drawOuterLines(points) {
       const ratios = {
         penaltyBoxW: 1.5,
            penaltyBoxH: 1.8,
         penaltyBoxSemiCircleRadius: 0.1,
       }
        // draw it
        const penaltyBox = {
            x: points.topLeft.x,
            y: points.topLeft.y - (points.bottomLeft.y - points.topLeft.y) * (ratios.penaltyBoxH - 1) / 2,
            width: (points.topRight.x - points.topLeft.x) * ratios.penaltyBoxW,
            height: (points.bottomLeft.y - points.topLeft.y) * ratios.penaltyBoxH,

        }
        if(this.right && (penaltyBox.width < 0 || penaltyBox.height < 0)) {
            // modify the x and y to make sure the width and height are positive
            penaltyBox.x = penaltyBox.x + penaltyBox.width;
            penaltyBox.width = Math.abs(penaltyBox.width);
            penaltyBox.height = Math.abs(penaltyBox.height);
        }

        this.graphics.lineStyle(10, 0xFFFFFF, 1);
        this.graphics.drawRect(penaltyBox.x, penaltyBox.y, penaltyBox.width, penaltyBox.height);

        // semi circle
        const semiCircle = {
            x: penaltyBox.x + penaltyBox.width,
            y: penaltyBox.y + penaltyBox.height / 2,
            radius: penaltyBox.height * ratios.penaltyBoxSemiCircleRadius,
        }
        if(this.right) {
            semiCircle.x = penaltyBox.x;
            // arc the other way
            this.graphics.arc(semiCircle.x, semiCircle.y, semiCircle.radius, Math.PI / 2, -Math.PI / 2, false);
        } else this.graphics.arc(semiCircle.x, semiCircle.y, semiCircle.radius, Math.PI / 2, -Math.PI / 2, true);



    }

    drawRectangle(edges) {
        // Assuming edges is an array of vertices in the order: top-left, top-right, bottom-right, bottom-left
        this.graphics.moveTo(edges[0].x, edges[0].y);
        for (let i = 1; i < edges.length; i++) {
            this.graphics.lineTo(edges[i].x, edges[i].y);
        }
        // Close the shape by connecting the last vertex to the first
        this.graphics.lineTo(edges[0].x, edges[0].y);
    }

    drawMiddleLine(data) {
        if(!data.base) return;
        const topCornerBottom = data.leftSlant[1];
        const topCornerTop = data.leftSlant[0];
        const goalHeight = data.base[2].y - data.base[0].y;
        this.graphics.lineStyle(2, 0x808080, 1);
        this.graphics.moveTo(topCornerBottom.x, topCornerBottom.y);
        this.graphics.lineTo(topCornerBottom.x, topCornerTop.y + goalHeight);

    }


    clear() {
        // Remove the line from the Pixi stage
        this.app.stage.removeChild(this.graphics);
      this.app.stage.removeChild(this.goalImg);
    }
}
