import { Command, join } from "../../deps.ts";
import { GlobalOpts, initProject } from "../common.ts";
import { build } from "../../build/mod.ts";

export const testCommand = new Command<GlobalOpts>()
	.option("--no-format", "Don't format modules")
	.option("--no-build", "Don't build source files")
	.option("--no-migrate", "Don't migrate database")
	// .option("--no-lint", "Don't lint the codebase")
	.option("--no-check", "Don't check source files before running")
	.option("--no-watch", "Don't automatically restart server on changes")
	.arguments("[modules...]")
	.action(
		async (opts, ...modules) => {
			const project = await initProject(opts);

			const entrypointPath = join(project.path, "dist", "entrypoint.ts");

			// TODO: Only format local modules
			// Fmt project
			if (opts.format) {
				const cmd = await new Deno.Command("deno", {
					args: [
						"fmt",
						project.path,
					],
					stdout: "inherit",
					stderr: "inherit",
				})
					.output();
				if (!cmd.success) throw new Error("Format failed");
			}

			// Build project
			if (opts.build) {
				await build(project);
			}

			// Migrate project
			if (opts.migrate) {
				// TODO
			}

			// TODO: Only lint local modules
			// Lint project
			// if (opts.lint) {
			// 	const cmd = await new Deno.Command("deno", {
			// 		args: [
			// 			"lint",
			// 			project.path,
			// 		],
			// 		stdout: "inherit",
			// 		stderr: "inherit",
			// 	})
			// 		.output();
			// 	if (!cmd.success) throw new Error("Format failed");
			// }

			// Determine args
			const args = [
				"--allow-env",
				"--allow-net",
				"--allow-read",
			];
			if (opts.check) args.push("--check");
			if (opts.watch) args.push("--watch");
			for (const module of project.modules.values()) {
				// Test all modules or filter module tests
				if (!modules || modules.includes(module.name)) {
					args.push(join(module.path, "tests", "*.ts"));
				}
			}

			// Run entrypoint
			const cmd = await new Deno.Command("deno", {
				args: [
					"test",
					...args,
					entrypointPath,
				],
				stdout: "inherit",
				stderr: "inherit",
			})
				.output();
			if (!cmd.success) throw new Error("Entrypoint failed");
		},
	);
