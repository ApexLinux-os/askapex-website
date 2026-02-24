export default {
    async fetch(request: Request, env: Env): Promise<Response>
    {
        const url = new URL(request.url);

        const clientIp = request.cf?.clientIp ?? request.headers.get("CF-Connecting-IP") ?? "";
        const country = request.cf?.country ?? request.headers.get("CF-IPCountry") ?? "";
        const rayId = request.headers.get("CF-Ray") ?? "unknown";

        const isAskApexChatUuidPath = (() =>
        {
            const pfx = "/AskApexChat/";
            if (!url.pathname.startsWith(pfx)) return false;
            const rest = url.pathname.slice(pfx.length);
            if (rest.length !== 36) return false;
            return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(rest);
        })();

        const isGatewayPath =
            url.pathname === "/get_conversation_id" ||
            isAskApexChatUuidPath ||
            url.pathname === "/v1/chat/completions" ||
            url.pathname === "/v1/models";

        if (!isGatewayPath)
        {
            console.log("Errror", {
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
            return new Response("Not Found",
                {
                    status: 404,
                    headers: {
                        "content-type": "text/plain"
                    }
                });
        }
        console.log("[Request OK]", {
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

        const cors = new Headers();
        cors.set("access-control-allow-origin", "*");
        cors.set("access-control-allow-headers", "authorization, content-type");
        cors.set("access-control-allow-methods", "GET, POST, OPTIONS");

        if (request.method === "OPTIONS")
        {
            return new Response(null,
                {
                    status: 204,
                    headers: cors
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
        for (const [k, v] of cors.entries())
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
