// Errors defined for the Agent object

/* 
    ToolNotDefinedError
    User provided function definitions to tools that do not have a matching local definition.
*/
class ToolNotDefinedError extends Error {
    constructor(message) {
        super(message)
        this.name = "ToolNotDefinedError"
    }
}

/*
    ModelProviderError
    Agent failed to instantiate a valid model provider, typically a model name or API key issue.
*/
class ModelProviderError extends Error {
    constructor(message) {
        super(message)
        this.name = "ModelProviderError"
    }
}

/*
    InvalidThreadError
    Thread ID does not reference a valid thread in the agent.
*/
class InvalidThreadError extends Error {
    constructor(message) {
        super(message)
        this.name= "InvalidThreadError"
    }
}


/*
    InstanceNotDefinedError
    do we need this? If system prompts don't carry... no
*/
class InstanceNotDefinedError extends Error {
    constructor(message) {
        super(message)
        this.name = "ContextNotDefinedError"
    }
}



export { ToolNotDefinedError, ModelProviderError, InstanceNotDefinedError, InvalidThreadError }