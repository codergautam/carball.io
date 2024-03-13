const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

console.log("SERVER", process.env.GAME_SERVER)

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
    'config.GAME_SERVER': JSON.stringify(process.env.GAME_SERVER),
    }),
    ],
    externals: {
        'matter-js': 'Matter'
    }
};
