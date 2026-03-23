{ pkgs, lib, ... }:
let
	basePackages = with pkgs; [
		bun
		nodejs_22
		git
		gcc
		jq
		python3
		pkg-config
		gnumake
		cmake
		which
	];

	linuxElectronLibraries = with pkgs; [
		at-spi2-atk
		atk
		cairo
		cups
		dbus
		expat
		glib
		gtk3
		libdrm
		libgbm
		libnotify
		libsecret
		mesa
		nspr
		nss
		pango
		stdenv.cc.cc
		libx11
		libxcomposite
		libxcursor
		libxdamage
		libxext
		libxfixes
		libxi
		libxrandr
		libxrender
		libxscrnsaver
		libxtst
		libxcb
		libxkbfile
	];
in
{
	packages =
		basePackages
		++ lib.optionals pkgs.stdenv.isLinux (
			linuxElectronLibraries ++ [ pkgs.caddy pkgs.electron_40 ]
		);

	env =
		{
			SKIP_ENV_VALIDATION = "1";
		}
		// lib.optionalAttrs pkgs.stdenv.isLinux {
			ELECTRON_EXEC_PATH = "${pkgs.electron_40}/bin/electron";
			LD_LIBRARY_PATH = lib.makeLibraryPath linuxElectronLibraries;
		};

	scripts.install.exec = "bun install";
	scripts.desktop-dev.exec = "cd apps/desktop && bun run dev";
	scripts.desktop-typecheck.exec = "cd apps/desktop && bun run typecheck";
	scripts.desktop-test.exec = "cd apps/desktop && bun test";

	enterShell = ''
		echo "Superset devenv loaded"
		echo "  install:           install"
		echo "  desktop dev:       desktop-dev"
		echo "  desktop typecheck: desktop-typecheck"
		echo "  desktop test:      desktop-test"
	'';
}
