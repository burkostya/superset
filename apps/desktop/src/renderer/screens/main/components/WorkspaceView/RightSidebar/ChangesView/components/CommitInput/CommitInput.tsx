import type { GitHubStatus } from "@superset/local-db";
import { Button } from "@superset/ui/button";
import { ButtonGroup } from "@superset/ui/button-group";
import { Checkbox } from "@superset/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { toast } from "@superset/ui/sonner";
import { Textarea } from "@superset/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { useEffect, useRef, useState } from "react";
import {
	VscArrowDown,
	VscArrowUp,
	VscCheck,
	VscChevronDown,
	VscLinkExternal,
	VscRefresh,
	VscSync,
} from "react-icons/vsc";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { useCreateOrOpenPR } from "renderer/screens/main/hooks";
import { getPrimaryAction } from "./utils/getPrimaryAction";
import { getPushActionCopy } from "./utils/getPushActionCopy";

type CommitInputPullRequest = NonNullable<GitHubStatus["pr"]>;

interface CommitInputProps {
	worktreePath: string;
	hasStagedChanges: boolean;
	pushCount: number;
	pullCount: number;
	hasUpstream: boolean;
	pullRequest?: CommitInputPullRequest | null;
	canCreatePR: boolean;
	shouldAutoCreatePRAfterPublish: boolean;
	onRefresh: () => void;
}

