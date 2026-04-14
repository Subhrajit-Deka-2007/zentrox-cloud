const fs = require('fs');
const path = require('path');
const rfs = require('rotating-file-stream');
// Create a folder structure
const createFolder = (folderPath) => {
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
    /*
    In these line the folder path that we are giving input I am checking that folder path exists or not if not exists then
    we will create the input folder path means we wil create those folders and recursive:true means we are creating nested folders
    */

};
// Start creating our all folders

/* Access Folder -> Store our all request here */

createFolder(path.join(__dirname, '../logs/access'));

/* Creating folder to store the server error */
createFolder(path.join(__dirname, '../logs/errors/server'));
/*Creating folder to store the database error */
createFolder(path.join(__dirname, '../logs/errors/database'));
/*Create folder for authentication error */
createFolder(path.join(__dirname, '../logs/errors/auth'));
/*Creating folder to store the validation error*/
createFolder(path.join(__dirname, '../logs/errors/validation'));
/* Creating combined errors folder */
createFolder(path.join(__dirname, '../logs/combined'));

/*
Creating LOG STREAMS
STREAMS= Pipe that stays open
Data flows through it continuously
Much faster then opening/closing a file every time!
*/


// SERVER ERROR STREAM
const serverErrorStream = rfs.createStream('server.log', {
    interval: '1d',
    path: path.join(__dirname, '../logs/errors/server')
});
//Database error stream
const dbErrorStream = rfs.createStream('database.log', {
    interval: '1d',
    path: path.join(__dirname, '../logs/errors/database')
});
//Auth error Stream
const authErrorStream = rfs.createStream('auth.log', {
    interval: '1d',
    path: path.join(__dirname, '../logs/errors/auth')
});
//Validation error stream
const validationErrorStream = rfs.createStream('validation.log', {
    interval: '1d',
    path: path.join(__dirname, '../logs/errors/validation')
});
//Combined error
const combinedErrorStream = rfs.createStream('combined.log', {
    interval: '1d',
    path: path.join(__dirname, '../logs/combined')
});
/*
Also for the access stream we will make its file later on it will store all the request that was made to server
Before saving the error in the file we will format the errors
*/
const formatError = (err, req) => {
    return `Time:${new Date().toLocaleString()} /n
    Route:${req.method}${req.url}/n
    Status:${err.statusCode}/n
    Message:${err.message}/n
    Stack:${err.stack}/n
    `;
};
/*
DETECTING ERROR TYPE SO THAT I CAN DECIDE AT WHICH FILE I CAN STORE THE ERROR
*/
const getErrorType = (err) => {
    if (err.name === 'MongoError' || err.name === "MongoServerError" || err.name === 'CastError') return 'database';

    if (err.statusCode === 401 || err.statusCode === 403)
        return 'auth';
    /*
     401 ---> Not logged in
     403 ---> Logged in but not authorized
    */
    if (err.statusCode === 400 || err.statusCode === 422)
        return 'validation';
    /*
    400 -->Bad request (missing fields)
    422 --> Invalid data format
    */
    return 'server';
    /*
    If  none of the above it is a server error.
    default anything else server bug
    */
}

// SAVE TO CORRECT FOLDER
const saveErrorToFiles = (err, req) => {
    const errorDetails = formatError(err, req);
    const errorType = getErrorType(err);
    if (errorType === 'database') dbErrorStream.write(errorDetails);
    else if (errorType === 'auth') authErrorStream.write(errorDetails);
    else if (errorType === 'validation') validationErrorStreamErrorStream.write(errorDetails);
    else serverErrorStream.write(errorDetails);
    combinedErrorStream.write(errorDetails);
}
const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Something went wrong! ";
    if (!err.e) err.e = "";
    if (process.env.NODE_ENV === 'development') {
        res.status(err.statusCode).json({
            message: err.message,
            stack: err.stack,
            e:err.e,
            error: err
        });

    } else {
        saveErrorToFiles(err, req);
        if (err.isOperational) {
            /*mistake is done from user side. The mistake is safe to show*/
            res.status(err.statusCode).json({
                message: err.message,
                e: err.e
            });
        }
        /*
        if isOperational true means it is a server error
        not safe to show.
        */
        res.status(500).json({
            message: 'Something went wrong'
        });
    }
};
module.exports = errorHandler;