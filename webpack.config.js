const path = require('path')

module.exports = {
    mode: 'production', //add this line here
    entry: path.join(__dirname, "./src/index.js"),
    output: {
        path: path.resolve(__dirname, "./dist"),
        filename: "bundle.js"
    },
    resolve: {
        extensions: ["*", ".js", ".jsx"]
    },
    module: {
        rules: [{
            test: /\.(js|jsx)$/,
            exclude: /node_modules/,
            use: {
                loader: "babel-loader",
            }
        }]
    }

}