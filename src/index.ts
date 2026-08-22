import { createMcpHandler } from "agents/mcp/server";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

interface Env {
  INTERVALS_API_KEY: string;
}

async function intervalsFetch(env: Env, path: string) {
  const auth = btoa(`API_KEY:${env.INTERVALS_API_KEY}`);

  const response = await fetch(`https://intervals.icu/api/v1${path}`, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Intervals.icu API error ${response.status}: ${await response.text()}`
    );
  }

  return response.json();
}

function createServer(env: Env) {
  const server = new McpServer({
    name: "Intervals ICU Training",
    version: "1.0.0",
  });

  server.registerTool(
    "get_activities",
    {
      description:
        "Get training activities from Intervals.icu for a date range. Use for training volume, power, heart rate, load and intensity analysis.",
      inputSchema: {
        oldest: z.string().describe("Start date YYYY-MM-DD"),
        newest: z.string().describe("End date YYYY-MM-DD"),
      },
    },
    async ({ oldest, newest }) => {
      const data = await intervalsFetch(
        env,
        `/athlete/0/activities?oldest=${encodeURIComponent(oldest)}&newest=${encodeURIComponent(newest)}`
      );

      return {
        content: [{ type: "text", text: JSON.stringify(data) }],
      };
    }
  );

  server.registerTool(
    "get_activity",
    {
      description:
        "Get detailed information about a single Intervals.icu activity.",
      inputSchema: {
        activity_id: z.string().describe("Intervals activity ID"),
      },
    },
    async ({ activity_id }) => {
      const data = await intervalsFetch(
        env,
        `/activity/${encodeURIComponent(activity_id)}`
      );

      return {
        content: [{ type: "text", text: JSON.stringify(data) }],
      };
    }
  );

  server.registerTool(
    "get_wellness",
    {
      description:
        "Get wellness and fitness data including HRV, resting HR, weight, fitness and fatigue when available.",
      inputSchema: {
        oldest: z.string().describe("Start date YYYY-MM-DD"),
        newest: z.string().describe("End date YYYY-MM-DD"),
      },
    },
    async ({ oldest, newest }) => {
      const data = await intervalsFetch(
        env,
        `/athlete/0/wellness?oldest=${encodeURIComponent(oldest)}&newest=${encodeURIComponent(newest)}`
      );

      return {
        content: [{ type: "text", text: JSON.stringify(data) }],
      };
    }
  );

  server.registerTool(
    "get_calendar",
    {
      description:
        "Get planned workouts and calendar events from Intervals.icu.",
      inputSchema: {
        oldest: z.string().describe("Start date YYYY-MM-DD"),
        newest: z.string().describe("End date YYYY-MM-DD"),
      },
    },
    async ({ oldest, newest }) => {
      const data = await intervalsFetch(
        env,
        `/athlete/0/events?oldest=${encodeURIComponent(oldest)}&newest=${encodeURIComponent(newest)}`
      );

      return {
        content: [{ type: "text", text: JSON.stringify(data) }],
      };
    }
  );

  return server;
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "intervals-mcp",
      });
    }

    if (url.pathname === "/mcp") {
      return createMcpHandler(() => createServer(env))(request, env, ctx);
    }

    return new Response("Intervals MCP");
  },
};
