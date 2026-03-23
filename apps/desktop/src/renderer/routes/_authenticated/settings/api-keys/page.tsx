import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/api-keys/")({
	component: ApiKeysSettingsPage,
});

function ApiKeysSettingsPage() {
	return <Navigate to="/settings/appearance" replace />;
}
