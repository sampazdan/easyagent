import OpenAI from "openai";
import { ToolNotDefinedError, ContextNotDefinedError } from "./errors.js";

export class Agent {
  constructor({ apiKey, model = "gpt-4o", tools = [], toolFns = {}, sysPrompt = "Hello!" }) {
    this.gpt = new OpenAI({ apiKey });
    this._seedId = null;
    this._seeding = null;
    this.model = model;
    this.tools = tools;
    this.toolFns = toolFns;
    this.sysPrompt = sysPrompt;
    this.threads = [];
    for (const t of tools) {
      if (typeof toolFns[t.name] !== "function") throw new ToolNotDefinedError(`Tool ${t.name} not defined`);
    }
  }

  async init() {
    this._seeding = await this.gpt.responses
      .create({ model: this.model, input: this.sysPrompt, tools: this.tools, stream: false })
      .then(r => (this._seedId = r.id));
  }

  addThread(id = this.threads.length) {
    if (!this._seedId) throw new ContextNotDefinedError("Call Agent.init() first");
    const t = new Thread({ id, head: this._seedId, meta: {} });
    this.threads.push(t);
    return t;
  }

  async process(thread, input) {
    thread.userHistory.push(input);
    return await this.#streamLoop(thread, input);
  }

  async #streamLoop(thread, userInput, injected = null) {
    const isToolFollowUp = injected !== null;

    const pastUsers = isToolFollowUp
      ? []
      : thread.userHistory
          .slice(0, -1)
          .map(txt => ({ role: "user", content: txt }));

    const payload = isToolFollowUp
      ? injected // already an array with function_call_output object
      : [{ role: "user", content: userInput }];

    const req = {
      model: this.model,
      previous_response_id: thread.head,
      input: [...pastUsers, ...payload],
      tools: this.tools,
      stream: true
    };

    let stream = await this.gpt.responses.create(req);
    thread.head = stream.id;

    for await (const ev of stream) {
      if (ev.type === "response.output_text.delta") process.stdout.write(ev.delta);

      if (ev.type === "response.function_call") {
        const { name, call_id } = ev;
        let argStr = "";
        for await (const part of stream) {
          if (part.type === "response.function_call.arguments.delta") argStr += part.delta;
          if (part.type === "response.function_call.arguments.done") break;
        }
        const args = JSON.parse(argStr);
        const fn = this.toolFns[name];
        if (!fn) throw new ToolNotDefinedError(name);
        const result = await fn(args);
        return await this.#streamLoop(thread, null, [
          { type: "function_call_output", call_id, output: result }
        ]);
      }
    }
  }
}

export class Thread {
  constructor({ id, head, meta }) {
    this.id = id;
    this.head = head;
    this.meta = meta;
    this.trace = [];
    this.userHistory = [];
  }
}

/* tests */
const TestAgent = new Agent({
  apiKey: process.env.GODSHALL_OPENAI_KEY,
  tools: [
    {
      type: "function",
      name: "add_number",
      description: "Add two numbers together",
      parameters: {
        type: "object",
        properties: { a: { type: "number" }, b: { type: "number" } },
        required: ["a", "b"],
        additionalProperties: false
      }
    }
  ],
  toolFns: { add_number: ({ a, b }) => a + b }
});

await TestAgent.init();
const thread1 = TestAgent.addThread();
await TestAgent.process(thread1, "Hey, remember this secret phrase: 'bigbrowncat'");
await TestAgent.process(thread1, "What was the secret phrase?");
console.log("\n\nDONE");
