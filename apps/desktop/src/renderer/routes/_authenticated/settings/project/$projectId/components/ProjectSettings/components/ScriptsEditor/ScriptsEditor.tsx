import { Button } from "@superset/ui/button";
import { Input } from "@superset/ui/input";
import { Label } from "@superset/ui/label";
import { Switch } from "@superset/ui/switch";
import { cn } from "@superset/ui/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	HiArrowTopRightOnSquare,
	HiCheckCircle,
	HiDocumentArrowUp,
	HiPlus,
	HiTrash,
} from "react-icons/hi2";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { invalidateProjectScriptQueries } from "renderer/lib/project-scripts";
import { EXTERNAL_LINKS } from "shared/constants";
import type { WorkspaceCopyRule } from "shared/types/config";
import { buildCopyPayload, parseContentFromConfig } from "./utils";

interface ScriptsEditorProps {
	projectId: string;
	className?: string;
}

interface ScriptTextareaProps {
	title: string;
	description: string;
	placeholder: string;
	value: string;
	onChange: (value: string) => void;
	onBlur?: () => void;
}

function ScriptTextarea({
	title,
	description,
	placeholder,
	value,
	onChange,
	onBlur,
}: ScriptTextareaProps) {
	const [isDragOver, setIsDragOver] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const importFirstFile = useCallback(
		async (files: File[]) => {
			const scriptFile = files.find((file) =>
				file.name.match(/\.(sh|bash|zsh|command)$/i),
			);
			if (!scriptFile) {
				return;
			}

			try {
				const content = await scriptFile.text();
				onChange(content);
			} catch (error) {
				console.error("[scripts/import] Failed to read file:", error);
			}
		},
		[onChange],
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
	}, []);

	const handleDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragOver(false);

			await importFirstFile(Array.from(e.dataTransfer.files));
		},
		[importFirstFile],
	);

	const handleFileInputChange = useCallback(
		async (event: React.ChangeEvent<HTMLInputElement>) => {
			const files = event.target.files ? Array.from(event.target.files) : [];
			await importFirstFile(files);
			// Reset value so re-selecting the same file triggers onChange again.
			event.target.value = "";
		},
		[importFirstFile],
	);

	return (
		<div className="space-y-2">
			<div>
				<h4 className="text-sm font-medium">{title}</h4>
				<p className="text-xs text-muted-foreground mt-0.5">{description}</p>
			</div>

			{/* biome-ignore lint/a11y/useSemanticElements: Drop zone wrapper for drag-and-drop functionality */}
			<div
				role="region"
				aria-label={`${title} script editor with file drop support`}
				className={cn(
					"relative rounded-lg border transition-colors",
					isDragOver
						? "border-primary bg-primary/5"
						: "border-border hover:border-border/80",
				)}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			>
				<textarea
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onBlur={onBlur}
					placeholder={placeholder}
					className="w-full min-h-[80px] p-3 text-sm font-mono bg-transparent resize-y focus:outline-none focus:ring-1 focus:ring-ring rounded-lg"
					rows={3}
				/>
				{isDragOver && (
					<div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-lg pointer-events-none">
						<div className="flex items-center gap-2 text-primary text-sm font-medium">
							<HiDocumentArrowUp className="h-5 w-5" />
							Drop to import
						</div>
					</div>
				)}
			</div>

			<Button
				variant="ghost"
				size="sm"
				onClick={() => fileInputRef.current?.click()}
				className="gap-1.5 text-muted-foreground"
			>
				<HiDocumentArrowUp className="h-3.5 w-3.5" />
				Import file
			</Button>
			<input
				ref={fileInputRef}
				type="file"
				accept=".sh,.bash,.zsh,.command"
				onChange={handleFileInputChange}
				className="hidden"
			/>
		</div>
	);
}

type SaveStatus = "idle" | "saving" | "saved";

const EMPTY_COPY_RULE: WorkspaceCopyRule = {
	source: "",
	target: "",
	optional: false,
	overwrite: false,
};

interface CopyRuleRowProps {
	rule: WorkspaceCopyRule;
	isOnlyRow: boolean;
	onChange: (nextRule: WorkspaceCopyRule) => void;
	onRemove: () => void;
	onBlur: () => void;
}

