import {
  CopilotRuntime,
  createCopilotEndpoint,
  InMemoryAgentRunner,
  BasicAgent,
} from "@copilotkit/runtime/v2";
import { handle } from "hono/vercel";
import { A2UI_V09_SYSTEM_PROMPT } from "../a2ui-prompt-v09";

const determineModel = () => {
  if (
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
  ) {
    return "google/gemini-3.1-pro-preview";
  }
  if (process.env.OPENAI_API_KEY?.trim()) {
    console.warn(
      "[CopilotKit] GOOGLE_API_KEY not found, falling back to OpenAI",
    );
    return "openai/gpt-4.1-mini";
  }
  console.warn("[CopilotKit] No GOOGLE_API_KEY or OPENAI_API_KEY found");
  return "google/gemini-3.1-pro-preview";
};

const model = determineModel();

const agent = new BasicAgent({
  model,
  prompt: A2UI_V09_SYSTEM_PROMPT,
  temperature: 0.4,
});

const runtime = new CopilotRuntime({
  agents: { default: agent },
  runner: new InMemoryAgentRunner(),
});

const app = createCopilotEndpoint({
  runtime,
  basePath: "/api/copilotkit",
});

export const GET = handle(app);
export const POST = handle(app);
