import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/integrations/")({
	component: IntegrationsSettingsPage,
});

function IntegrationsSettingsPage() {
	return <Navigate to="/settings/appearance" replace />;
}
