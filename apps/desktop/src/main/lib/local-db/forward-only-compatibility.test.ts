import { describe, expect, it, mock } from "bun:test";
import {
	ensureLocalDbForwardOnlyCompatibility,
	type SqliteCompatDb,
} from "./forward-only-compatibility";

function createDbWithColumns(
	tables: Record<string, string[]>,
	exec = mock((_sql: string) => undefined),
): SqliteCompatDb {
	return {
		prepare: (source: string) => ({
			all: () => {
				const match = source.match(/PRAGMA table_info\(`(.+?)`\)/);
				const tableName = match?.[1];
				const columns = tableName ? tables[tableName] ?? [] : [];
				return columns.map((name) => ({ name }));
			},
		}),
		exec,
	};
}

describe("ensureLocalDbForwardOnlyCompatibility", () => {
	it("does nothing when the legacy table does not exist yet", () => {
		const exec = mock((_sql: string) => undefined);
		const logger = { log: mock((_message: string) => undefined) };
		const db = createDbWithColumns({}, exec);

		ensureLocalDbForwardOnlyCompatibility(db, logger);

		expect(exec).not.toHaveBeenCalled();
		expect(logger.log).not.toHaveBeenCalled();
	});

	it("does nothing when the required column is already present", () => {
		const exec = mock((_sql: string) => undefined);
		const logger = { log: mock((_message: string) => undefined) };
		const db = createDbWithColumns(
			{
				worktrees: ["id", "branch", "created_by_superset"],
			},
			exec,
		);

		ensureLocalDbForwardOnlyCompatibility(db, logger);

		expect(exec).not.toHaveBeenCalled();
		expect(logger.log).not.toHaveBeenCalled();
	});

	it("repairs legacy fork databases missing created_by_superset", () => {
		const exec = mock((_sql: string) => undefined);
		const logger = { log: mock((_message: string) => undefined) };
		const db = createDbWithColumns(
			{
				worktrees: ["id", "branch"],
			},
			exec,
		);

		ensureLocalDbForwardOnlyCompatibility(db, logger);

		expect(exec).toHaveBeenCalledWith(
			"ALTER TABLE `worktrees` ADD `created_by_superset` integer DEFAULT true NOT NULL;",
		);
		expect(logger.log).toHaveBeenCalledTimes(1);
		expect(logger.log.mock.calls[0]?.[0]).toContain(
			"worktrees.created_by_superset",
		);
	});
});

