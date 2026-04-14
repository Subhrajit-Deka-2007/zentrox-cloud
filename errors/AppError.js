class AppError extends Error{
    constructor(message, statusCode,e=null) {
        super(message);
        this.statusCode = statusCode;
        this.e = e;
        this.isOperational = true;
/*
The error was done by us so we marked isOperational true.
We have added two new attributes statusCode and isOperational
*/
    }
}
module.exports = AppError;