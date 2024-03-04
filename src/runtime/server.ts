import { Runtime } from "./runtime.ts";

export function serverHandler<RegistryT>(runtime: Runtime<RegistryT>): Deno.ServeHandler {
	return async (
		req: Request,
		info: Deno.ServeHandlerInfo,
	): Promise<Response> => {
		const url = new URL(req.url);

		const moduleCall = /^\/modules\/(\w+)\/scripts\/(\w+)\/call\/?$/;
		if (req.method == "POST" && moduleCall.test(url.pathname)) {
			const matches = url.pathname.match(moduleCall);
			if (matches) {
				// Lookup script
				const [, moduleName, scriptName] = matches;
				const script = runtime.config.modules[moduleName]?.scripts[scriptName];

				if (script && script.public) {
					// Create context
					const ctx = runtime.createRootContext({
						httpRequest: {
							method: req.method,
							path: url.pathname,
							remoteAddress: info.remoteAddr.hostname,
							headers: Object.fromEntries(req.headers.entries()),
						},
					});

					// Match module
					const output = await ctx.call(
						moduleName as any,
						scriptName as any,
						await req.json(),
					);

					if (output.__tempPleaseSeeOGBE3_NoData) {
						return new Response(undefined, {
							status: 204,
							headers: {
								"Access-Control-Allow-Origin": "*",
							},
						});
					}

					return new Response(JSON.stringify(output), {
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Access-Control-Allow-Origin": "*",
						},
					});
				}
			}
		}

		return new Response("welp", { status: 404 });
	};
}
