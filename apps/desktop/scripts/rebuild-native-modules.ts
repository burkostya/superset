import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { nativeRebuildNodeModules } from "../runtime-dependencies";

const projectRoot = resolve(import.meta.dirname, "..");
const nodeGypPath = process.env.NODE_GYP;
const nodeBinary = process.env.NODE_BINARY || "node";

function fail(message: string): never {
	console.error(`[rebuild:native-modules] ${message}`);
	process.exit(1);
}

if (!nodeGypPath) {
	fail(
		[
			"NODE_GYP is not set.",
			"Set NODE_GYP to the node-gyp.js path for the Node/Electron toolchain you want to target.",
		].join("\n"),
	);
}

// Packagers rebuild against their own Electron/Node ABI, but the set of modules
// to rebuild should stay owned by the project rather than external recipes.
for (const moduleName of nativeRebuildNodeModules) {
	const modulePath = join(projectRoot, "node_modules", moduleName);
	if (!existsSync(modulePath)) {
		fail(`Native module not found: ${modulePath}`);
	}

	console.log(`[rebuild:native-modules] Rebuilding ${moduleName}`);
	execFileSync(nodeBinary, [nodeGypPath, "rebuild", "--release"], {
		cwd: modulePath,
		stdio: "inherit",
		env: process.env,
	});
}
