import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
	packagedNodeModuleCopies,
	requiredMaterializedNodeModules,
} from "../runtime-dependencies";

const projectRoot = resolve(import.meta.dirname, "..");
const defaultOutputDir = join(projectRoot, "release", "portable-app");
const outputDir = process.argv[2]
	? resolve(process.argv[2])
	: defaultOutputDir;

function fail(message: string): never {
	console.error(`[stage:portable] ${message}`);
	process.exit(1);
}

function ensureExists(path: string, reason: string): void {
	if (!existsSync(path)) {
		fail(`${reason}\nMissing path: ${path}`);
	}
}

function copyPath(from: string, to: string, label: string): void {
	ensureExists(from, `Cannot stage ${label}`);
	mkdirSync(dirname(to), { recursive: true });
	cpSync(from, to, { recursive: true });
	console.log(`[stage:portable] Copied ${label}`);
}

function prepareOutputDir(): void {
	if (existsSync(outputDir)) {
		rmSync(outputDir, { recursive: true, force: true });
	}
	mkdirSync(outputDir, { recursive: true });
}

function validateInputs(): void {
	ensureExists(
		join(projectRoot, "dist", "main", "index.js"),
		"Desktop bundle not found. Run `bun run prebuild` first.",
	);

	// The portable bundle intentionally reuses the same curated runtime module
	// list as electron-builder packaging so Nix/system packagers do not need a
	// second copy of that knowledge.
	for (const moduleName of requiredMaterializedNodeModules) {
		ensureExists(
			join(projectRoot, "node_modules", moduleName),
			[
				`Required runtime module is missing or not materialized: ${moduleName}`,
				"Run `bun run copy:native-modules` (or `bun run prebuild`) first.",
			].join("\n"),
		);
	}
}

function stagePortableRuntime(): void {
	validateInputs();
	prepareOutputDir();

	copyPath(
		join(projectRoot, "package.json"),
		join(outputDir, "package.json"),
		"package.json",
	);
	copyPath(join(projectRoot, "dist"), join(outputDir, "dist"), "dist/");

	for (const moduleCopy of packagedNodeModuleCopies) {
		copyPath(
			join(projectRoot, moduleCopy.from),
			join(outputDir, moduleCopy.to),
			moduleCopy.to,
		);
	}

	console.log(`[stage:portable] Portable runtime ready at ${outputDir}`);
}

stagePortableRuntime();
