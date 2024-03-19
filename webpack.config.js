const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

try {
    require('dotenv').config();
} catch (e) {
    console.log("No dotenv file found")
}

console.log("SERVERS", process.env.GAME_SERVERS)

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
    'config.GAME_SERVERS': process.env.GAME_SERVERS ? JSON.parse(JSON.stringify(process.env.GAME_SERVERS)) : {},
    }),
    ],
    externals: {
        'matter-js': 'Matter'
    }
};
