const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
    entry: "./scripts/main.js",
    output: {
        filename: "./index.js",
        path: path.resolve(__dirname),
    },
    mode: "production",
    devtool: "source-map",
    optimization: {
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    keep_classnames: true,
                    keep_fnames: true,
                },
            }),
        ],
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                },
            },
        ],
    },
};