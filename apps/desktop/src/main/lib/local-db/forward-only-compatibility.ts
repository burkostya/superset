type SqliteTableInfoRow = {
	name: string;
};

type SqliteCompatStatement<Result> = {
	all(...params: unknown[]): Result[];
};

export type SqliteCompatDb = {
	prepare<Result = unknown>(
		source: string,
	): SqliteCompatStatement<Result>;
	exec(source: string): unknown;
};

type SchemaRepair = {
	id: string;
	description: string;
	apply(db: SqliteCompatDb): boolean;
};

function listTableColumns(db: SqliteCompatDb, tableName: string): string[] {
	return db
		.prepare<SqliteTableInfoRow>(`PRAGMA table_info(\`${tableName}\`)`)
		.all()
		.map((column) => column.name);
}

function addColumnIfMissing(
	db: SqliteCompatDb,
	options: {
		tableName: string;
		columnName: string;
		sql: string;
	},
): boolean {
	const columns = listTableColumns(db, options.tableName);
	if (columns.length === 0 || columns.includes(options.columnName)) {
		return false;
	}

	db.exec(options.sql);
	return true;
}

const FORWARD_ONLY_REPAIRS: SchemaRepair[] = [
	{
		id: "worktrees.created_by_superset",
		description:
			"Repair legacy fork databases that shipped chat_sessions before upstream added worktrees.created_by_superset.",
		apply: (db) =>
			addColumnIfMissing(db, {
				tableName: "worktrees",
				columnName: "created_by_superset",
				sql: "ALTER TABLE `worktrees` ADD `created_by_superset` integer DEFAULT true NOT NULL;",
			}),
	},
];

export function ensureLocalDbForwardOnlyCompatibility(
	db: SqliteCompatDb,
	logger: Pick<Console, "log"> = console,
): void {
	for (const repair of FORWARD_ONLY_REPAIRS) {
		const applied = repair.apply(db);
		if (!applied) continue;

		logger.log(
			`[local-db] Applied forward-only schema repair: ${repair.id} (${repair.description})`,
		);
	}
}
