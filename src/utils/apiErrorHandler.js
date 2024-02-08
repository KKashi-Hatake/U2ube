class apiErrorHandler extends Error{
    constructor(
        statusCode,
        errors=[],
        stack,
        message="Something Went Weong"
    ){
        super(message)
        this.statusCode=statusCode
        this.data=null
        this.message=message
        this.success=false
        this.errors=errors
        if(stack){
            this.stack=stack
        }else{
            Error.captureStackTrace(this,this.constructor)
        }
    }
}

export default apiErrorHandler