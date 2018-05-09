const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');
const fopen = util.promisify(fs.open);
const fwrite = util.promisify(fs.write);
const fclose = util.promisify(fs.close);


// Buffer constants
const rn = Buffer.from("\r\n");
const r = Buffer.from("\r");
const n = Buffer.from("\n");
const _contentDisposition = Buffer.from("Content-Disposition: form-data; ");
const _fileName = Buffer.from('"; filename="');
const _name = Buffer.from('name="');
const _quotesEnd = Buffer.from('"' + "\r\n");
const _contentType = Buffer.from('Content-Type: ');
const _dashes = Buffer.from('--');

let files_index = 0;


function MultipartFormDataParser(content_type, requestData) {
    const boundary = content_type.substr(content_type.indexOf('boundary=') + 9);
    const boundaryDelimiter = '--' + boundary;
    const boundaryDelimiter__byteLength = Buffer.byteLength(boundaryDelimiter);
    const boundaryDelimiter_end = '--' + boundary + '--';
    const boundaryDelimiterEnd__byteLength = Buffer.byteLength(boundaryDelimiter_end);

    let chunks = [];

    // Wait
    let waitForBoundaryDelimiter = true; // step 1
    let waitForContentDisposition = false; // step 2
    let waitForContentType = false; // can be step 3
    let waitForEmptyLine = false;
    let waitForDataEnd = false;

    // help vars
    let paramName = false;
    let paramValue = '';
    let fileName = false;
    let fileSize = 0;
    let fileExtension = false;
    let fileMimeType = false;
    let tmpFilePath = false;
    let fileDescriptor = false;

    // Reset
    function reset() {
        paramName = false;
        paramValue = '';
        fileName = false;
        fileSize = 0;
        fileExtension = false;
        fileMimeType = false;
        tmpFilePath = false;
        fileDescriptor = false;
    }

    let rnFails = 0;

    function rnIndex(binaryChunk) {
        const index = binaryChunk.indexOf(rn);
        if (index == -1) {
            rnFails++;
            if (rnFails >= 2 && binaryChunk.length >= 65535) {
                throw 'Invalid request (1)';
            }

            return false;
        } else {
            rnFails = 0;
        }

        return index;
    }

    this.addChunk = async (chunkOfBytes) => {
        chunks.push(chunkOfBytes);

        return await this.parse();
    };

    let parseInProgress = false;
    let binaryChunk = new Buffer('');

    this.parse = async function () {
        if (parseInProgress) return false;
        parseInProgress = true;

        try {

            while (chunks.length) {
                binaryChunk = Buffer.concat([binaryChunk, chunks.shift()]);

                let iterate = true;
                while (iterate) {
                    if (waitForBoundaryDelimiter) {
                        if (rnIndex(binaryChunk) === false) {
                            iterate = false;
                        } else {
                            const index = binaryChunk.indexOf(boundaryDelimiter);
                            if (index == 0) {
                                binaryChunk = binaryChunk.slice(boundaryDelimiter__byteLength + rn.length);

                                waitForBoundaryDelimiter = false;
                                waitForContentDisposition = true;

                                reset();
                            } else {
                                throw 'Invalid request (2)';
                            }
                        }
                    }
                    // Content-Disposition: form-data;
                    else if (waitForContentDisposition) {
                        if (rnIndex(binaryChunk) === false) {
                            iterate = false;
                        } else {
                            // check 1
                            let index = binaryChunk.indexOf(_contentDisposition);
                            if (index != 0) {
                                throw 'Invalid request (3)';
                            }
                            binaryChunk = binaryChunk.slice(_contentDisposition.length);

                            //check 2
                            index = binaryChunk.indexOf(_name);
                            if (index != 0) {
                                throw 'Invalid request (4)';
                            }
                            binaryChunk = binaryChunk.slice(_name.length);

                            index = binaryChunk.indexOf(_fileName);
                            // Has file
                            if (index != -1) {
                                paramName = binaryChunk.slice(0, index);
                                binaryChunk = binaryChunk.slice(index + _fileName.length);

                                index = binaryChunk.indexOf(_quotesEnd);
                                if (index == -1) {
                                    throw 'Invalid request (5)';
                                }
                                fileName = binaryChunk.slice(0, index).toString();
                                fileExtension = path.extname(fileName);
                                binaryChunk = binaryChunk.slice(index + _quotesEnd.length);

                                waitForContentType = true;
                            }
                            // No file
                            else {
                                index = binaryChunk.indexOf(_quotesEnd);
                                if (index == -1) {
                                    throw 'Invalid request (6)';
                                }
                                paramName = binaryChunk.slice(0, index);
                                binaryChunk = binaryChunk.slice(index + _quotesEnd.length);

                                waitForEmptyLine = true;
                            }

                            waitForContentDisposition = false;
                        }
                    }
                    // Content-Type
                    else if (waitForContentType) {
                        const rn_i = rnIndex(binaryChunk);
                        if (rn_i === false) {
                            iterate = false;
                        } else {
                            let index = binaryChunk.indexOf(_contentType);
                            if (index != 0) {
                                throw 'Invalid request (7)';
                            }
                            binaryChunk = binaryChunk.slice(_contentType.length);

                            const nIndex = binaryChunk.indexOf(rn);
                            if (nIndex == -1) throw 'Invalid request (8)';

                            fileMimeType = binaryChunk.slice(0, nIndex).toString();

                            binaryChunk = binaryChunk.slice(nIndex + rn.length);

                            waitForContentType = false;
                            waitForEmptyLine = true;
                        }
                    }
                    // Empty line
                    else if (waitForEmptyLine) {
                        const rn_i = rnIndex(binaryChunk);

                        if (rn_i === false) {
                            iterate = false;
                        } else {
                            if (rn_i == 0) {
                                binaryChunk = binaryChunk.slice(rn.length);
                            } else {
                                throw "Invalid request (9)";
                            }

                            waitForEmptyLine = false;
                            waitForDataEnd = true;
                        }
                    }
                    // Data
                    else if (waitForDataEnd) {
                        let index = binaryChunk.indexOf(boundaryDelimiter);
                        let writeData;
                        let isCompletedChunk = false;
                        let isReqEnd = false;

                        if (index != -1 && binaryChunk.length >= boundaryDelimiterEnd__byteLength) {
                            isCompletedChunk = true;
                            writeData = binaryChunk.slice(0, index - rn.length);

                            let tmp_bytes = binaryChunk.slice(index + boundaryDelimiter__byteLength);
                            if (tmp_bytes.indexOf(_dashes) == 0) {
                                isReqEnd = true;
                                waitForDataEnd = false;
                                iterate = false;
                            } else {
                                waitForDataEnd = false;
                                waitForContentDisposition = true;
                            }
                        } else {
                            iterate = false;
                            writeData = binaryChunk.slice(0, binaryChunk.length - boundaryDelimiterEnd__byteLength);
                        }


                        if (!waitForDataEnd) {
                            binaryChunk = binaryChunk.slice(index + boundaryDelimiter__byteLength + rn.length);
                        } else {
                            binaryChunk = binaryChunk.slice(writeData.length);
                        }


                        // if is file
                        if (fileName) {
                            let isStart = false;
                            if (!fileDescriptor) {
                                tmpFilePath = os.tmpdir() + '/' + files_index + boundary.replace(/\W/g, '') + new Date().getTime() + fileExtension;
                                fileDescriptor = await fopen(tmpFilePath, 'w');
                                isStart = true;
                                files_index++;
                            }

                            fileSize += writeData.length;

                            await fwrite(fileDescriptor, writeData);

                            if (isCompletedChunk) {
                                await fclose(fileDescriptor);
                                if (!requestData.$_FILES[paramName]) requestData.$_FILES[paramName] = [];
                                requestData.$_FILES[paramName].push({
                                    mimeType: fileMimeType,
                                    fileName,
                                    fileSize,
                                    ext: fileExtension.toLowerCase(),
                                    tmpFilePath: tmpFilePath
                                });
                            }
                        } else {
                            paramValue += writeData;

                            if (isCompletedChunk) {
                                requestData.$_DATA[paramName] = paramValue.toString();
                            }
                        }

                        if (isCompletedChunk) {
                            reset();
                        }
                    } else {
                        iterate = false;
                    }
                }
            }

        } catch (e) {
            console.trace(e);
        }

        parseInProgress = false;

        return true;
    }
}

module.exports = MultipartFormDataParser;