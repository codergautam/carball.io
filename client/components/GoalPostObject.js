import * as PIXI from 'pixi.js';

export default class GoalPostClient {
    constructor(app, goalPostData) {
        this.app = app;
        this.goalPostData = goalPostData;
        this.graphics = new PIXI.Graphics();
        this.baseVerts = [];
        this.draw();
    }

    draw() {
        const data = this.goalPostData;

        // Clear any previous graphics
        this.graphics.clear();

        // Set the line style for drawing
        this.graphics.lineStyle(2, 0xFFFFFF, 1);

        // Draw the left slant rectangle
        this.drawRectangle(data.leftSlant);

        // Draw the right slant rectangle
        this.drawRectangle(data.rightSlant);

        // Draw the middle line
        this.drawMiddleLine(data);

        // Draw base net vertices
        if(this.baseVerts?.length > 0) {
        this.graphics.lineStyle(8, 0xFFFFFF, 1);

        this.graphics.moveTo(this.baseVerts[0][0].x, this.baseVerts[0][0].y);
        for (let i = 0; i < this.baseVerts.length; i++) {
            const start = this.baseVerts[i][0];
            const end = this.baseVerts[i][1];

            this.graphics.lineTo(start.x, start.y);
            this.graphics.lineTo(end.x, end.y);
        }
    }

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
        if(!data.base) return;
        const topCornerBottom = data.leftSlant[1];
        const topCornerTop = data.leftSlant[0];
        const goalHeight = data.base[2].y - data.base[0].y;
        this.graphics.lineStyle(2, 0x808080, 1);
        this.graphics.moveTo(topCornerBottom.x, topCornerBottom.y);
        this.graphics.lineTo(topCornerBottom.x, topCornerTop.y + goalHeight);

    }

    handleGoalVerts(verts) {
        console.log('verts', verts);
        this.baseVerts = verts;
        this.draw();
    }


    clear() {
        // Remove the line from the Pixi stage
        this.app.stage.removeChild(this.graphics);
    }
}
