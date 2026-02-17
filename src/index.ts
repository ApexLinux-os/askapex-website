import {renderHtml} from "./renderHtml";

export default {
    async fetch(request, env)
    {
        const url = new URL(request.url);
        const clientIp = request.cf?.clientIp ?? request.headers.get("CF-Connecting-IP");
        const rayId = request.headers.get("CF-Ray") ?? "unknown";
        console.log("request", {method: request.method, url: url.href, pathname: url.pathname, query: url.search, clientIp: clientIp ?? "unknown", country: request.cf?.country ?? "unknown", colo: request.cf?.colo ?? "unknown", asn: request.cf?.asn ?? "unknown", userAgent: request.headers.get("User-Agent") ?? "unknown", rayId});
        if (url.pathname === "/v1/chat/completions" || url.pathname === "/v1/models")
        {
            var upstreamUrl = new URL(request.url);
            upstreamUrl.hostname = "192.168.200.2";

            var headers = new Headers(request.headers);

            headers.delete("host");
            headers.set("accept-encoding", "identity");

            var init: RequestInit =
                {
                    method: request.method,
                    headers: headers,
                    body: request.body,
                    redirect: "manual"
                };

            var upstreamResp = await fetch(upstreamUrl.toString(), init);

            var respHeaders = new Headers(upstreamResp.headers);

            respHeaders.set("access-control-allow-origin", "*");
            respHeaders.set("access-control-allow-headers", "authorization, content-type");
            respHeaders.set("access-control-allow-methods", "GET, POST, OPTIONS");
            if (request.method === "OPTIONS")
            {
                return new Response(null,
                    {
                        status: 204,
                        headers: respHeaders
                    });
            }

            return new Response(upstreamResp.body,
                {
                    status: upstreamResp.status,
                    headers: respHeaders
                });
        }

        return new Response("Not Found",
            {
                status: 404,
                headers:
                    {
                        "content-type": "text/plain"
                    }
            });
    },
} satisfies ExportedHandler<Env>;
