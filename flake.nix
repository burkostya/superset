{
	description = "Superset desktop development environment";

	inputs = {
		nixpkgs.url = "github:cachix/devenv-nixpkgs/rolling";
		flake-parts.url = "github:hercules-ci/flake-parts";
		devenv.url = "github:cachix/devenv";
		nix2container = {
			url = "github:nlewo/nix2container";
			inputs.nixpkgs.follows = "nixpkgs";
		};
		mk-shell-bin.url = "github:rrbutani/nix-mk-shell-bin";
	};

	nixConfig = {
		extra-trusted-public-keys =
			"devenv.cachix.org-1:w1cLUi8dv3hnoSPGAuibQv+f9TZLr6cv/Hm9XgU50cw=";
		extra-substituters = "https://devenv.cachix.org";
	};

	outputs =
		inputs@{ flake-parts, devenv, ... }:
		flake-parts.lib.mkFlake { inherit inputs; } {
			systems = [
				"x86_64-linux"
				"aarch64-linux"
				"x86_64-darwin"
				"aarch64-darwin"
			];

			imports = [ devenv.flakeModule ];

			perSystem =
				{ pkgs, ... }:
				{
					devenv.shells.default = import ./devenv.nix {
						inherit pkgs;
						lib = pkgs.lib;
					};
				};
		};
}
