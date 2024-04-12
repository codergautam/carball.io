const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

try {
    require('dotenv').config();
} catch (e) {
    console.log("No dotenv file found")
}
let servers = process.env.GAME_SERVERS;
if(!servers) {
  servers = {'Carball Main': 'carball.io'}
}
console.log("SERVERS", servers)

module.exports = {
    entry: './client/main.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js'
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './client/index.html'
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'assets', to: '.' }
            ]
        }),
      new webpack.DefinePlugin({
    'config.GAME_SERVERS': JSON.stringify((servers)),
    }),
    ],
    externals: {
        'matter-js': 'Matter'
    }
};
