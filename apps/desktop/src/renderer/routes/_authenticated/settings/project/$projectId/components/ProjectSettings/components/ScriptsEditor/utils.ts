import type { WorkspaceCopyRule } from "shared/types/config";

export interface ScriptsEditorContent {
	setup: string;
	teardown: string;
	run: string;
	copy: WorkspaceCopyRule[];
}

export function parseContentFromConfig(
	content: string | null,
): ScriptsEditorContent {
	if (!content) {
		return { setup: "", teardown: "", run: "", copy: [] };
	}

	try {
		const parsed = JSON.parse(content) as {
			setup?: unknown;
			teardown?: unknown;
			run?: unknown;
			copy?: unknown;
		};

		const copy = Array.isArray(parsed.copy)
			? parsed.copy.flatMap((rule): WorkspaceCopyRule[] => {
					if (typeof rule !== "object" || rule === null || Array.isArray(rule)) {
						return [];
					}

					const source =
						typeof rule.source === "string" ? rule.source.trim() : "";
					const target =
						typeof rule.target === "string" ? rule.target.trim() : undefined;
					if (source.length === 0) {
						return [];
					}

					return [
						{
							source,
							target: target && target.length > 0 ? target : undefined,
							optional: rule.optional === true ? true : undefined,
							overwrite: rule.overwrite === true ? true : undefined,
						},
					];
				})
			: [];

		return {
			setup: Array.isArray(parsed.setup) ? parsed.setup.join("\n") : "",
			teardown: Array.isArray(parsed.teardown) ? parsed.teardown.join("\n") : "",
			run: Array.isArray(parsed.run) ? parsed.run.join("\n") : "",
			copy,
		};
	} catch {
		return { setup: "", teardown: "", run: "", copy: [] };
	}
}

export function buildCopyPayload(
	copyRules: WorkspaceCopyRule[],
): WorkspaceCopyRule[] {
	return copyRules.flatMap((rule): WorkspaceCopyRule[] => {
		const source = rule.source.trim();
		const target = rule.target?.trim();
		if (source.length === 0) {
			return [];
		}

		return [
			{
				source,
				...(target ? { target } : {}),
				...(rule.optional ? { optional: true } : {}),
				...(rule.overwrite ? { overwrite: true } : {}),
			},
		];
	});
}
