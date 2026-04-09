import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import simpleGit from "simple-git";
import {
	commitChanges,
	isNoHeadCommitError,
	readHeadCommitMessage,
} from "./commit";

const tempDirs: string[] = [];

function createRepo() {
	const repoPath = mkdtempSync(join(tmpdir(), "superset-commit-utils-"));
	tempDirs.push(repoPath);
	return { repoPath, git: simpleGit(repoPath) };
}

async function initRepo(repoPath: string) {
	const git = simpleGit(repoPath);
	await git.init();
	await git.addConfig("user.name", "Test User");
	await git.addConfig("user.email", "test@example.com");
	return git;
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

describe("commit utils", () => {
	test("reads null when HEAD does not exist yet", async () => {
		const { repoPath } = createRepo();
		const git = await initRepo(repoPath);

		await expect(readHeadCommitMessage(git)).resolves.toBeNull();
	});

	test("reads the full HEAD commit message body", async () => {
		const { repoPath } = createRepo();
		const git = await initRepo(repoPath);

		writeFileSync(join(repoPath, "note.txt"), "one\n");
		await git.add(["note.txt"]);
		await commitChanges({
			git,
			message: "feat: first line\n\nDetailed body line",
		});

		await expect(readHeadCommitMessage(git)).resolves.toBe(
			"feat: first line\n\nDetailed body line",
		);
	});

	test("amends the last commit without staged changes", async () => {
		const { repoPath } = createRepo();
		const git = await initRepo(repoPath);

		writeFileSync(join(repoPath, "note.txt"), "one\n");
		await git.add(["note.txt"]);
		await commitChanges({
			git,
			message: "feat: first message",
		});

		await commitChanges({
			git,
			message: "feat: amended message",
			amend: true,
		});

		await expect(readHeadCommitMessage(git)).resolves.toBe(
			"feat: amended message",
		);
	});
});

describe("isNoHeadCommitError", () => {
	test("detects unborn HEAD messages", () => {
		expect(
			isNoHeadCommitError(
				"fatal: your current branch 'main' does not have any commits yet",
			),
		).toBe(true);
	});

	test("ignores unrelated git errors", () => {
		expect(isNoHeadCommitError("fatal: not a git repository")).toBe(false);
	});
});
