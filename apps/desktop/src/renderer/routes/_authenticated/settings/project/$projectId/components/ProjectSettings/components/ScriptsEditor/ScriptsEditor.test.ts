import { describe, expect, test } from "bun:test";
// biome-ignore lint/style/noRestrictedImports: test file needs fs/path for source verification
import { readFileSync } from "node:fs";
// biome-ignore lint/style/noRestrictedImports: test file needs fs/path for source verification
import { join } from "node:path";

const SCRIPTS_EDITOR_DIR = __dirname;

function readComponent(): string {
	return readFileSync(join(SCRIPTS_EDITOR_DIR, "ScriptsEditor.tsx"), "utf-8");
}

describe("ScriptsEditor copy rule identity", () => {
	test("uses stable local ids for Copy To Workspace row keys", () => {
		const source = readComponent();

		expect(source).toContain("key={rule.id}");
		expect(source).toContain("interface CopyRuleDraft extends WorkspaceCopyRule");
		expect(source).toContain("id: crypto.randomUUID()");
	});

	test("does not derive copy rule keys from editable input values", () => {
		const source = readComponent();

		expect(source).not.toContain(
			"key={`copy-rule-${index}-${rule.source}-${rule.target ?? \"\"}`}",
		);
	});
});
