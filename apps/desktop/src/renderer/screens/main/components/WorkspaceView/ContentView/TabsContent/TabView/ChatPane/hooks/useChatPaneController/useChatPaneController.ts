import { toast } from "@superset/ui/sonner";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StartFreshSessionResult } from "renderer/components/Chat/ChatInterface/types";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { useTabsStore } from "renderer/stores/tabs/store";
import type { ChatLaunchConfig } from "shared/tabs-types";
import { reportChatError } from "../../utils/reportChatError";

interface SessionSelectorItem {
	sessionId: string;
	title: string;
	updatedAt: Date;
}

interface UseChatPaneControllerOptions {
	paneId: string;
	workspaceId: string;
}

interface UseChatPaneControllerReturn {
	sessionId: string | null;
	launchConfig: ChatLaunchConfig | null;
	organizationId: string | null;
	workspacePath: string;
	isSessionInitializing: boolean;
	hasCurrentSessionRecord: boolean;
	sessionItems: SessionSelectorItem[];
	handleSelectSession: (sessionId: string) => void;
	handleNewChat: () => Promise<void>;
	handleStartFreshSession: () => Promise<StartFreshSessionResult>;
	handleDeleteSession: (sessionId: string) => Promise<void>;
	ensureCurrentSessionRecord: () => Promise<boolean>;
	consumeLaunchConfig: () => void;
}

function toSessionSelectorItem(session: {
	id: string;
	title: string | null;
	lastActiveAt: number;
	createdAt: number;
}): SessionSelectorItem {
	return {
		sessionId: session.id,
		title: session.title ?? "",
		updatedAt: new Date(session.lastActiveAt || session.createdAt),
	};
}

export function useChatPaneController({
	paneId,
	workspaceId,
}: UseChatPaneControllerOptions): UseChatPaneControllerReturn {
	const pane = useTabsStore((state) => state.panes[paneId]);
	const switchChatSession = useTabsStore((state) => state.switchChatSession);
	const setChatLaunchConfig = useTabsStore(
		(state) => state.setChatLaunchConfig,
	);
	const sessionId = pane?.chat?.sessionId ?? null;
	const launchConfig = pane?.chat?.launchConfig ?? null;
	const needsLegacySessionBootstrap = sessionId === null;
	const legacySessionBootstrapRef = useRef(false);
	const [isSessionInitializing, setIsSessionInitializing] = useState(false);

	const { data: workspace } = electronTrpc.workspaces.get.useQuery(
		{ id: workspaceId },
		{ enabled: Boolean(workspaceId) },
	);
	const { data: sessionsData = [] } = electronTrpc.chatSessions.list.useQuery({
		workspaceId,
	});
	const upsertSession = electronTrpc.chatSessions.upsert.useMutation();
	const removeSession = electronTrpc.chatSessions.remove.useMutation();

	const sessions = useMemo(() => sessionsData ?? [], [sessionsData]);
	const hasCurrentSessionRecord = Boolean(
		sessionId && sessions.some((item) => item.id === sessionId),
	);

	const ensureSession = useCallback(
		async (targetSessionId: string): Promise<boolean> => {
			setIsSessionInitializing(true);
			try {
				await upsertSession.mutateAsync({
					id: targetSessionId,
					workspaceId,
				});
				return true;
			} catch (error) {
				reportChatError({
					operation: "session.ensure.local",
					error,
					sessionId: targetSessionId,
					workspaceId,
					paneId,
					cwd: workspace?.worktreePath ?? undefined,
				});
				return false;
			} finally {
				setIsSessionInitializing(false);
			}
		},
		[paneId, upsertSession, workspace?.worktreePath, workspaceId],
	);

	const handleSelectSession = useCallback(
		(nextSessionId: string) => {
			switchChatSession(paneId, nextSessionId);
		},
		[paneId, switchChatSession],
	);

	const createAndActivateSession = useCallback(
		async (newSessionId: string): Promise<StartFreshSessionResult> => {
			const created = await ensureSession(newSessionId);
			if (!created) {
				return {
					created: false,
					errorMessage: "Failed to create a local chat session",
				};
			}

			switchChatSession(paneId, newSessionId);
			return { created: true, sessionId: newSessionId };
		},
		[ensureSession, paneId, switchChatSession],
	);

	const handleNewChat = useCallback(async () => {
		const createResult = await createAndActivateSession(crypto.randomUUID());
		if (!createResult.created) {
			toast.error(createResult.errorMessage ?? "Failed to create chat session");
		}
	}, [createAndActivateSession]);

	const handleStartFreshSession = useCallback(async () => {
		return createAndActivateSession(crypto.randomUUID());
	}, [createAndActivateSession]);

	const handleDeleteSession = useCallback(
		async (sessionIdToDelete: string) => {
			try {
				await removeSession.mutateAsync({ id: sessionIdToDelete });
				if (sessionIdToDelete === sessionId) {
					switchChatSession(paneId, null);
				}
			} catch (error) {
				reportChatError({
					operation: "session.delete.local",
					error,
					sessionId: sessionIdToDelete,
					workspaceId,
					paneId,
					cwd: workspace?.worktreePath ?? undefined,
				});
				throw error;
			}
		},
		[paneId, removeSession, sessionId, switchChatSession, workspace?.worktreePath, workspaceId],
	);

	const ensureCurrentSessionRecord = useCallback(async (): Promise<boolean> => {
		if (!sessionId) return false;
		if (hasCurrentSessionRecord) return true;
		return ensureSession(sessionId);
	}, [ensureSession, hasCurrentSessionRecord, sessionId]);

	useEffect(() => {
		if (!needsLegacySessionBootstrap) return;
		if (legacySessionBootstrapRef.current) return;
		legacySessionBootstrapRef.current = true;

		void handleNewChat()
			.catch(() => {})
			.finally(() => {
				legacySessionBootstrapRef.current = false;
			});
	}, [handleNewChat, needsLegacySessionBootstrap]);

	const sessionItems = useMemo(
		() => sessions.map((item) => toSessionSelectorItem(item)),
		[sessions],
	);

	const consumeLaunchConfig = useCallback(() => {
		setChatLaunchConfig(paneId, null);
	}, [paneId, setChatLaunchConfig]);

	return {
		sessionId,
		launchConfig,
		organizationId: null,
		workspacePath: workspace?.worktreePath ?? "",
		isSessionInitializing,
		hasCurrentSessionRecord,
		sessionItems,
		handleSelectSession,
		handleNewChat,
		handleStartFreshSession,
		handleDeleteSession,
		ensureCurrentSessionRecord,
		consumeLaunchConfig,
	};
}
