var webpack = require('webpack');

module.exports = {
    module: {
        loaders: [{
            test: /\.js$/,
            exclude: /node_modules/,
            loader: "babel-loader"
        }],
        noParse: [
            /sinon/
        ]
    },
    plugins: [
	    new webpack.NormalModuleReplacementPlugin(/sinon/, __dirname + "/node_modules/sinon/pkg/sinon-1.14.1.js")
    ]
};
