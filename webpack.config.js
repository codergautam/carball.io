const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

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
        })
    ],
    externals: {
        'matter-js': 'Matter'
    }
};