function CopyRuleRow({
	rule,
	isOnlyRow,
	onChange,
	onRemove,
	onBlur,
}: CopyRuleRowProps) {
	return (
		<div className="rounded-lg border border-border p-3 space-y-3">
			<div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
				<div className="space-y-1.5">
					<Label className="text-xs text-muted-foreground">Source</Label>
					<Input
						value={rule.source}
						onChange={(e) => onChange({ ...rule, source: e.target.value })}
						onBlur={onBlur}
						placeholder=".env or .cursor"
					/>
				</div>
				<div className="space-y-1.5">
					<Label className="text-xs text-muted-foreground">Target</Label>
					<Input
						value={rule.target ?? ""}
						onChange={(e) => onChange({ ...rule, target: e.target.value })}
						onBlur={onBlur}
						placeholder="Optional. Defaults to source path"
					/>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					onClick={onRemove}
					disabled={isOnlyRow}
					aria-label="Remove copy rule"
					className="shrink-0"
				>
					<HiTrash className="h-4 w-4" />
				</Button>
			</div>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
				<div className="flex items-center justify-between gap-3 sm:justify-start">
					<div className="space-y-0.5">
						<Label className="text-sm font-medium">Optional</Label>
						<p className="text-xs text-muted-foreground">
							Skip this copy if the source does not exist.
						</p>
					</div>
					<Switch
						checked={rule.optional ?? false}
						onCheckedChange={(optional) => onChange({ ...rule, optional })}
					/>
				</div>
				<div className="flex items-center justify-between gap-3 sm:justify-start">
					<div className="space-y-0.5">
						<Label className="text-sm font-medium">Overwrite</Label>
						<p className="text-xs text-muted-foreground">
							Replace the target if it already exists in the workspace.
						</p>
					</div>
					<Switch
						checked={rule.overwrite ?? false}
						onCheckedChange={(overwrite) => onChange({ ...rule, overwrite })}
					/>
				</div>
			</div>
		</div>
	);
}

