import { describe, expect, test } from "bun:test";
import { getPrimaryAction } from "./getPrimaryAction";
import { getPushActionCopy } from "./getPushActionCopy";

describe("getPrimaryAction", () => {
	test("prioritizes commit when commit is possible", () => {
		const state = getPrimaryAction({
			canSubmit: true,
			hasStagedChanges: true,
			isPending: false,
			isAmendMode: false,
			isAmendMessageLoading: false,
			pushCount: 3,
			pullCount: 2,
			hasUpstream: true,
			pushActionCopy: getPushActionCopy({
				hasUpstream: true,
				pushCount: 3,
			}),
		});

		expect(state.action).toBe("commit");
		expect(state.label).toBe("Commit");
		expect(state.tooltip).toBe("Commit staged changes");
		expect(state.disabled).toBe(false);
	});

	test("shows sync when both push and pull are pending", () => {
		const state = getPrimaryAction({
			canSubmit: false,
			hasStagedChanges: false,
			isPending: false,
			isAmendMode: false,
			isAmendMessageLoading: false,
			pushCount: 2,
			pullCount: 1,
			hasUpstream: true,
			pushActionCopy: getPushActionCopy({
				hasUpstream: true,
				pushCount: 2,
			}),
		});

		expect(state.action).toBe("sync");
		expect(state.label).toBe("Sync");
		expect(state.tooltip).toBe("Pull 1, push 2");
	});

	test("shows push when only push is pending", () => {
		const state = getPrimaryAction({
			canSubmit: false,
			hasStagedChanges: false,
			isPending: false,
			isAmendMode: false,
			isAmendMessageLoading: false,
			pushCount: 2,
			pullCount: 0,
			hasUpstream: true,
			pushActionCopy: getPushActionCopy({
				hasUpstream: true,
				pushCount: 2,
			}),
		});

		expect(state.action).toBe("push");
		expect(state.label).toBe("Push");
		expect(state.tooltip).toBe("Push 2 commits");
	});

	test("shows pull when only pull is pending", () => {
		const state = getPrimaryAction({
			canSubmit: false,
			hasStagedChanges: false,
			isPending: false,
			isAmendMode: false,
			isAmendMessageLoading: false,
			pushCount: 0,
			pullCount: 2,
			hasUpstream: true,
			pushActionCopy: getPushActionCopy({
				hasUpstream: true,
				pushCount: 0,
			}),
		});

		expect(state.action).toBe("pull");
		expect(state.label).toBe("Pull");
		expect(state.tooltip).toBe("Pull 2 commits");
	});

	test("shows publish branch for unpublished branch without PR", () => {
		const state = getPrimaryAction({
			canSubmit: false,
			hasStagedChanges: false,
			isPending: false,
			isAmendMode: false,
			isAmendMessageLoading: false,
			pushCount: 0,
			pullCount: 0,
			hasUpstream: false,
			pushActionCopy: getPushActionCopy({
				hasUpstream: false,
				pushCount: 0,
			}),
		});

		expect(state.action).toBe("push");
		expect(state.label).toBe("Publish Branch");
		expect(state.tooltip).toBe("Publish branch to remote");
	});

	test("shows push label for unpublished branch with existing PR", () => {
		const state = getPrimaryAction({
			canSubmit: false,
			hasStagedChanges: false,
			isPending: false,
			isAmendMode: false,
			isAmendMessageLoading: false,
			pushCount: 0,
			pullCount: 0,
			hasUpstream: false,
			pushActionCopy: getPushActionCopy({
				hasUpstream: false,
				pushCount: 0,
				pullRequest: {
					headRefName: "feature/pr-branch",
					headRepositoryOwner: "Kitenite",
				},
			}),
		});

		expect(state.action).toBe("push");
		expect(state.label).toBe("Push to PR");
		expect(state.tooltip).toBe("Push changes to Kitenite:feature/pr-branch");
	});

	test("falls back to disabled commit state", () => {
		const state = getPrimaryAction({
			canSubmit: false,
			hasStagedChanges: false,
			isPending: false,
			isAmendMode: false,
			isAmendMessageLoading: false,
			pushCount: 0,
			pullCount: 0,
			hasUpstream: true,
			pushActionCopy: getPushActionCopy({
				hasUpstream: true,
				pushCount: 0,
			}),
		});

		expect(state.action).toBe("commit");
		expect(state.label).toBe("Commit");
		expect(state.disabled).toBe(true);
		expect(state.tooltip).toBe("No staged changes");
	});

	test("prioritizes amend mode over sync and push states", () => {
		const state = getPrimaryAction({
			canSubmit: true,
			hasStagedChanges: false,
			isPending: false,
			isAmendMode: true,
			isAmendMessageLoading: false,
			pushCount: 2,
			pullCount: 1,
			hasUpstream: true,
			pushActionCopy: getPushActionCopy({
				hasUpstream: true,
				pushCount: 2,
			}),
		});

		expect(state.action).toBe("amend");
		expect(state.label).toBe("Amend");
		expect(state.tooltip).toBe("Amend previous commit");
		expect(state.disabled).toBe(false);
	});

	test("disables amend while loading the previous commit message", () => {
		const state = getPrimaryAction({
			canSubmit: false,
			hasStagedChanges: false,
			isPending: false,
			isAmendMode: true,
			isAmendMessageLoading: true,
			pushCount: 0,
			pullCount: 0,
			hasUpstream: true,
			pushActionCopy: getPushActionCopy({
				hasUpstream: true,
				pushCount: 0,
			}),
		});

		expect(state.action).toBe("amend");
		expect(state.disabled).toBe(true);
		expect(state.tooltip).toBe("Loading previous commit message");
	});
});
