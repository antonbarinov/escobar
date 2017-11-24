const fs = require('fs');
const path = require('path');
const util = require('util');
const readDir = util.promisify(fs.readDir);
const fStat = util.promisify(fs.stat);


async function _walk(currentDirPath, callback) {
    try {
        const files = await readDir(currentDirPath);

        for (let i = 0; i < files.length; i++) {
            const name = files[i];
            let filePath = path.join(currentDirPath, name);
            const stat = await fStat(filePath);

            if (stat.isFile()) {
                callback(filePath, stat);
            } else if (stat.isDirectory()) {
                await _walk(filePath, callback);
            }
        }
    } catch (e) {
        throw e;
    }

}

module.exports = {
    walk: async (currentDirPath, callback) => {
        await _walk(currentDirPath, callback);

        return true;
    },
    forEach: function (object, callback) {
        if (typeof callback !== 'function') return false;
        for (let key in object) {
            if (object.hasOwnProperty(key)) callback(key, object[key]);
        }
    }
}