// Buffer constants
const ampersand = Buffer.from("&");
const equal = Buffer.from("=");
const arrayType = Buffer.from('3%5B%5D');


function FormUrlencodedParser(requestData) {
    let chunks = [];

    // help vars
    let paramName = '';
    let paramNameParsed = false;
    let paramNameIsArray = false;

    this.addChunk = async (chunkOfBytes) => {
        chunks.push(chunkOfBytes);

        await this.parse();
    };

    let parseInProgress = false;
    let binaryChunk = new Buffer('');

    this.parse = async function () {
        if (parseInProgress) return false;
        parseInProgress = true;

        try {

            while (chunks.length) {
                binaryChunk = Buffer.concat([binaryChunk, chunks.shift()]);

                while (binaryChunk.length > 0) {
                    let index;
                    if (paramNameParsed == false) {
                        index = binaryChunk.indexOf(equal);
                        if (index == -1) {
                            paramName += binaryChunk();
                            binaryChunk = binaryChunk.slice(binaryChunk.length);
                        } else {
                            paramName += binaryChunk.slice(0, index);
                            binaryChunk = binaryChunk.slice(index + equal.length);
                            paramNameParsed = true;

                            if (paramName.indexOf(arrayType) == paramName.length - arrayType.length) {
                                paramName = paramName.slice(0, paramName.length - arrayType.length).toString();
                                paramNameIsArray = true;
                                if (requestData.$_DATA[paramName] == undefined) requestData.$_DATA[paramName] = [];
                                //console.log('requestData.$_DATA[paramName]', requestData.$_DATA[paramName]);
                                requestData.$_DATA[paramName].push('');
                            } else {
                                paramNameIsArray = false;
                                paramName = paramName.toString();
                                requestData.$_DATA[paramName] = '';
                            }
                        }
                    } else {
                        index = binaryChunk.indexOf(ampersand);

                        let writeData;

                        if (index != -1) {
                            writeData = binaryChunk.slice(0, index);
                            binaryChunk = binaryChunk.slice(index + ampersand.length);
                            paramNameParsed = false;
                        } else {
                            writeData = binaryChunk.slice(0);
                            binaryChunk = binaryChunk.slice(binaryChunk.length);
                        }

                        if (paramNameIsArray) {
                            requestData.$_DATA[paramName][requestData.$_DATA[paramName].length - 1] += writeData;
                            if (!paramNameParsed) requestData.$_DATA[paramName][requestData.$_DATA[paramName].length - 1] = requestData.$_DATA[paramName][requestData.$_DATA[paramName].length - 1].toString();
                        } else {
                            requestData.$_DATA[paramName] += writeData;
                            if (!paramNameParsed) requestData.$_DATA[paramName] = requestData.$_DATA[paramName].toString();
                        }

                        if (!paramNameParsed) paramName = '';
                    }
                }
            }

        } catch (e) {
            console.trace(e);
        }

        parseInProgress = false;

        return this;
    }
}

module.exports = FormUrlencodedParser;