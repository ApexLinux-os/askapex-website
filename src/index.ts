import { renderHtml } from "./renderHtml";

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const clientIp = request.cf?.clientIp ?? request.headers.get("CF-Connecting-IP");
		const rayId = request.headers.get("CF-Ray") ?? "unknown";
		console.log("request", {method: request.method, url: url.href, pathname: url.pathname, query: url.search, clientIp: clientIp ?? "unknown", country: request.cf?.country ?? "unknown", colo: request.cf?.colo ?? "unknown", asn: request.cf?.asn ?? "unknown", userAgent: request.headers.get("User-Agent") ?? "unknown", rayId});
	},
} satisfies ExportedHandler<Env>;
