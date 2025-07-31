import OpenAI from "openai"
import { ToolNotDefinedError, ContextNotDefinedError } from "./errors.js";

export class Agent {
    constructor({apiKey, model = "gpt-4o", tools = [], toolFns = {}, sysPrompt="Hello!"}) {

        this.gpt = new OpenAI({
            apiKey
        });

        // internal definitions
        this._seedid = null
        this._seeding = null    //guard for seed

        // external definitions
        this.model = model
        this.tools = tools
        this.toolFns = toolFns
        this.sysPrompt = sysPrompt
        this.threads = []

        // Validate that each tool definition has a matching function definition
        for ( const tool of tools ){
            if (typeof(toolFns[tool.name]) !== "function") {
                throw new ToolNotDefinedError(
                    `Tool ${tool.name} is not defined in toolFns! Calls to this tool will fail!`
                )
            }
        }
    }

    async init() {
        this._seeding = await this.gpt.responses.create({
            model: this.model,
            input: this.sysPrompt,
            tools: this.tools,
            stream: false
        }).then(r => { this._seedid = r.id; })
    }

    addThread(id = this.threads.length) {
        if(!this._seedid) throw new ContextNotDefinedError(
            "Model has not been provided context, use Agent.init() first."
        ) 
        const newThread = new Thread({
            id,
            head: this._seedid,
            meta: {
                "description": "a test thread"
            }
        })
        this.threads.push(newThread)
        return newThread
    }

    async process(thread, input) {
        return await this.#streamLoop(thread, input)
    }

    // async processStream(thread, input) {
    //     return await this.#streamLoop(thread, input, stream = true)

    //     // return the initial context then the stream to read from.
    // }

    async #streamLoop(thread, userInput, injected = null) {
        // console.log("THREAD HEAD ", thread.head)

        const inputForApi = injected ?? userInput;
        if (!inputForApi) throw new Error("Nothing to send!") //replace with custom error eventually

        const request = {
            model: this.model,
            previous_response_id: thread.head,
            input: inputForApi,
            tools: this.tools,
            stream: true
        }

        let stream = await this.gpt.responses.create(req)

        thread.head = stream.id


        for await (const ev of stream) {
            console.log(ev)
        }

    }

}


/*
    Thread -- A stateful full duplex conversation between user and agent
    Constructor params:
        (string) ... finish docs later haha
*/
export class Thread {
    constructor ({ id, head, meta }) {
        this.id = id
        this.head = head
        this.meta = meta

        this.trace = []
    } 
}










// in class file testing because im a classy guy

const TestAgent = new Agent({
    apiKey: process.env.GODSHALL_OPENAI_KEY,
    tools: [
        {
            type: "function",
            name: "test"
        }
    ],
    toolFns: {
        test: ({a, b}) => { return a + b }
    }
})

await TestAgent.init()
const thread1 = TestAgent.addThread()

console.log(" THREAD 1 ", thread1)
TestAgent.process(thread1, "Hello")



// console.log(test_agent)