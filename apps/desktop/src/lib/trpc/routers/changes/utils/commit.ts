import type { SimpleGit } from "simple-git";

export function isNoHeadCommitError(message: string): boolean {
	const normalized = message.toLowerCase();
	return (
		normalized.includes("does not have any commits yet") ||
		normalized.includes("bad revision 'head'") ||
		normalized.includes("ambiguous argument 'head'") ||
		normalized.includes("unknown revision or path not in the working tree")
	);
}

export async function readHeadCommitMessage(
	git: SimpleGit,
): Promise<string | null> {
	try {
		return (await git.raw(["log", "-1", "--format=%B"])).trimEnd();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (isNoHeadCommitError(message)) {
			return null;
		}
		throw error;
	}
}

export async function commitChanges({
	git,
	message,
	amend,
}: {
	git: SimpleGit;
	message: string;
	amend?: boolean;
}): Promise<string> {
	if (amend) {
		await git.raw(["commit", "--amend", "-m", message]);
		return (await git.revparse(["HEAD"])).trim();
	}

	const result = await git.commit(message);
	return result.commit;
}
