import { ncp } from "ncp";
import chalk from "chalk";
import { promisify } from "util";
import { resolve } from "path";
import fs from "fs";
import { execSync } from "child_process";
import parseArgs from "minimist";

async function run(name, { typescript = false }) {
	if (!name) {
		console.log(`${chalk.red("[WARN]")} No path given!`);
		return;
	}

	// Get absolute path
	const path = resolve(fs.realpathSync(process.cwd()), name);

	if (fs.existsSync(path)) {
		console.log(`${chalk.red("[WARN]")} Path exists!`);
		return;
	}

	console.log(`${chalk.blueBright("[INFO]")} Copying...${typescript ? " (TypeScript)" : ""}`);

	// Copy from template
	try {
		await promisify(ncp)(resolve(__dirname, "..", "template"), path);
	} catch (error) {
		console.error(`${chalk.redBright("[ERROR]")} Error copying.`);
		console.error(error);
		return;
	}

	console.log(`${chalk.blueBright("[INFO]")} Setting up...`);

	// Set the "name" field in package.json
	try {
		const childPackagePath = resolve(path, "package.json");
		// Read
		const childPackage = JSON.parse(fs.readFileSync(childPackagePath));
		const newChildPackage = { name, ...childPackage }; // Hack to put name at front
		if (typescript) {
			newChildPackage.noderize = { languages: "typescript" };
		}
		// Write
		fs.writeFileSync(
			childPackagePath,
			JSON.stringify(newChildPackage, null, "\t")
		);
	} catch (error) {
		console.error(`${chalk.redBright("[ERROR]")} Error saving package.json.`);
		console.error(error);
	}

	// Move "gitignore" to ".gitignore"
	try {
		fs.renameSync(resolve(path, "gitignore"), resolve(path, ".gitignore"));
	} catch (error) {
		console.error(`${chalk.redBright("[ERROR]")} Error moving .gitignore.`);
		console.error(error);
	}

	if (typescript) {
		// Setup TypeScript
		try {
			fs.renameSync(resolve(path, "src", "index.js"), resolve(path, "src", "index.ts"));
		} catch (error) {
			console.error(`${chalk.redBright("[ERROR]")} Error moving src/index.js to src/index.ts`);
			console.error(error);
		}

	}

	console.log(`${chalk.blueBright("[INFO]")} Installing packages...`);

	const useYarn = shouldUseYarn();
	try {
		// Install using yarn/npm
		if (useYarn) {
			execSync("yarn", { cwd: path });
		} else {
			execSync("npm install", { cwd: path });
		}
	} catch (error) {
		console.error(`${chalk.redBright("[ERROR]")} Error installing packages.`);
		console.error(error);
	}

	const runCommand = useYarn ? "yarn" : "npm run";

	console.log(`${chalk.greenBright("[INFO]")} Done! Your Noderize app is ready!`);
	console.log(
		`${chalk.greenBright("[INFO]")} You may visit your app with ${chalk.cyan(
			`cd ${name}`
		)}`
	);
	console.log(
		`${chalk.greenBright("[INFO]")} Develop by using ${chalk.cyan(
			`${runCommand} watch`
		)}`
	);
	console.log(
		`${chalk.greenBright(
			"[INFO]"
		)} Build a production version using ${chalk.cyan(`${runCommand} build`)}`
	);
	console.log(
		`${chalk.greenBright(
			"[INFO]"
		)} Visit documentation at ${chalk.cyan(`https://noderize.js.org`)}`
	);
}

function shouldUseYarn() {
	try {
		execSync("yarn --version", { stdio: "ignore" });
		return true;
	} catch (e) {
		return false;
	}
}

const args = parseArgs(process.argv.slice(2));
const name = args._.length > 0 ? args._[0] : null;
run(name, args);