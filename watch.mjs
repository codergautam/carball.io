import * as esbuild from 'esbuild'
import fs from 'fs';
import { htmlPlugin } from '@craftamap/esbuild-plugin-html';
import { cleanPlugin } from 'esbuild-clean-plugin';

let ctx = await esbuild.context({
  entryPoints: ['client/main.js'],
  bundle: true,
  minify: false,
  sourcemap: true,
  metafile: true,
  outdir: "dist/",
  plugins: [
    htmlPlugin({
      files: [{
        entryPoints: ['client/main.js'],
        filename: 'index.html',
        htmlTemplate: fs.readFileSync('client/index.html') + "",
      }]
    }),
    cleanPlugin({
      patterns: ['dist/*']
    })
  ]
})

await ctx.watch();

console.log("watching...")