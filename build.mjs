import * as esbuild from 'esbuild'
import fs from 'fs';
import { htmlPlugin } from '@craftamap/esbuild-plugin-html';
import { cleanPlugin } from 'esbuild-clean-plugin';

let res = await esbuild.build({
  entryPoints: ['client/main.js'],
  bundle: true,
  minify: true,
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
