import { Button } from "@superset/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@superset/ui/dialog";
import { Input } from "@superset/ui/input";
import { Label } from "@superset/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@superset/ui/select";
import { Switch } from "@superset/ui/switch";
import { Textarea } from "@superset/ui/textarea";
import { toast } from "@superset/ui/sonner";
import { useEffect, useMemo, useState } from "react";
import { electronTrpc } from "renderer/lib/electron-trpc";
import type { ResolvedAgentConfig } from "shared/utils/agent-settings";

interface CustomAgentFormState {
	templateId: string;
	label: string;
	description: string;
	command: string;
	promptCommand: string;
	promptCommandSuffix: string;
	taskPromptTemplate: string;
	enabled: boolean;
}

interface AddCustomAgentDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	agents: ResolvedAgentConfig[];
}

function createStateFromTemplate(
	template: ResolvedAgentConfig,
): CustomAgentFormState {
	if (template.kind !== "terminal") {
		throw new Error(`Agent "${template.id}" is not a terminal agent`);
	}

	return {
		templateId: template.id,
		label: `${template.label} Copy`,
		description: template.description ?? "",
		command: template.command,
		promptCommand: template.promptCommand,
		promptCommandSuffix: template.promptCommandSuffix ?? "",
		taskPromptTemplate: template.taskPromptTemplate,
		enabled: template.enabled,
	};
}

export function AddCustomAgentDialog({
	open,
	onOpenChange,
	agents,
}: AddCustomAgentDialogProps) {
	const utils = electronTrpc.useUtils();
	const createCustomAgent = electronTrpc.settings.createCustomAgent.useMutation({
		onSuccess: async () => {
			await utils.settings.getAgentPresets.invalidate();
		},
	});
	const terminalAgents = useMemo(
		() => agents.filter((agent) => agent.kind === "terminal"),
		[agents],
	);
	const defaultTemplate = useMemo(
		() =>
			terminalAgents.find((agent) => agent.id === "codex") ?? terminalAgents[0],
		[terminalAgents],
	);
	const [form, setForm] = useState<CustomAgentFormState | null>(null);

	useEffect(() => {
		if (!open || !defaultTemplate) {
			return;
		}
		setForm(createStateFromTemplate(defaultTemplate));
	}, [defaultTemplate, open]);

	const updateField = <TField extends keyof CustomAgentFormState>(
		field: TField,
		value: CustomAgentFormState[TField],
	) => {
		setForm((current) => (current ? { ...current, [field]: value } : current));
	};

	const handleTemplateChange = (templateId: string) => {
		const template = terminalAgents.find((agent) => agent.id === templateId);
		if (!template) {
			return;
		}
		setForm(createStateFromTemplate(template));
	};

	const handleCreate = async () => {
		if (!form) {
			return;
		}

		try {
			await createCustomAgent.mutateAsync({
				label: form.label,
				description: form.description,
				command: form.command,
				promptCommand: form.promptCommand,
				promptCommandSuffix: form.promptCommandSuffix,
				taskPromptTemplate: form.taskPromptTemplate,
				enabled: form.enabled,
			});
			toast.success(`${form.label.trim() || "Custom agent"} created`);
			onOpenChange(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to create agent",
			);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Add Agent</DialogTitle>
					<DialogDescription>
						Create a reusable terminal agent by duplicating an existing preset
						and customizing its launch commands.
					</DialogDescription>
				</DialogHeader>
				{!defaultTemplate || !form ? (
					<p className="text-sm text-muted-foreground">
						No terminal agent template available.
					</p>
				) : (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="custom-agent-template">Duplicate from</Label>
							<Select
								value={form.templateId}
								onValueChange={handleTemplateChange}
								disabled={createCustomAgent.isPending}
							>
								<SelectTrigger id="custom-agent-template">
									<SelectValue placeholder="Select a template" />
								</SelectTrigger>
								<SelectContent>
									{terminalAgents.map((agent) => (
										<SelectItem key={agent.id} value={agent.id}>
											{agent.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="custom-agent-label">Label</Label>
								<Input
									id="custom-agent-label"
									value={form.label}
									onChange={(event) => updateField("label", event.target.value)}
									disabled={createCustomAgent.isPending}
								/>
							</div>
							<div className="flex items-end justify-between rounded-md border px-3 py-2">
								<div className="space-y-0.5">
									<Label htmlFor="custom-agent-enabled">Enabled</Label>
									<p className="text-xs text-muted-foreground">
										Show this agent in workspace launchers.
									</p>
								</div>
								<Switch
									id="custom-agent-enabled"
									checked={form.enabled}
									onCheckedChange={(checked) => updateField("enabled", checked)}
									disabled={createCustomAgent.isPending}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="custom-agent-description">Description</Label>
							<Input
								id="custom-agent-description"
								value={form.description}
								onChange={(event) =>
									updateField("description", event.target.value)
								}
								disabled={createCustomAgent.isPending}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="custom-agent-command">Command (No Prompt)</Label>
							<Input
								id="custom-agent-command"
								value={form.command}
								onChange={(event) =>
									updateField("command", event.target.value)
								}
								disabled={createCustomAgent.isPending}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="custom-agent-prompt-command">Prompt Command</Label>
							<Input
								id="custom-agent-prompt-command"
								value={form.promptCommand}
								onChange={(event) =>
									updateField("promptCommand", event.target.value)
								}
								disabled={createCustomAgent.isPending}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="custom-agent-prompt-command-suffix">
								Prompt Command Suffix
							</Label>
							<Input
								id="custom-agent-prompt-command-suffix"
								value={form.promptCommandSuffix}
								onChange={(event) =>
									updateField("promptCommandSuffix", event.target.value)
								}
								disabled={createCustomAgent.isPending}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="custom-agent-task-template">
								Task Prompt Template
							</Label>
							<Textarea
								id="custom-agent-task-template"
								value={form.taskPromptTemplate}
								onChange={(event) =>
									updateField("taskPromptTemplate", event.target.value)
								}
								className="min-h-28"
								disabled={createCustomAgent.isPending}
							/>
						</div>
					</div>
				)}
				<DialogFooter>
					<Button
						variant="ghost"
						onClick={() => onOpenChange(false)}
						disabled={createCustomAgent.isPending}
					>
						Cancel
					</Button>
					<Button
						onClick={() => void handleCreate()}
						disabled={
							createCustomAgent.isPending || !defaultTemplate || form === null
						}
					>
						Create Agent
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
