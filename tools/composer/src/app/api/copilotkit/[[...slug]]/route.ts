/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
