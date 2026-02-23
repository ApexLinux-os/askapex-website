export default {
    async fetch(request: Request, env: Env): Promise<Response>
    {
        const url = new URL(request.url);

        const clientIp = request.cf?.clientIp ?? request.headers.get("CF-Connecting-IP") ?? "";
        const country = request.cf?.country ?? request.headers.get("CF-IPCountry") ?? "";
        const rayId = request.headers.get("CF-Ray") ?? "unknown";

        console.log("request", {
            method: request.method,
            url: url.href,
            pathname: url.pathname,
            query: url.search,
            clientIp: clientIp || "unknown",
            country: country || "unknown",
            colo: request.cf?.colo ?? "unknown",
            asn: request.cf?.asn ?? "unknown",
            userAgent: request.headers.get("User-Agent") ?? "unknown",
            rayId
        });

        const isUuidPath = (() => {
            if (url.pathname.length !== 37) return false;
            if (url.pathname[0] !== "/") return false;
            const p = url.pathname.slice(1);
            return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(p);
        })();

        const isGatewayPath =
            url.pathname === "/get_conversation_id" ||
            isUuidPath ||
            url.pathname === "/v1/chat/completions" ||
            url.pathname === "/v1/models";

        if (!isGatewayPath)
        {
            return new Response("Not Found",
                {
                    status: 404,
                    headers: {
                        "content-type": "text/plain"
                    }
                });
        }

        const upstreamUrl = new URL(request.url);
        upstreamUrl.hostname = "192.168.200.2";
        upstreamUrl.protocol = "http:";
        upstreamUrl.port = "8001";

        const headers = new Headers(request.headers);

        headers.delete("host");
        headers.set("accept-encoding", "identity");

        if (clientIp)
        {
            headers.set("cf-connecting-ip", clientIp);
        }
        if (country)
        {
            headers.set("cf-ipcountry", country);
        }

        const respHeadersBase = new Headers();
        respHeadersBase.set("access-control-allow-origin", "*");
        respHeadersBase.set("access-control-allow-headers", "authorization, content-type, idempotency-key");
        respHeadersBase.set("access-control-allow-methods", "GET, POST, OPTIONS");

        if (request.method === "OPTIONS")
        {
            return new Response(null,
                {
                    status: 204,
                    headers: respHeadersBase
                });
        }

        const init: RequestInit = {
            method: request.method,
            headers,
            body: request.body,
            redirect: "manual"
        };

        const upstreamResp = await env.VPC_SERVICE.fetch(upstreamUrl.toString(), init);

        const respHeaders = new Headers(upstreamResp.headers);
        for (const [k, v] of respHeadersBase.entries())
        {
            respHeaders.set(k, v);
        }

        return new Response(upstreamResp.body,
            {
                status: upstreamResp.status,
                headers: respHeaders
            });
    },
} satisfies ExportedHandler<Env>;
