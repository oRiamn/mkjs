const path = require("path");
const webpack = require("webpack");

module.exports = {
	entry: "./src/mkjs.ts",
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: "ts-loader",
				exclude: /node_modules/,
			},
		],
	},
	resolve: {
		extensions: [".tsx", ".ts", ".js"],
	},
	devtool: "eval-source-map",
	plugins: [
		new webpack.ProvidePlugin({
			vec2: ["gl-matrix", "vec2"],
			vec3: ["gl-matrix", "vec3"],
			vec4: ["gl-matrix", "vec4"],
			mat3: ["gl-matrix", "mat3"],
			mat4: ["gl-matrix", "mat4"],
		}),
	],
	output: {
		filename: "bundle.js",
		path: path.resolve(__dirname, "."),
	},
};
