// Errors defined for the Agent object

/* 
    ToolNotDefinedError
    User provided function definitions to tools that do not have a matching local definition
*/
class ToolNotDefinedError extends Error {
    constructor(message) {
        super(message)
        this.name = "ToolNotDefinedError"
    }
}



export { ToolNotDefinedError }