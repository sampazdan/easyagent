import OpenAI from "openai"
import { ToolNotDefinedError, ModelProviderError, InvalidThreadError } from "./errors.js"
import { AgentStream } from "./agent_stream.js"

export class Agent {
    constructor({
        apiKey, 
        model, 
        toolDefinitions = [], 
        toolFunctions = {}, 
        systemPrompt = "You are a helpful assistant!"
    }) {

        // Public internal vars
        this.model = model
        this.toolDefinitions = toolDefinitions
        this.toolFunctions = toolFunctions
        this.systemPrompt = systemPrompt
        this.threads = {}

        // Private internal vars
        this._instance = new OpenAI({ apiKey })
        this._seedId = null     // contains the response ID for the response created after the model receives its system context.

        for (const f of toolDefinitions) {
            const func = toolFunctions[f.name]
            if (typeof(func) !== 'function'){
                throw new ToolNotDefinedError(`Tool ${f.name} does not have a valid function definition in toolFunctions.`)
            }
        }
    }

    async init() {
        let models

        // retrieve models -- if failed, model provider error
        try {
            models = await this._instance.models.list()
        } catch (err) {
            throw new ModelProviderError(`Failed to instantiate OpenAI instance. Verify API key and organization settings.\nOpenAI message: ${err?.error?.message}`)
        }

        // ensure Agent's model is in the list of available models, if not, model provider error
        const availableModelIds = Array.isArray(models?.data) ? models.data.map(m => m.id) : []

        if (!availableModelIds.includes(this.model)) {
            throw new ModelProviderError(`Model \"${this.model}\" was not found in the provider's available models. Available models: \n\n${availableModelIds.join(", ")}`)
        }
    }

    /*
        Creates a new thread and returns the id of the thread.
        ID is the index of the thread in self.threads if not provided.
    */
    createThread(id = Object.keys(this.threads).length, meta = {}) {
        if(id in this.threads) throw new InvalidThreadError(`Thread already exists with ID: ${id}`)
        const thread = new Thread({ id, meta });
        this.threads[id] = thread;
        return thread.id;
    }

    /*
        Returns the full thread object given a valid ID
    */
    getThread(id){
        const thread = this.threads[id]
        if (!thread) throw new InvalidThreadError("Thread ID invalid.")
        return thread
    }

    /*
        Agent.run -- The stateful orchestrator
    */
    async run(threadId, content, stream = true) {
        const thread = this.threads[threadId]
        if(!thread) throw new InvalidThreadError("Thread ID invalid.")
        
        const agentStream = new AgentStream()

        // Callback to be called once the current turn is complete
        // Should we pull new inputs and update the thread here or append? Hm...
        const onComplete = (responseId, newContent) => {
            // console.log(`onComplete() called, request complete! Params: ${responseId} ::: ${newContent}`)
            thread.head = responseId
            thread.content.push(newContent)
        }

        setImmediate(async () => {
            await this.#generate(thread, content, agentStream, onComplete)
        })

        return agentStream
    }

    /*
        Agent.generate() -- The stateless worker
    */
    async #generate(thread, content, agentStream, onComplete, stream = true, is_function_output = false){

        const request = this.#generateRequest(thread, content, stream)

        const responseStream = await this._instance.responses.create(request)

        let new_response_id = null

        // Main handler of incoming events from ModelProvider
        for await (const ev of responseStream){
            switch(ev.type){
                case "response.output_item.added": 
                    if(ev.item.type === "function_call") {
                        // console.log("FUNC CHOICE = ", ev.item.name)
                        agentStream.emitToolStart(ev.item.name)
                    }
                    break

                case "response.output_item.done":
                    if(ev.item.type === "function_call") {
                        agentStream.emitToolExecute(ev.item.name, ev.item.arguments)

                        if(new_response_id) thread.head = new_response_id

                        const func = this.toolFunctions[ev.item.name]
                        if(!func) {
                            throw new ToolNotDefinedError(`No tool defined with name ${ev.item.name}`)
                        }

                        const function_result = await func(JSON.parse(ev.item.arguments))

                        const func_output_content = this.#generateFunctionCallOutput(function_result, ev.item.call_id)

                        this.#generate(thread, func_output_content, agentStream, onComplete)
                    }
                    break

                case "response.created":
                    agentStream.emitStart()
                    new_response_id = ev.response.id
                    break
                case "response.output_text.delta":
                    agentStream.emitData(ev.delta)
                    break
                // case "response.output_text.done":
                //     agentStream.emitData(ev.text)
                //     break;
                // case "response.function_call"
                default:
                    // console.log(ev)
                    break


            }
        }

        onComplete(new_response_id, "somemsg")


        // return responseStream
    }

    #generateRequest(thread, content, stream = true){
        return {
            model: this.model,
            previous_response_id: thread.head,
            instructions: this.systemPrompt,
            input: content,
            tools: this.toolDefinitions,
            stream,
            parallel_tool_calls: false
        }
    }

    // type: "function_call_output", call_id, output
    #generateFunctionCallOutput(output, call_id) {
        return [{
            type: "function_call_output",
            call_id,
            output: JSON.stringify(output)
        }]
    }


}


export class Thread {
    constructor({
        id,
        meta
    }) {
        this.id = id
        this.meta = meta

        //head -- used for previous_response_id and points to the previous message
        this.head = null
        this.content = []
    }
}