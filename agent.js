import OpenAI from "openai"
import { ToolNotDefinedError } from "./errors.js";

export class Agent {
    constructor({apiKey, model = "gpt-4o", tools = [], toolFns = {}, context=""}) {

        this.gpt = new OpenAI({
            apiKey
        });

        this.model = model
        this.tools = tools
        this.toolFns = toolFns
        this.seedId = null
        this.context = context

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
}

/*
    Thread -- A stateful full duplex conversation between user and agent
    Constructor params:
        (string) context --  
*/
export class Thread {

}




const test_agent = new Agent({
    apiKey: process.env.GODSHALL_OPENAI_KEY,
    tools: [
        {
            type: "function",
            name: "test1"
        }
    ],
    toolFns: {
        test: ({a, b}) => { return a + b }
    }
})