export function ScriptsEditor({ projectId, className }: ScriptsEditorProps) {
	const utils = electronTrpc.useUtils();

	const { data: configData, isLoading } =
		electronTrpc.config.getConfigContent.useQuery(
			{ projectId },
			{ enabled: !!projectId },
		);

	const [setupContent, setSetupContent] = useState("");
	const [teardownContent, setTeardownContent] = useState("");
	const [runContent, setRunContent] = useState("");
	const [copyRules, setCopyRules] = useState<WorkspaceCopyRule[]>([
		EMPTY_COPY_RULE,
	]);
	const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
	const latestContentRef = useRef({
		setup: "",
		teardown: "",
		run: "",
		copy: [EMPTY_COPY_RULE] as WorkspaceCopyRule[],
	});
	const lastSavedPayloadRef = useRef(
		'{"setup":[],"teardown":[],"run":[],"copy":[]}',
	);
	const saveInFlightRef = useRef(false);
	const saveQueuedRef = useRef(false);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
	const savedTimerRef = useRef<NodeJS.Timeout | null>(null);

	latestContentRef.current = {
		setup: setupContent,
		teardown: teardownContent,
		run: runContent,
		copy: copyRules,
	};

	const buildPayload = useCallback(
		(content: {
			setup: string;
			teardown: string;
			run: string;
			copy: WorkspaceCopyRule[];
		}) => ({
			projectId,
			setup: content.setup.trim() ? [content.setup.trim()] : [],
			teardown: content.teardown.trim() ? [content.teardown.trim()] : [],
			run: content.run.trim() ? [content.run.trim()] : [],
			copy: buildCopyPayload(content.copy),
		}),
		[projectId],
	);

	const serializePayload = useCallback(
		(payload: {
			setup: string[];
			teardown: string[];
			run: string[];
			copy: WorkspaceCopyRule[];
		}) =>
			JSON.stringify(payload),
		[],
	);

	useEffect(() => {
		// Don't overwrite local state if there are pending unsaved changes
		// This prevents race conditions where server data overwrites user edits
		if (debounceTimerRef.current || saveInFlightRef.current) {
			return;
		}

		const parsed = parseContentFromConfig(configData?.content ?? null);
		setSetupContent(parsed.setup);
		setTeardownContent(parsed.teardown);
		setRunContent(parsed.run);
		setCopyRules(parsed.copy.length > 0 ? parsed.copy : [EMPTY_COPY_RULE]);
		lastSavedPayloadRef.current = serializePayload(
			buildPayload({
				setup: parsed.setup,
				teardown: parsed.teardown,
				run: parsed.run,
				copy: parsed.copy,
			}),
		);
	}, [buildPayload, configData?.content, serializePayload]);

	const updateConfigMutation = electronTrpc.config.updateConfig.useMutation();

	const handleSave = useCallback(async () => {
		if (saveInFlightRef.current) {
			saveQueuedRef.current = true;
			return;
		}

		// Clear any existing saved timer before starting a new save
		if (savedTimerRef.current) {
			clearTimeout(savedTimerRef.current);
			savedTimerRef.current = null;
		}

		saveInFlightRef.current = true;
		setSaveStatus("saving");
		try {
			do {
				saveQueuedRef.current = false;
				const payload = buildPayload(latestContentRef.current);
				const serializedPayload = serializePayload(payload);

				if (serializedPayload === lastSavedPayloadRef.current) {
					continue;
				}

				await updateConfigMutation.mutateAsync(payload);
				lastSavedPayloadRef.current = serializedPayload;
				await invalidateProjectScriptQueries(utils, projectId);
			} while (saveQueuedRef.current);
			setSaveStatus("saved");
			// Reset to idle after showing "saved" for 2 seconds
			savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
		} catch (error) {
			console.error("[scripts/save] Failed to save:", error);
			// Clear saved timer on error
			if (savedTimerRef.current) {
				clearTimeout(savedTimerRef.current);
				savedTimerRef.current = null;
			}
			setSaveStatus("idle");
		} finally {
			saveInFlightRef.current = false;
		}
	}, [buildPayload, updateConfigMutation, projectId, serializePayload, utils]);

	const debouncedSave = useCallback(() => {
		// Clear any existing timer
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
			debounceTimerRef.current = null;
		}

		// Set new timer to save after 500ms of no changes
		debounceTimerRef.current = setTimeout(() => {
			debounceTimerRef.current = null;
			void handleSave();
		}, 500);
	}, [handleSave]);

	const handleBlurSave = useCallback(() => {
		// Cancel any pending debounce timer to avoid duplicate saves
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
			debounceTimerRef.current = null;
		}
		void handleSave();
	}, [handleSave]);

	// Cleanup timers on unmount
	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
			if (savedTimerRef.current) {
				clearTimeout(savedTimerRef.current);
			}
		};
	}, []);

	const handleSetupChange = useCallback(
		(value: string) => {
			setSetupContent(value);
			debouncedSave();
		},
		[debouncedSave],
	);

	const handleTeardownChange = useCallback(
		(value: string) => {
			setTeardownContent(value);
			debouncedSave();
		},
		[debouncedSave],
	);

	const handleRunChange = useCallback(
		(value: string) => {
			setRunContent(value);
			debouncedSave();
		},
		[debouncedSave],
	);

	const handleCopyRuleChange = useCallback(
		(index: number, nextRule: WorkspaceCopyRule) => {
			setCopyRules((currentRules) => {
				const nextRules = currentRules.map((rule, currentIndex) =>
					currentIndex === index ? nextRule : rule,
				);
				return nextRules;
			});
			debouncedSave();
		},
		[debouncedSave],
	);

	const handleAddCopyRule = useCallback(() => {
		setCopyRules((currentRules) => [...currentRules, EMPTY_COPY_RULE]);
		debouncedSave();
	}, [debouncedSave]);

	const handleRemoveCopyRule = useCallback(
		(index: number) => {
			setCopyRules((currentRules) => {
				if (currentRules.length === 1) {
					return [EMPTY_COPY_RULE];
				}
				return currentRules.filter((_, currentIndex) => currentIndex !== index);
			});
			debouncedSave();
		},
		[debouncedSave],
	);

	if (isLoading) {
		return (
			<div className={cn("space-y-4", className)}>
				<div className="h-24 bg-muted/30 rounded-lg animate-pulse" />
			</div>
		);
	}

	return (
		<div className={cn("space-y-5", className)}>
			<div className="flex items-start justify-between">
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<h3 className="text-base font-semibold text-foreground">Scripts</h3>
						{saveStatus === "saving" && (
							<span className="text-xs text-muted-foreground flex items-center gap-1">
								<span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
								Saving...
							</span>
						)}
						{saveStatus === "saved" && (
							<span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
								<HiCheckCircle className="h-3.5 w-3.5" />
								Saved
							</span>
						)}
					</div>
					<p className="text-sm text-muted-foreground">
						Automate workspace setup, bootstrap file copies, teardown, and run
						commands. Changes are saved automatically.
					</p>
				</div>
				<Button variant="outline" size="sm" asChild>
					<a
						href={EXTERNAL_LINKS.SETUP_TEARDOWN_SCRIPTS}
						target="_blank"
						rel="noopener noreferrer"
					>
						Get started with setup scripts
						<HiArrowTopRightOnSquare className="h-3.5 w-3.5" />
					</a>
				</Button>
			</div>

			<ScriptTextarea
				title="Setup"
				description="Runs when a new workspace is created."
				placeholder="e.g. bun install && bun run dev"
				value={setupContent}
				onChange={handleSetupChange}
				onBlur={handleBlurSave}
			/>

			<ScriptTextarea
				title="Teardown"
				description="Runs when a workspace is deleted."
				placeholder="e.g. docker compose down"
				value={teardownContent}
				onChange={handleTeardownChange}
				onBlur={handleBlurSave}
			/>

			<ScriptTextarea
				title="Run"
				description="A command to start your dev server, triggered via keyboard shortcut."
				placeholder="e.g. bun run dev"
				value={runContent}
				onChange={handleRunChange}
				onBlur={handleBlurSave}
			/>

			<div className="space-y-3">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h4 className="text-sm font-medium">Copy to Workspace</h4>
						<p className="text-xs text-muted-foreground mt-0.5">
							Copy files or directories from the main repo into each workspace
							before setup runs. Leave target blank to reuse the source path.
						</p>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={handleAddCopyRule}
						className="gap-1.5"
					>
						<HiPlus className="h-3.5 w-3.5" />
						Add rule
					</Button>
				</div>

				<div className="space-y-3">
					{copyRules.map((rule, index) => (
						<CopyRuleRow
							key={`copy-rule-${index}-${rule.source}-${rule.target ?? ""}`}
							rule={rule}
							isOnlyRow={copyRules.length === 1}
							onChange={(nextRule) => handleCopyRuleChange(index, nextRule)}
							onRemove={() => handleRemoveCopyRule(index)}
							onBlur={handleBlurSave}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
