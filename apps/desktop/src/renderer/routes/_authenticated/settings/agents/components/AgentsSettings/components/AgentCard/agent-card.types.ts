import type { ResolvedAgentConfig } from "shared/utils/agent-settings";

export interface AgentCardProps {
	preset: ResolvedAgentConfig;
	showEnabled: boolean;
	showCommands: boolean;
	showTaskPrompts: boolean;
}

export interface AgentCardActionsProps {
	isPending: boolean;
	canDelete: boolean;
	onReset: () => void;
	onDelete: () => void;
}

export type AgentEditableField =
	| "label"
	| "description"
	| "command"
	| "promptCommand"
	| "promptCommandSuffix"
	| "taskPromptTemplate"
	| "model";
