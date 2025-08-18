# EasyAgent
## Function calling agents made easy

*This documentation is still crude… Bear with me!*

---

The true power of LLMs resides in function calling.

It is, then, a shame that the function-calling workflow in OpenAI’s Responses API is so primitive, especially with streamed responses. Currently, the user must manually manage the entirety of the two-turn function-calling paradigm within their code. It gets messy quickly — 100+ line event-consuming switch cases, roundabout logic for parallelized function calling, piles of deeply nested JSON, and thread management all contribute to a bag of bloat that drags down even the simplest of applications.

These problems were all meant to be addressed by the Assistants API, but it has since been discontinued with the vague promise of eventual “feature parity” with the Responses API. That has not even partially occured yet, so I’m doing it myself.

---

### Usage

`import Agent from "easyagent"`

Create an Agent:

```js
const MyAgent = new Agent({
	apiKey: "someApiKey", // OpenAI key goes here
	model: "gpt-5", // Choose any accessible model
	systemPrompt: "You are a helpful assistant!", // System instructions
	toolDefinitions: [
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
		},
	] // These follow standard OpenAI function format
	toolFunctions: { // Provide local definitions for each function here
		add_number: ({ a, b }) => {
        	return Number(a) + Number(b)
        }, // Dictionary format
	}
})
```

Any tool definition in `toolDefinitions` provided to the Agent without a corresponding local function in `toolFunctions` will cause a `ToolNotDefinedError` to be thrown. 

Before the Agent is used, it is recommended to call `Agent.init()` to validate the API key and ensure that the selected model is available. If this check fails, a `ModelProviderError` will be thrown.

To interact with the agent, we need to create a Thread. Optionally, we can provide a custom ID for the thread along with a `meta` object containing some additional information about it. If the ID is left blank, a numerical ID will be assigned based on number of Threads owned by the Agent.

*Note: Metadata is never transmitted to the model and is used only for organization.*

```js
const MyThreadId = MyAgent.createThread("New Chat", {
	associated_document: "invoice.pdf",
	time_created: 1754599193
})
```

Now that we have a Thread, we can start it with `Agent.run`. If an agent has streaming enabled (as it will here), it will return an `AgentStream` object, which is an EventEmitter designed to make streaming interaction easy and streamlined.

*Non-streaming response support will be added soon.*

```js
const agentStream = MyAgent.run(MyThreadId, "Say hello!")

agentStream.on("data", (d) => {
	process.stdout.write(d)
})
```

`output`:
```bash
sam@lannister agents % node agent_test.js
Hey there! How can I assist you today?
```

Now let’s try to run the Thread with a prompt that will push the model to use the `add_number` tool we provided to it. As shown below, we can add additional event handlers to see information about tool calls. This is purely optional — the run will continue regardless of event consumption.

```js
const agentStream = MyAgent.run(MyThreadId, "Add 409 and 573. Use tools!")

// Text packet
agentStream.on("data", (d) => {
	process.stdout.write(d)
})

// Model decides to call tool
agentStream.on("tool_start", (info) => {
	console.log(`\n!!! Calling ${info.name}`)
}

// Model provides arguments to the tool, local execution begins
agentStream.on("tool_execute", (info) => {
	console.log(`\n!!! Func ${info.name} running with args: ${info.args}`)
}

// Local execution is complete, model receives result
agentStream.on("tool_result", (info) => {
	console.log(`\n!!! Function ${info.name} returns ${info.result}`)
}
```

`output`
```
I'll use the add_number tool to determine the sum of 409 and 573.
!!! Calling add_number
!!! Func add_number running with args: {"a":409,"b":573}
!!! Function add_number returns 982
The sum of 409 and 573 is 982.
```

As shown, EasyAgent makes function calling extremely simple and manages the complexities of the two-turn function execution model. All you see on the outside is a single stream with wonderfully simple events!

By referencing the same Thread id in `Agent.run()` we can continue conversations with their previous context. I’m tired of writing documentation for now, but just try it out.
