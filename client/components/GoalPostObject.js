import * as PIXI from 'pixi.js';

export default class GoalPostClient {
    constructor(app, goalPostData) {
        this.app = app;
        this.goalPostData = goalPostData;
        this.graphics = new PIXI.Graphics();
        this.draw();
    }

    draw() {
        const data = this.goalPostData;

        // Clear any previous graphics
        this.graphics.clear();

        // Set the line style for drawing
        this.graphics.lineStyle(2, 0xFFFFFF, 1);

        // Draw the base rectangle
        this.drawRectangle(data.base);

        // Draw the left slant rectangle
        this.drawRectangle(data.leftSlant);

        // Draw the right slant rectangle
        this.drawRectangle(data.rightSlant);

        // Draw the middle line
        this.drawMiddleLine(data);

        // Add the graphics to the Pixi stage
        this.app.stage.addChild(this.graphics);
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
        console.log(data);
        const topCorner = data.leftSlant[0];
        const goalHeight = data.base[2].y - data.base[0].y;
        this.graphics.lineStyle(2, 0xFF0000, 1);
        this.graphics.moveTo(topCorner.x, topCorner.y);
        this.graphics.lineTo(topCorner.x, topCorner.y + goalHeight);

    }

    clear() {
        // Remove the line from the Pixi stage
        this.app.stage.removeChild(this.graphics);
    }
}
