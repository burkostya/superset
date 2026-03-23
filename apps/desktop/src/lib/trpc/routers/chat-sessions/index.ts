import { chatSessions } from "@superset/local-db";
import { desc, eq, isNull, or, sql } from "drizzle-orm";
import { localDb } from "main/lib/local-db";
import { z } from "zod";
import { publicProcedure, router } from "../..";

export function listLocalChatSessions(workspaceId?: string | null) {
	const query = localDb.select().from(chatSessions);

	if (workspaceId) {
		return query
			.where(
				or(
					eq(chatSessions.workspaceId, workspaceId),
					isNull(chatSessions.workspaceId),
				),
			)
			.orderBy(desc(chatSessions.lastActiveAt))
			.all();
	}

	return query.orderBy(desc(chatSessions.lastActiveAt)).all();
}

export function upsertLocalChatSession(input: {
	id: string;
	workspaceId?: string | null;
	title?: string | null;
}) {
	const now = Date.now();
	const updateSet: {
		workspaceId: string | null;
		updatedAt: number;
		lastActiveAt: number;
		title?: string | null;
	} = {
		workspaceId: input.workspaceId ?? null,
		updatedAt: now,
		lastActiveAt: now,
	};
	if (input.title !== undefined) {
		updateSet.title = input.title;
	}

	localDb
		.insert(chatSessions)
		.values({
			id: input.id,
			workspaceId: input.workspaceId ?? null,
			title: input.title ?? null,
			createdAt: now,
			updatedAt: now,
			lastActiveAt: now,
		})
		.onConflictDoUpdate({
			target: chatSessions.id,
			set: updateSet,
		})
		.run();
}

export function updateLocalChatSessionTitle(input: {
	id: string;
	title: string;
}) {
	const now = Date.now();
	localDb
		.update(chatSessions)
		.set({
			title: input.title.trim(),
			updatedAt: now,
			lastActiveAt: now,
		})
		.where(eq(chatSessions.id, input.id))
		.run();
}

export function deleteLocalChatSession(input: { id: string }) {
	localDb.delete(chatSessions).where(eq(chatSessions.id, input.id)).run();
}

export const createChatSessionsRouter = () => {
	return router({
		list: publicProcedure
			.input(
				z
					.object({
						workspaceId: z.string().nullable().optional(),
					})
					.optional(),
			)
			.query(({ input }) => {
				return listLocalChatSessions(input?.workspaceId);
			}),

		upsert: publicProcedure
			.input(
				z.object({
					id: z.string().uuid(),
					workspaceId: z.string().nullable().optional(),
					title: z.string().nullable().optional(),
				}),
			)
			.mutation(({ input }) => {
				upsertLocalChatSession(input);
				return localDb
					.select()
					.from(chatSessions)
					.where(eq(chatSessions.id, input.id))
					.get();
			}),

		updateTitle: publicProcedure
			.input(
				z.object({
					id: z.string().uuid(),
					title: z.string().min(1),
				}),
			)
			.mutation(({ input }) => {
				updateLocalChatSessionTitle(input);
				return { success: true };
			}),

		remove: publicProcedure
			.input(
				z.object({
					id: z.string().uuid(),
				}),
			)
			.mutation(({ input }) => {
				deleteLocalChatSession(input);
				return { success: true };
			}),

		clear: publicProcedure.mutation(() => {
			localDb.delete(chatSessions).run();
			return { success: true };
		}),

		getStats: publicProcedure.query(() => {
			const [row] = localDb
				.select({ count: sql<number>`count(*)` })
				.from(chatSessions)
				.all();
			return { count: row?.count ?? 0 };
		}),
	});
};
