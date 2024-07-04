import { Ajv } from "./deps.ts";
import { Module, Project } from "../project/mod.ts";
import { runJob } from "../utils/worker_pool.ts";
import { WorkerRequest, WorkerResponse } from "./module_config_schema.worker.ts";
import { createWorkerPool } from "../utils/worker_pool.ts";
import { hasUserConfigSchema } from "../project/module.ts";
import { InternalError, UserError } from "../error/mod.ts";
import { resolve } from "../deps.ts";
import { formatValidationErrors, validationUserError } from "../utils/ajv_validation.ts";

const WORKER_POOL = createWorkerPool<WorkerRequest, WorkerResponse>({
	source: import.meta.resolve("./module_config_schema.worker.ts"),
});

export interface CompileModuleConfigSchemaOpts {
	strictSchemas: boolean;
	onStart: () => void;
}

export async function compileModuleConfigSchema(
	project: Project,
	module: Module,
	opts: CompileModuleConfigSchemaOpts,
): Promise<void> {
	// Read schema
	if (await hasUserConfigSchema(module)) {
		if (opts.strictSchemas) {
			// Parse schema
			const res = await runJob({ pool: WORKER_POOL, request: { module }, onStart: opts.onStart });
			module.userConfigSchema = res.moduleConfigSchema;
		} else {
			opts.onStart();

			// No schema
			module.userConfigSchema = {
				"$schema": "http://json-schema.org/draft-07/schema#",
				"type": "object",
				"additionalProperties": true,
			};
		}
	} else {
		opts.onStart();

		// No config
		module.userConfigSchema = {
			"$schema": "http://json-schema.org/draft-07/schema#",
			"type": "object",
			"additionalProperties": false,
		};
	}

	// Validate config
	const moduleConfigAjv = new Ajv({
		schemas: [module.userConfigSchema],
	});

	const moduleConfigSchema = moduleConfigAjv.getSchema("#");
	if (!moduleConfigSchema) {
		throw new InternalError("Failed to get root type from user config schema.", {
			path: resolve(module.path, "config.ts"),
		});
	}

	if (!moduleConfigSchema(module.userConfig)) {
    throw validationUserError(`Invalid config for ${module.name}.`, resolve(project.path, "backend.json"), module.userConfig, moduleConfigAjv, moduleConfigSchema.errors);
	}
}
