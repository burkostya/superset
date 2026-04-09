import type { PushActionCopy } from "./getPushActionCopy";

export type PrimaryActionType = "commit" | "amend" | "sync" | "push" | "pull";

export interface PrimaryActionInput {
	canSubmit: boolean;
	hasStagedChanges: boolean;
	isPending: boolean;
	isAmendMode: boolean;
	isAmendMessageLoading: boolean;
	pushCount: number;
	pullCount: number;
	hasUpstream: boolean;
	pushActionCopy: Pick<PushActionCopy, "label" | "tooltip">;
}

export interface PrimaryActionState {
	action: PrimaryActionType;
	label: string;
	disabled: boolean;
	tooltip: string;
}

export function getPrimaryAction({
	canSubmit,
	hasStagedChanges,
	isPending,
	isAmendMode,
	isAmendMessageLoading,
	pushCount,
	pullCount,
	hasUpstream,
	pushActionCopy,
}: PrimaryActionInput): PrimaryActionState {
	if (isAmendMode) {
		return {
			action: "amend",
			label: "Amend",
			disabled: isPending || isAmendMessageLoading || !canSubmit,
			tooltip: isAmendMessageLoading
				? "Loading previous commit message"
				: canSubmit
					? "Amend previous commit"
					: "Enter a message",
		};
	}

	if (canSubmit) {
		return {
			action: "commit",
			label: "Commit",
			disabled: isPending,
			tooltip: "Commit staged changes",
		};
	}

	if (pushCount > 0 && pullCount > 0) {
		return {
			action: "sync",
			label: "Sync",
			disabled: isPending,
			tooltip: `Pull ${pullCount}, push ${pushCount}`,
		};
	}

	if (pushCount > 0) {
		return {
			action: "push",
			label: pushActionCopy.label,
			disabled: isPending,
			tooltip: pushActionCopy.tooltip,
		};
	}

	if (pullCount > 0) {
		return {
			action: "pull",
			label: "Pull",
			disabled: isPending,
			tooltip: `Pull ${pullCount} commit${pullCount !== 1 ? "s" : ""}`,
		};
	}

	if (!hasUpstream) {
		return {
			action: "push",
			label: pushActionCopy.label,
			disabled: isPending,
			tooltip: pushActionCopy.tooltip,
		};
	}

	return {
		action: "commit",
		label: "Commit",
		disabled: true,
		tooltip: hasStagedChanges ? "Enter a message" : "No staged changes",
	};
}
