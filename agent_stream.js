import { EventEmitter } from 'events'

/*
    AgentStream - Lightweight event interface for Agent streaming
    
    Philosophy: Keep it dead simple
    - Just an EventEmitter that Agent.run() writes to
    - No OpenAI stream management
    - No tool execution logic
    - Pure UX interface layer
*/

export class AgentStream extends EventEmitter {
    constructor() {
        super()
        this.isComplete = false
    }

    emitStart() {
        this.emit('BEGIN_RESPONSE')
    }

    // Agent.run() calls these methods to emit events
    emitText(text) {
        this.emit('text', text)
    }

    emitToolStart(name) {
        this.emit('tool_start', { name })
    }

    emitToolExecute(name, args) {
        this.emit('tool_execute', { name, args })
    }

    emitToolResult(tool, result, error = false) {
        this.emit('tool_result', { tool, result, error })
    }

    emitEnd() {
        this.isComplete = true
        this.emit('end')
    }

    emitError(error) {
        this.emit('error', error)
    }
}

/*
    Usage from Agent.run():
    
    const stream = new AgentStream()
    
    // Agent.run() orchestrates and emits to stream:
    stream.emitData("Hello there!")
    stream.emitToolCall("get_weather", { city: "NYC" })
    stream.emitToolResult("get_weather", "72°F and sunny")
    stream.emitData("The weather is nice!")
    stream.emitEnd()
    
    // Frontend listens:
    stream.on('data', (text) => console.log(text))
    stream.on('tool_call', (call) => console.log(`Calling ${call.name}`))
    stream.on('tool_result', (result) => console.log(`${result.tool}: ${result.result}`))
    stream.on('end', () => console.log('Done'))
    stream.on('error', (err) => console.error(err))
*/