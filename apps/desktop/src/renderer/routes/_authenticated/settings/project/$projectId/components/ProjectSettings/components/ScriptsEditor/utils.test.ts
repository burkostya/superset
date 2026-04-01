import { describe, expect, test } from "bun:test";
import { buildCopyPayload, parseContentFromConfig } from "./utils";

describe("parseContentFromConfig", () => {
	test("returns empty defaults for missing config", () => {
		expect(parseContentFromConfig(null)).toEqual({
			setup: "",
			teardown: "",
			run: "",
			copy: [],
		});
	});

	test("parses copy rules and trims values", () => {
		expect(
			parseContentFromConfig(
				JSON.stringify({
					setup: ["bun install"],
					copy: [
						{
							source: " .env ",
							target: " .env.local ",
							optional: true,
							overwrite: true,
						},
						{
							source: ".cursor",
						},
						{
							source: "",
						},
					],
				}),
			),
		).toEqual({
			setup: "bun install",
			teardown: "",
			run: "",
			copy: [
				{
					source: ".env",
					target: ".env.local",
					optional: true,
					overwrite: true,
				},
				{
					source: ".cursor",
				},
			],
		});
	});
});

describe("buildCopyPayload", () => {
	test("drops empty rows and omits default false flags", () => {
		expect(
			buildCopyPayload([
				{
					source: " .env ",
					target: " ",
					optional: false,
					overwrite: false,
				},
				{
					source: "",
					target: "ignored",
				},
				{
					source: ".cursor",
					overwrite: true,
				},
			]),
		).toEqual([
			{
				source: ".env",
			},
			{
				source: ".cursor",
				overwrite: true,
			},
		]);
	});
});
