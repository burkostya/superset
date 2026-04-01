import { Button } from "@superset/ui/button";
import { CardFooter } from "@superset/ui/card";
import type { AgentCardActionsProps } from "../../agent-card.types";

export function AgentCardActions({
	isPending,
	canDelete,
	onReset,
	onDelete,
}: AgentCardActionsProps) {
	return (
		<CardFooter className="mt-2 justify-end gap-2">
			{canDelete && (
				<Button variant="destructive" onClick={onDelete} disabled={isPending}>
					Delete Agent
				</Button>
			)}
			<Button variant="outline" onClick={onReset} disabled={isPending}>
				Reset to Defaults
			</Button>
		</CardFooter>
	);
}
