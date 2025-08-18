
export class Thread {
    constructor({
        id,
        meta
    }) {
        this.id = id
        this.meta = meta

        //head -- used for previous_response_id and points to the previous message
        this.head = null
        this.items = []
    }

    async fetchOpenAIResponses( providerInstance ) {
        currentResponse = providerInstance.responses.retrieve(this.head)
        inputs = providerInstance.responses.inputItems.list(this.head)

        
    }
}

export class ThreadItem {
    constructor({ type, time, content, ref_id }) {
        this.type = type
        this.time = time
        this.content = content
        this.ref_id = ref_id
    }
}