export function CommitInput({
	worktreePath,
	hasStagedChanges,
	pushCount,
	pullCount,
	hasUpstream,
	pullRequest,
	canCreatePR,
	shouldAutoCreatePRAfterPublish,
	onRefresh,
}: CommitInputProps) {
	const [commitMessage, setCommitMessage] = useState("");
	const [isAmendMode, setIsAmendMode] = useState(false);
	const [isAmendMessageLoading, setIsAmendMessageLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const amendRequestIdRef = useRef(0);

	const headCommitMessageQuery =
		electronTrpc.changes.getHeadCommitMessage.useQuery(
			{ worktreePath },
			{ enabled: false },
		);
	const refetchHeadCommitMessage = headCommitMessageQuery.refetch;

	const commitMutation = electronTrpc.changes.commit.useMutation({
		onSuccess: (_data, variables) => {
			toast.success(variables.amend ? "Amended commit" : "Committed");
			setCommitMessage("");
			setIsAmendMode(false);
			onRefresh();
		},
		onError: (error) => toast.error(`Commit failed: ${error.message}`),
	});

	const pushMutation = electronTrpc.changes.push.useMutation({
		onSuccess: () => {
			toast.success("Pushed");
			onRefresh();
		},
		onError: (error) => toast.error(`Push failed: ${error.message}`),
	});

	const pullMutation = electronTrpc.changes.pull.useMutation({
		onSuccess: () => {
			toast.success("Pulled");
			onRefresh();
		},
		onError: (error) => toast.error(`Pull failed: ${error.message}`),
	});

	const syncMutation = electronTrpc.changes.sync.useMutation({
		onSuccess: () => {
			toast.success("Synced");
			onRefresh();
		},
		onError: (error) => toast.error(`Sync failed: ${error.message}`),
	});

	const { createOrOpenPR, isPending: isCreateOrOpenPRPending } =
		useCreateOrOpenPR({
			worktreePath,
			onSuccess: onRefresh,
		});

	const fetchMutation = electronTrpc.changes.fetch.useMutation({
		onSuccess: () => {
			toast.success("Fetched");
			onRefresh();
		},
		onError: (error) => toast.error(`Fetch failed: ${error.message}`),
	});

	const isPending =
		commitMutation.isPending ||
		pushMutation.isPending ||
		pullMutation.isPending ||
		syncMutation.isPending ||
		isCreateOrOpenPRPending ||
		fetchMutation.isPending;

	const trimmedCommitMessage = commitMessage.trim();
	const canSubmit = isAmendMode
		? Boolean(trimmedCommitMessage)
		: Boolean(hasStagedChanges && trimmedCommitMessage);
	const hasExistingPR = Boolean(pullRequest);
	const prUrl = pullRequest?.url;
	const pushActionCopy = getPushActionCopy({
		hasUpstream,
		pushCount,
		pullRequest,
	});

	useEffect(() => {
		if (!isAmendMode) {
			setIsAmendMessageLoading(false);
			return;
		}

		const requestId = amendRequestIdRef.current + 1;
		amendRequestIdRef.current = requestId;
		setIsAmendMessageLoading(true);

		void refetchHeadCommitMessage()
			.then((result) => {
				if (amendRequestIdRef.current !== requestId) {
					return;
				}

				if (result.error) {
					toast.error(`Failed to load previous commit: ${result.error.message}`);
					setIsAmendMode(false);
					return;
				}

				const message = result.data?.message ?? null;
				if (message === null) {
					toast.error("No previous commit found to amend");
					setIsAmendMode(false);
					return;
				}

				setCommitMessage(message);
			})
			.finally(() => {
				if (amendRequestIdRef.current === requestId) {
					setIsAmendMessageLoading(false);
				}
			});
	}, [isAmendMode, refetchHeadCommitMessage]);

	const handleAmendToggle = (checked: boolean) => {
		if (!checked) {
			amendRequestIdRef.current += 1;
			setIsAmendMessageLoading(false);
		}
		setIsAmendMode(checked);
	};

	const runCommit = (onSuccess?: () => void) => {
		if (!canSubmit) return;
		commitMutation.mutate(
			{
				worktreePath,
				message: trimmedCommitMessage,
				amend: isAmendMode,
			},
			onSuccess ? { onSuccess } : undefined,
		);
	};

	const triggerPush = ({
		forceWithLease = false,
		onSuccess,
		skipAutoCreatePR = false,
	}: {
		forceWithLease?: boolean;
		onSuccess?: () => void;
		skipAutoCreatePR?: boolean;
	} = {}) => {
		const isPublishing = !hasUpstream;
		pushMutation.mutate(
			{
				worktreePath,
				setUpstream: true,
				forceWithLease,
			},
			{
				onSuccess: () => {
					if (
						isPublishing &&
						!hasExistingPR &&
						shouldAutoCreatePRAfterPublish &&
						!skipAutoCreatePR
					) {
						createOrOpenPR();
					}
					onSuccess?.();
				},
			},
		);
	};

	const handleCommit = () => runCommit();
	const handlePush = () => triggerPush();
	const handlePull = () => pullMutation.mutate({ worktreePath });
	const handleSync = () => syncMutation.mutate({ worktreePath });
	const handleFetch = () => fetchMutation.mutate({ worktreePath });
	const handleFetchAndPull = () => {
		fetchMutation.mutate(
			{ worktreePath },
			{ onSuccess: () => pullMutation.mutate({ worktreePath }) },
		);
	};
	const handleCreatePR = () => {
		if (!canCreatePR) return;
		createOrOpenPR();
	};
	const handleOpenPR = () => prUrl && window.open(prUrl, "_blank");

	const handleCommitAndPush = () => {
		runCommit(() =>
			triggerPush({ forceWithLease: isAmendMode && hasUpstream }),
		);
	};

	const handleCommitPushAndCreatePR = () => {
		runCommit(() =>
			triggerPush({
				forceWithLease: isAmendMode && hasUpstream,
				onSuccess: handleCreatePR,
				skipAutoCreatePR: true,
			}),
		);
	};

	const primaryAction = getPrimaryAction({
		canSubmit,
		hasStagedChanges,
		isPending,
		isAmendMode,
		isAmendMessageLoading,
		pushCount,
		pullCount,
		hasUpstream,
		pushActionCopy,
	});

	const primary = {
		...primaryAction,
		icon:
			primaryAction.action === "commit" || primaryAction.action === "amend" ? (
				<VscCheck className="size-4" />
			) : primaryAction.action === "sync" ? (
				<VscSync className="size-4" />
			) : primaryAction.action === "pull" ? (
				<VscArrowDown className="size-4" />
			) : (
				<VscArrowUp className="size-4" />
			),
		handler:
			primaryAction.action === "commit" || primaryAction.action === "amend"
				? handleCommit
				: primaryAction.action === "sync"
					? handleSync
					: primaryAction.action === "pull"
						? handlePull
						: handlePush,
	};

	const submitLabel = isAmendMode ? "Amend" : "Commit";
	const submitWithPushLabel = isAmendMode ? "Amend & Push" : "Commit & Push";
	const submitWithPRLabel = isAmendMode
		? "Amend, Push & Create PR"
		: "Commit, Push & Create PR";
	const submitDisabled = !canSubmit || isAmendMessageLoading;

	const countBadge =
		pushCount > 0 || pullCount > 0
			? `${pullCount > 0 ? pullCount : ""}${pullCount > 0 && pushCount > 0 ? "/" : ""}${pushCount > 0 ? pushCount : ""}`
			: null;

	return (
		<div className="flex flex-col gap-1.5 px-2 py-2">
			<Textarea
				placeholder="Commit message"
				value={commitMessage}
				onChange={(e) => setCommitMessage(e.target.value)}
				className="min-h-[52px] resize-none bg-background text-[10px]"
				disabled={isAmendMessageLoading}
				onKeyDown={(e) => {
					if (
						e.key === "Enter" &&
						(e.metaKey || e.ctrlKey) &&
						!primary.disabled
					) {
						e.preventDefault();
						primary.handler();
					}
				}}
			/>
			<div className="flex items-center gap-1.5">
				<Checkbox
					id={`amend-commit-${worktreePath}`}
					checked={isAmendMode}
					onCheckedChange={(checked) => handleAmendToggle(checked === true)}
				/>
				<label
					htmlFor={`amend-commit-${worktreePath}`}
					className="cursor-pointer select-none text-[10px] text-muted-foreground"
				>
					Amend previous commit
				</label>
			</div>
			<ButtonGroup className="w-full">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="secondary"
							size="sm"
							className="h-7 flex-1 gap-1.5 text-xs"
							onClick={primary.handler}
							disabled={primary.disabled}
						>
							{primary.icon}
							<span>{primary.label}</span>
							{countBadge && (
								<span className="text-[10px] opacity-70">{countBadge}</span>
							)}
						</Button>
					</TooltipTrigger>
					<TooltipContent side="bottom">{primary.tooltip}</TooltipContent>
				</Tooltip>
				<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
					<DropdownMenuTrigger asChild>
						<Button
							variant="secondary"
							size="sm"
							disabled={isPending}
							className="h-7 px-1.5"
						>
							<VscChevronDown className="size-3.5" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-48 text-xs">
						<DropdownMenuItem
							onClick={handleCommit}
							disabled={submitDisabled}
							className="text-xs"
						>
							<VscCheck className="size-3.5" />
							{submitLabel}
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={handleCommitAndPush}
							disabled={submitDisabled}
							className="text-xs"
						>
							<VscArrowUp className="size-3.5" />
							{submitWithPushLabel}
						</DropdownMenuItem>
						{!hasExistingPR && canCreatePR && (
							<DropdownMenuItem
								onClick={handleCommitPushAndCreatePR}
								disabled={submitDisabled}
								className="text-xs"
							>
								<VscLinkExternal className="size-3.5" />
								{submitWithPRLabel}
							</DropdownMenuItem>
						)}

						<DropdownMenuSeparator />

						<DropdownMenuItem
							onClick={handlePush}
							disabled={pushCount === 0 && hasUpstream}
							className="text-xs"
						>
							<VscArrowUp className="size-3.5" />
							<span className="flex-1">{pushActionCopy.menuLabel}</span>
							{pushCount > 0 && (
								<span className="text-[10px] text-muted-foreground">
									{pushCount}
								</span>
							)}
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={handlePull}
							disabled={pullCount === 0}
							className="text-xs"
						>
							<VscArrowDown className="size-3.5" />
							<span className="flex-1">Pull</span>
							{pullCount > 0 && (
								<span className="text-[10px] text-muted-foreground">
									{pullCount}
								</span>
							)}
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={handleSync}
							disabled={pushCount === 0 && pullCount === 0}
							className="text-xs"
						>
							<VscSync className="size-3.5" />
							Sync
						</DropdownMenuItem>
						<DropdownMenuItem onClick={handleFetch} className="text-xs">
							<VscRefresh className="size-3.5" />
							Fetch
						</DropdownMenuItem>
						<DropdownMenuItem onClick={handleFetchAndPull} className="text-xs">
							<VscRefresh className="size-3.5" />
							Fetch & Pull
						</DropdownMenuItem>

						<DropdownMenuSeparator />

						{hasExistingPR ? (
							<DropdownMenuItem onClick={handleOpenPR} className="text-xs">
								<VscLinkExternal className="size-3.5" />
								Open Pull Request
							</DropdownMenuItem>
						) : canCreatePR ? (
							<DropdownMenuItem onClick={handleCreatePR} className="text-xs">
								<VscLinkExternal className="size-3.5" />
								Create Pull Request
							</DropdownMenuItem>
						) : null}
					</DropdownMenuContent>
				</DropdownMenu>
			</ButtonGroup>
		</div>
	);
}
